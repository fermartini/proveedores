"""
services/pdf_service.py
------------------------
Orquestador principal del procesamiento de facturas (PDF e Imágenes).

PIPELINE COMPLETO:
  1. Renderizar la primera página del archivo como PIL Image (PyMuPDF para PDF, PIL directo para imagen).
  2. INTENTO 1 - QR (ZXing + OpenCV): rápido, local, sin costo.
  3. INTENTO 2 - LLM Multimodal (Gemini 1.5 Flash): se activa solo si el QR falla o trae datos incompletos.
  4. VALIDACIÓN: se requieren razon_social + numero_comprobante para marcar como "procesado".

Requiere GEMINI_API_KEY en el .env para activar el fallback de IA.
"""

import logging
import base64
import json
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from typing import List, Optional

from models.invoice import InvoiceResult
from services import qr_service, parser_service, llm_service
from services.parser_service import TipoFacturaInvalidaError

logger = logging.getLogger(__name__)

# Mapeo de códigos AFIP a letras de comprobante
TIPO_COMPROBANTE_MAP = {
    1: "A", 2: "A", 3: "A", 6: "B", 7: "B", 8: "B", 11: "C", 12: "C", 13: "C"
}


def _decode_qr_data(qr_url: str) -> dict:
    """Extrae y decodifica el JSON en base64 de la URL del QR AFIP/ARCA."""
    if not qr_url or not qr_url.lower().startswith("http"):
        return {}

    try:
        parsed = urlparse(qr_url)
        query_params = parse_qs(parsed.query)

        b64_data = None
        if "p" in query_params:
            b64_data = query_params["p"][0]
        elif "P" in query_params:
            b64_data = query_params["P"][0]
        elif parsed.path and "QR/" in parsed.path.upper():
            parts = parsed.path.upper().split("QR/")
            if len(parts) > 1 and parts[1]:
                b64_data = parts[1]
                if b64_data.startswith("P="):
                    b64_data = b64_data[2:]

        if b64_data:
            missing_padding = len(b64_data) % 4
            if missing_padding:
                b64_data += '=' * (4 - missing_padding)
            decoded = base64.b64decode(b64_data, altchars=b'-_').decode("utf-8", errors="ignore")
            return json.loads(decoded)

    except Exception as exc:
        logger.warning(f"[PDF Service] No se pudo decodificar el payload del QR: {exc}")

    return {}


def _qr_data_es_completo(qr_data: dict) -> bool:
    """
    Verifica si los datos del QR son suficientes para considerarlo completo.
    El QR de AFIP siempre trae: cuit, ptoVta, nroCmp, importe, codAut.
    Si faltan, es indicio de QR corrupto y conviene activar el LLM.
    """
    campos_obligatorios = ["cuit", "nroCmp", "importe"]
    return all(qr_data.get(campo) for campo in campos_obligatorios)


def process_pdf(filename: str, file_bytes: bytes) -> List[InvoiceResult]:
    """
    Procesa un archivo (PDF o Imagen) y extrae todas las facturas únicas encontradas.
    """
    logger.info(f"[PDF Service] Iniciando procesamiento: {filename}")
    
    is_image = filename.lower().endswith((".jpg", ".jpeg", ".png"))
    results: List[InvoiceResult] = []
    
    # Ducto de deduplicación interna: solo saltear si es idéntica a la ANTERIOR (consecutivos)
    last_qr = None
    last_key = None

    if is_image:
        # Caso Imagen: Una sola página
        img = qr_service.render_first_page(file_bytes, is_pdf=False)
        res = _process_single_page(filename, img, None)
        if res:
            results.append(res)
    else:
        # Caso PDF: Múltiples páginas
        images = list(qr_service.render_pdf_pages(file_bytes))
        texts = list(parser_service.extract_pages_text(file_bytes))
        
        num_pages = max(len(images), len(texts))
        
        for i in range(num_pages):
            page_img = images[i] if i < len(images) else None
            page_text = texts[i] if i < len(texts) else None
            
            res = _process_single_page(filename, page_img, page_text)
            
            if res and res.status != "error":
                is_duplicate = False
                
                current_qr = res.qr_link if (res.qr_link and res.qr_link.lower().startswith("http")) else None
                current_key = (str(res.cuit), res.numero) if (res.cuit and res.numero) else None

                # Comparar solo con el anterior (Deduplicación de hojas consecutivas)
                if current_qr and current_qr == last_qr:
                    is_duplicate = True
                elif current_key and current_key == last_key:
                    is_duplicate = True
                
                # Actualizar punteros para la siguiente vuelta
                last_qr = current_qr
                last_key = current_key

                if is_duplicate:
                    logger.info(f"[PDF Service] Página {i+1} es igual a la anterior en {filename}, ignorando.")
                    continue
            
            if res:
                results.append(res)


    return results


def _process_single_page(filename: str, page_image, page_text: Optional[str]) -> Optional[InvoiceResult]:
    """
    Nucleo de procesamiento para una sola página (Imagen + Texto opcional).
    Devuelve un InvoiceResult.
    """
    parsed_fields = {}
    qr_url = None
    status = "procesado"
    error_detail = None
    used_llm = False

    # 1. Parsear texto si existe
    if page_text:
        try:
            parsed_fields = parser_service.parse_text(page_text)
        except Exception as exc:
            logger.error(f"[PDF Service] Error parseando texto de página: {exc}")

    # 2. Extraer QR
    qr_data = {}
    try:
        if page_image:
            qr_result = qr_service.extraer_qr_robusto(page_image)
            if qr_result and qr_result.lower().startswith("http"):
                qr_url = qr_service.fix_arca_domain(qr_result)
                qr_data = _decode_qr_data(qr_url)
            else:
                qr_url = qr_result or qr_service.QR_NO_TIENE
    except Exception as exc:
        logger.error(f"[PDF Service] Error al extraer QR: {exc}")
        qr_url = qr_service.QR_NO_SE_PUEDE_LEER

    # 3. Fallback LLM (Gemini) si el QR falla o es incompleto
    qr_suficiente = bool(qr_data) and _qr_data_es_completo(qr_data)
    if not qr_suficiente and page_image:
        logger.info("[PDF Service] QR insuficiente → activando fallback Gemini...")
        llm_raw = llm_service.extraer_datos_con_llm(page_image)
        if llm_raw:
            llm_fields = llm_service.normalizar_datos_llm(llm_raw)
            used_llm = True
            for key, value in llm_fields.items():
                if key == "qr_url_from_llm":
                    if not (qr_url and qr_url.lower().startswith("http")):
                        qr_url = qr_service.fix_arca_domain(value)
                elif key not in parsed_fields or parsed_fields.get(key) is None:
                    parsed_fields[key] = value

    # 4. Fusionar datos de QR sobre texto/IA
    if qr_data:
        qr_fecha = qr_data.get("fecha")
        if qr_fecha:
            try:
                parsed_fields["fecha"] = datetime.strptime(qr_fecha, "%Y-%m-%d").strftime("%d/%m/%Y")
            except: parsed_fields["fecha"] = qr_fecha
        
        tipo_cmp = qr_data.get("tipoCmp")
        if tipo_cmp in TIPO_COMPROBANTE_MAP:
            parsed_fields["tipo_factura"] = TIPO_COMPROBANTE_MAP[tipo_cmp]
        
        if qr_data.get("cuit"): parsed_fields["cuit"] = str(qr_data.get("cuit"))
        if qr_data.get("ptoVta"): parsed_fields["punto_venta"] = int(qr_data.get("ptoVta"))
        if qr_data.get("nroCmp"): parsed_fields["numero"] = int(qr_data.get("nroCmp"))
        if qr_data.get("importe"): parsed_fields["total"] = float(qr_data.get("importe"))
        if qr_data.get("codAut"): parsed_fields["cae"] = str(qr_data.get("codAut"))

    # 5. Validación mínima
    razon_social = parsed_fields.get("razon_social")
    numero = parsed_fields.get("numero")
    datos_minimos_ok = bool(razon_social and str(razon_social).strip()) and (numero is not None)

    if not datos_minimos_ok:
        if qr_url and qr_url.lower().startswith("http"):
            status = "procesado" # Si tiene QR pero no pudo leer texto/IA, se marca como procesado igual (el confirm fallará luego si faltan datos)
        else:
            status = "sin_qr" if not used_llm else "error"
            if status == "error":
                error_detail = "No se pudieron extraer datos mínimos (Razón Social/Número)."

    # 6. Reglas de cálculo
    tipo_final = parsed_fields.get("tipo_factura")
    total = parsed_fields.get("total")
    neto = parsed_fields.get("importe_neto")
    iva = parsed_fields.get("iva")
    otros_tributos = None

    if tipo_final == "C" and total is not None:
        parsed_fields["importe_neto"] = total
        parsed_fields["iva"] = 0.0
    elif tipo_final == "A" and total is not None:
        if neto is not None and iva is not None:
            diff = round(total - (neto + iva), 2)
            if diff > 0.01: otros_tributos = diff

    if used_llm and not error_detail and status == "procesado":
        error_detail = "⚡ Datos extraídos mediante IA (Gemini 1.5 Flash)."

    return InvoiceResult(
        filename=filename,
        cuit=parsed_fields.get("cuit"),
        razon_social=parsed_fields.get("razon_social"),
        tipo_factura=parsed_fields.get("tipo_factura", "B"),
        punto_venta=parsed_fields.get("punto_venta"),
        numero=parsed_fields.get("numero"),
        fecha=parsed_fields.get("fecha"),
        importe_neto=parsed_fields.get("importe_neto"),
        iva=parsed_fields.get("iva"),
        otros_tributos=otros_tributos,
        total=parsed_fields.get("total"),
        cae=parsed_fields.get("cae"),
        qr_link=qr_url,
        status=status,
        error_detail=error_detail,
        created_at=datetime.utcnow().isoformat(),
    )


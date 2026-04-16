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
import time
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from typing import List, Optional, Set

from models.invoice import InvoiceResult
from services import qr_service, parser_service, llm_service
from services.parser_service import TipoFacturaInvalidaError

logger = logging.getLogger(__name__)

# Mapeo de códigos AFIP a etiquetas descriptivas
TIPO_COMPROBANTE_MAP = {
    1: "A", 2: "ND A", 3: "NC A", 
    6: "B", 7: "ND B", 8: "NC B", 
    11: "C", 12: "ND C", 13: "NC C"
}
 
CUIT_JC = "30527990773"
 






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
    
    # Ducto de deduplicación interna por archivo: evita Original/Duplicado/Triplicado
    seen_qrs = set()
    seen_invoices = set()

    if is_image:
        # Caso Imagen: Una sola página
        img = qr_service.render_first_page(file_bytes, is_pdf=False)
        res = _process_single_page(filename, img, None, seen_qrs, seen_invoices)
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
            
            res = _process_single_page(filename, page_img, page_text, seen_qrs, seen_invoices)
            
            if res:
                # Asignar ID único basado en archivo y página
                res.id = f"{filename}-{i}"

                if res.status != "error":
                    is_duplicate = False
                    
                    qr_link = res.qr_link if (res.qr_link and res.qr_link.lower().startswith("http")) else None
                    inv_key = (str(res.cuit), res.numero) if (res.cuit and res.numero) else None

                    # 1. Chequeo por QR
                    if qr_link:
                        if qr_link in seen_qrs:
                            is_duplicate = True
                        else:
                            seen_qrs.add(qr_link)
                    
                    # 2. Chequeo por CUIT + Número (si no se duplicó por QR)
                    if not is_duplicate and inv_key:
                        if inv_key in seen_invoices:
                            is_duplicate = True
                        else:
                            seen_invoices.add(inv_key)

                    if is_duplicate:
                        logger.info(f"[PDF Service] Página {i+1} duplicada en {filename}, ignorando.")
                        continue
                
                results.append(res)




    return results


def _process_single_page(
    filename: str, 
    page_image, 
    page_text: Optional[str],
    seen_qrs: Set[str],
    seen_invoices: Set[tuple]
) -> Optional[InvoiceResult]:
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

    # 3. Fallback LLM (Gemini) si el QR falla o es insuficiente
    qr_suficiente = bool(qr_data) and _qr_data_es_completo(qr_data)
    
    # OPTIMIZACIÓN: Si ya tenemos datos suficientes por OCR (pdfplumber), evitamos llamar a Gemini
    # para no agotar la cuota de la API (15 RPM en free tier).
    ocr_razon_social = parsed_fields.get("razon_social")
    ocr_numero = parsed_fields.get("numero")
    ocr_cuit = parsed_fields.get("cuit")
    ocr_suficiente = bool(ocr_razon_social and str(ocr_razon_social).strip()) and (ocr_numero is not None)
    
    # Chequeo de duplicado preventivo antes de Gemini
    is_already_seen = False
    if qr_url and qr_url.lower().startswith("http") and qr_url in seen_qrs:
        is_already_seen = True
    elif ocr_cuit and ocr_numero and (str(ocr_cuit), ocr_numero) in seen_invoices:
        is_already_seen = True

    if not qr_suficiente and not ocr_suficiente and not is_already_seen and page_image:
        # Solo llamar a Gemini si el texto es muy corto o falta info clave Y no se vio antes
        longitud_texto = len(page_text) if page_text else 0
        if longitud_texto < 100 or not ocr_suficiente:
            logger.info(f"[PDF Service] QR/OCR insuficiente ({longitud_texto} chars) → activando fallback Gemini...")
            
            # Throttling preventivo: esperar un poco si estamos en un PDF multi-página para no saturar
            time.sleep(1.5)
            
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
        else:
            logger.info(f"[PDF Service] OCR suficiente ({longitud_texto} chars), omitiendo Gemini para ahorrar cuota.")

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
        
        # Extraer receptor del QR
        if qr_data.get("nroDocRec"):
            parsed_fields["cuit_receptor"] = str(qr_data.get("nroDocRec"))

    # 5. Validación mínima y Receptor
    razon_social = parsed_fields.get("razon_social")
    numero = parsed_fields.get("numero")
    cuit_receptor = parsed_fields.get("cuit_receptor")
    tipo_final = parsed_fields.get("tipo_factura", "B")
    
    # Validar receptor (Jockey Club) — SOLO si los datos vienen del QR para evitar falsos positivos
    receptor_ok = True
    if qr_data and qr_data.get("nroDocRec"):
        clean_receptor = str(qr_data.get("nroDocRec")).strip()
        if clean_receptor and clean_receptor != CUIT_JC:
            receptor_ok = False
    
    datos_minimos_ok = bool(razon_social and str(razon_social).strip()) and (numero is not None)

    if not receptor_ok:
        status = "receptor_invalido"
        error_detail = f"⚠️ NO ESTÁ A NOMBRE DEL JC - {filename}"
    elif "B" in str(tipo_final).upper():
        status = "tipo_invalido"
        error_detail = "Las facturas tipo B no están permitidas."
    elif not datos_minimos_ok:
        if qr_url and qr_url.lower().startswith("http"):
            status = "procesado" # Si tiene QR pero no pudo leer texto/IA, se marca como procesado igual (el confirm fallará luego si faltan datos)
        else:
            status = "sin_qr" if not used_llm else "error"
            if status == "error":
                error_detail = "No se pudieron extraer datos mínimos (Razón Social/Número)."


    # 6. Reglas de cálculo y Conversión USD
    es_credito = "NC" in str(tipo_final).upper()

    moneda = parsed_fields.get("moneda", "ARS")
    cotizacion = parsed_fields.get("cotizacion", 1.0)
    
    total = parsed_fields.get("total")
    neto = parsed_fields.get("importe_neto")
    iva = parsed_fields.get("iva")
    otros_tributos = parsed_fields.get("otros_tributos")

    # Conversión automática si es USD
    if moneda == "USD" and cotizacion > 1:
        logger.info(f"[PDF Service] Convirtiendo valores de USD a ARS (Cotización: {cotizacion})")
        if total: total = round(total * cotizacion, 2)
        if neto: neto = round(neto * cotizacion, 2)
        if iva: iva = round(iva * cotizacion, 2)
        if otros_tributos: otros_tributos = round(otros_tributos * cotizacion, 2)

    # Lógica de importes por tipo
    if tipo_final == "C" and total is not None:
        if neto is None: neto = total
        if iva is None: iva = 0.0
    elif "A" in str(tipo_final) and total is not None:
        if neto is not None and iva is not None:
            diff = round(total - (neto + iva), 2)
            if diff > 0.01: otros_tributos = diff

    # IMPORTANTE: Si es Nota de Crédito, el total debe ser negativo para que los balances den bien
    if es_credito and total is not None and total > 0:
        total = -total
        # También el IVA y Neto si los queremos negativos en la BD
        if neto: neto = -abs(neto)
        if iva: iva = -abs(iva)
        if otros_tributos: otros_tributos = -abs(otros_tributos)

    if used_llm and not error_detail and status == "procesado":
        error_detail = "⚡ Datos extraídos mediante IA (Gemini 1.5 Flash)."

    return InvoiceResult(
        id=f"{filename}-{datetime.utcnow().timestamp()}", # ID más robusto
        filename=filename,
        cuit=parsed_fields.get("cuit"),
        razon_social=parsed_fields.get("razon_social"),
        tipo_factura=tipo_final,
        punto_venta=parsed_fields.get("punto_venta"),
        numero=parsed_fields.get("numero"),
        fecha=parsed_fields.get("fecha"),
        importe_neto=neto,
        iva=iva,
        otros_tributos=otros_tributos,
        total=total,
        moneda=moneda,
        cotizacion=cotizacion,
        es_credito=es_credito,
        cae=parsed_fields.get("cae"),
        qr_link=qr_url,
        descripcion=parsed_fields.get("descripcion"),
        status=status,
        error_detail=error_detail,
        created_at=datetime.utcnow().isoformat(),
    )



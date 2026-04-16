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


def process_pdf(filename: str, file_bytes: bytes) -> InvoiceResult:
    """
    Procesa una factura electrónica (PDF o Imagen JPG/PNG).

    Pipeline:
        1. Parsea texto (solo PDFs).
        2. Lee QR → decodifica payload.
        3. Si QR falla → Gemini 1.5 Flash (PLAN B).
        4. Valida campos mínimos obligatorios.
        5. Retorna InvoiceResult.
    """
    logger.info(f"[PDF Service] Iniciando procesamiento: {filename}")

    parsed_fields = {}
    qr_url = None
    status = "procesado"
    error_detail = None
    used_llm = False

    is_image = filename.lower().endswith((".jpg", ".jpeg", ".png"))

    # -----------------------------------------------------------------------
    # Paso 0: Renderizar imagen de la primera página (para QR y para LLM)
    # -----------------------------------------------------------------------
    page_image = qr_service.render_first_page(file_bytes, is_pdf=not is_image)

    # -----------------------------------------------------------------------
    # Paso 1: Extracción de texto del PDF (solo aplica a PDFs)
    # -----------------------------------------------------------------------
    if not is_image:
        try:
            parsed_fields = parser_service.parse_invoice(file_bytes)
        except TipoFacturaInvalidaError as tipo_err:
            logger.warning(f"[PDF Service] Rechazada: {tipo_err}")
            return InvoiceResult(
                filename=filename,
                tipo_factura=tipo_err.tipo_detectado,
                status="tipo_invalido",
                error_detail=str(tipo_err),
                created_at=datetime.utcnow().isoformat(),
            )
        except Exception as exc:
            logger.error(f"[PDF Service] Error inesperado en parseo de texto: {exc}")
            status = "error"
            error_detail = f"Error al parsear el PDF: {str(exc)}"

    # -----------------------------------------------------------------------
    # Paso 2: INTENTO 1 — Extracción del QR (ZXing + OpenCV)
    # -----------------------------------------------------------------------
    qr_data = {}
    try:
        if page_image is not None:
            # Usar la imagen ya renderizada para pasar al pipeline de ZXing
            qr_result = qr_service.extraer_qr_robusto(page_image)
            if qr_result is None:
                qr_result = qr_service.QR_NO_TIENE
        elif is_image:
            qr_result = qr_service.extract_qr_from_image(file_bytes)
        else:
            qr_result = qr_service.extract_qr_url(file_bytes)

        if qr_result and qr_result.lower().startswith("http"):
            qr_url = qr_service.fix_arca_domain(qr_result)
            logger.info(f"[PDF Service] QR válido: {qr_url[:60]}...")
            qr_data = _decode_qr_data(qr_url)
            if qr_data:
                logger.info(f"[PDF Service] Datos obtenidos del QR: {qr_data}")
        else:
            qr_url = qr_result
            logger.warning(f"[PDF Service] QR: {qr_result}")

    except Exception as exc:
        logger.error(f"[PDF Service] Error al extraer QR: {exc}")
        qr_url = qr_service.QR_NO_SE_PUEDE_LEER

    # -----------------------------------------------------------------------
    # Paso 3: INTENTO 2 — Fallback LLM (Gemini 1.5 Flash)
    # Se activa si el QR no trajo datos o los datos son incompletos
    # -----------------------------------------------------------------------
    qr_suficiente = bool(qr_data) and _qr_data_es_completo(qr_data)

    if not qr_suficiente and page_image is not None:
        logger.info("[PDF Service] QR insuficiente → activando fallback Gemini...")
        llm_raw = llm_service.extraer_datos_con_llm(page_image)

        if llm_raw:
            llm_fields = llm_service.normalizar_datos_llm(llm_raw)
            used_llm = True

            # Fusionar: solo completar campos que el QR no pudo dar
            # El QR tiene prioridad sobre el LLM en campos que ambos tienen
            for key, value in llm_fields.items():
                if key == "qr_url_from_llm":
                    # Si el LLM detectó una URL del QR que ZXing no pudo, usarla
                    if not (qr_url and qr_url.lower().startswith("http")):
                        qr_url = qr_service.fix_arca_domain(value)
                        logger.info(f"[PDF Service] LLM reconstruyó URL QR: {qr_url[:60]}...")
                elif key not in parsed_fields or parsed_fields.get(key) is None:
                    parsed_fields[key] = value

            logger.info(f"[PDF Service] Campos completados por LLM: {list(llm_fields.keys())}")
        else:
            logger.warning("[PDF Service] Fallback LLM no devolvió datos útiles.")

    # -----------------------------------------------------------------------
    # Paso 4: Combinar datos confiables del QR sobre los campos extraídos
    # -----------------------------------------------------------------------
    if qr_data:
        qr_fecha = qr_data.get("fecha")
        if qr_fecha:
            try:
                date_obj = datetime.strptime(qr_fecha, "%Y-%m-%d")
                parsed_fields["fecha"] = date_obj.strftime("%d/%m/%Y")
            except Exception:
                parsed_fields["fecha"] = qr_fecha

        tipo_cmp = qr_data.get("tipoCmp")
        if tipo_cmp and tipo_cmp in TIPO_COMPROBANTE_MAP:
            parsed_fields["tipo_factura"] = TIPO_COMPROBANTE_MAP[tipo_cmp]

        if qr_data.get("cuit"):
            parsed_fields["cuit"] = str(qr_data.get("cuit"))
        if qr_data.get("ptoVta"):
            parsed_fields["punto_venta"] = int(qr_data.get("ptoVta"))
        if qr_data.get("nroCmp"):
            parsed_fields["numero"] = int(qr_data.get("nroCmp"))
        if qr_data.get("importe"):
            parsed_fields["total"] = float(qr_data.get("importe"))
        if qr_data.get("codAut"):
            parsed_fields["cae"] = str(qr_data.get("codAut"))

    # -----------------------------------------------------------------------
    # Paso 5: VALIDACIÓN ESTRICTA (La Regla de Oro)
    # Datos mínimos obligatorios: razon_social + numero
    # -----------------------------------------------------------------------
    razon_social = parsed_fields.get("razon_social")
    numero = parsed_fields.get("numero")

    datos_minimos_ok = bool(razon_social and str(razon_social).strip()) and \
                       bool(numero is not None)

    if not datos_minimos_ok and status == "procesado":
        # Sin datos mínimos → no procesar como válida
        if used_llm:
            status = "error"
            error_detail = (
                "No se pudieron extraer los datos mínimos obligatorios "
                "(Razón Social y Número de Factura) ni con QR ni con IA."
            )
        else:
            # Sin LLM disponible, puede ser que falte la API key
            status = "sin_qr"

    # Si es imagen y no hay datos en absoluto de ninguna fuente
    if is_image and not qr_data and not used_llm:
        status = "error"
        error_detail = (
            "No se pudo detectar el código QR en la imagen y el fallback de IA "
            "no está configurado (falta GEMINI_API_KEY en .env)."
        )

    # -----------------------------------------------------------------------
    # Paso 5.5: Recuperación de estado 'procesado' gracias a la IA
    # -----------------------------------------------------------------------
    # Si ZXing falló (poniendo "sin_qr") pero la IA logró leer la URL escrita del QR
    if status == "sin_qr" and qr_url and qr_url.lower().startswith("http"):
        status = "procesado"

    # -----------------------------------------------------------------------
    # Paso 6: Reglas de Cálculo por Tipo de Factura
    # -----------------------------------------------------------------------
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
            if diff > 0.01:
                otros_tributos = diff
        elif neto is not None and iva is None:
            diff = round(total - neto, 2)
            if diff > 0:
                if abs(diff - round(neto * 0.21, 2)) < 0.1 or abs(diff - round(neto * 0.105, 2)) < 0.1:
                    parsed_fields["iva"] = diff
        elif iva is not None and neto is None:
            parsed_fields["importe_neto"] = round(total - iva, 2)

    # -----------------------------------------------------------------------
    # Paso 7: Construir y retornar el modelo InvoiceResult
    # -----------------------------------------------------------------------
    # Preparar nota en error_detail si se usó LLM
    if used_llm and not error_detail and status == "procesado":
        error_detail = "⚡ Datos extraídos mediante IA (Gemini 1.5 Flash) como respaldo al QR."

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
        cuenta_contable="Muebles y Útiles",
        autorizada=False,
        pagada=False,
        status=status,
        error_detail=error_detail,
        created_at=datetime.utcnow().isoformat(),
    )

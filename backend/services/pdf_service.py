"""
services/pdf_service.py
------------------------
Orquestador principal del procesamiento de facturas PDF.

Combina los resultados de:
  - qr_service: extrae la URL del QR de AFIP/ARCA (con PyMuPDF, sin poppler).
  - parser_service: extrae los campos de texto del PDF.

Solo procesa facturas tipo B. Las de tipo A, C u otro tipo se rechazan
con status "tipo_invalido" y un mensaje descriptivo para la UI.

Valores especiales de qr_link:
  - "NO TIENE"          → el PDF no tiene ningún QR (status: sin_qr)
  - "NO SE PUEDE LEER"  → el QR está cortado o dañado (status: sin_qr)
  - URL válida          → QR leído y dominio corregido (status: procesado)
"""

import logging
import base64
import json
from datetime import datetime
from urllib.parse import urlparse, parse_qs

from models.invoice import InvoiceResult
from services import qr_service, parser_service
from services.parser_service import TipoFacturaInvalidaError

logger = logging.getLogger(__name__)

# Mapeo de códigos AFIP a letras de comprobante
TIPO_COMPROBANTE_MAP = {
    1: "A", 2: "A", 3: "A", 6: "B", 7: "B", 8: "B", 11: "C", 12: "C", 13: "C"
}

def _decode_qr_data(qr_url: str) -> dict:
    """Extrae y decodifica el JSON en base64 de la URL del QR AFIP/ARCA."""
    if not qr_url or not qr_url.startswith("http"):
        return {}
    
    try:
        parsed = urlparse(qr_url)
        query_params = parse_qs(parsed.query)
        if "p" in query_params:
            b64_data = query_params["p"][0]
            # Agregar padding si falta
            missing_padding = len(b64_data) % 4
            if missing_padding:
                b64_data += '=' * (4 - missing_padding)
            
            # Decodificar soportando el estándar clásico (+ y /) y el modo urlsafe (- y _)
            decoded = base64.b64decode(b64_data, altchars=b'-_').decode("utf-8")
            return json.loads(decoded)
    except Exception as exc:
        logger.warning(f"[PDF Service] No se pudo decodificar el payload del QR: {exc}")
    
    return {}


def process_pdf(filename: str, pdf_bytes: bytes) -> InvoiceResult:
    """
    Procesa un PDF de factura AFIP tipo B y retorna un InvoiceResult completo.

    Args:
        filename: Nombre original del archivo (para identificación en UI).
        pdf_bytes: Contenido binario del PDF.

    Returns:
        InvoiceResult con todos los campos disponibles y estado de procesamiento.
        Posibles valores de 'status':
          - "procesado"     → todo OK, factura tipo B con datos extraídos.
          - "sin_qr"        → factura B OK pero QR ausente o ilegible.
          - "tipo_invalido" → la factura no es tipo B (rechazada).
          - "error"         → fallo inesperado durante el procesamiento.
    """
    logger.info(f"[PDF Service] Iniciando procesamiento: {filename}")

    parsed_fields = {}
    qr_url = None
    status = "procesado"
    error_detail = None

    # -----------------------------------------------------------------------
    # Paso 1: Extracción de texto y validación de tipo (solo tipo B)
    # -----------------------------------------------------------------------
    try:
        parsed_fields = parser_service.parse_invoice(pdf_bytes)

    except TipoFacturaInvalidaError as tipo_err:
        # Factura tipo A, C u otro — rechazada intencionalmente
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
    # Paso 2: Extracción del QR con PyMuPDF (sin poppler)
    # -----------------------------------------------------------------------
    qr_data = {}
    try:
        qr_result = qr_service.extract_qr_url(pdf_bytes)

        # qr_result puede ser: URL, "NO TIENE" o "NO SE PUEDE LEER"
        if qr_result and qr_result.startswith("http"):
            # QR leído correctamente — la corrección de dominio ya fue aplicada
            qr_url = qr_result
            logger.info(f"[PDF Service] QR válido: {qr_url[:60]}...")
            
            # ¡Nuevo! Decodificar el JSON base64 interno del QR
            qr_data = _decode_qr_data(qr_url)
            if qr_data:
                logger.info(f"[PDF Service] Datos obtenidos del QR: {qr_data}")
        else:
            # QR ausente o ilegible → guardar el valor sentinel para la UI
            qr_url = qr_result  # "NO TIENE" o "NO SE PUEDE LEER"
            logger.warning(f"[PDF Service] QR: {qr_result}")
            if status == "procesado":
                status = "sin_qr"

    except Exception as exc:
        logger.error(f"[PDF Service] Error al extraer QR: {exc}")
        qr_url = qr_service.QR_NO_SE_PUEDE_LEER
        if status == "procesado":
            status = "sin_qr"
            error_detail = f"Error al procesar QR: {str(exc)}"

    # -----------------------------------------------------------------------
    # Paso 3: Combinar los datos del Texto con los datos ultra confiables del QR
    # -----------------------------------------------------------------------
    if qr_data:
        # Extraemos fecha (del QR viene como "YYYY-MM-DD")
        qr_fecha = qr_data.get("fecha")
        if qr_fecha:
            # Transformar a DD/MM/AAAA para consistencia
            try:
                date_obj = datetime.strptime(qr_fecha, "%Y-%m-%d")
                parsed_fields["fecha"] = date_obj.strftime("%d/%m/%Y")
            except Exception:
                parsed_fields["fecha"] = qr_fecha

        # Tipo de factura (1=A, 6=B, 11=C, etc)
        tipo_cmp = qr_data.get("tipoCmp")
        if tipo_cmp and tipo_cmp in TIPO_COMPROBANTE_MAP:
            parsed_fields["tipo_factura"] = TIPO_COMPROBANTE_MAP[tipo_cmp]

        # Sobrescribir siempre con la data del QR porque es 100% exacta
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
    # Paso 3.5: Reglas de validación y cálculos automáticos por Tipo (A, B, C)
    # -----------------------------------------------------------------------
    tipo_final = parsed_fields.get("tipo_factura")
    total = parsed_fields.get("total")
    neto = parsed_fields.get("importe_neto")
    iva = parsed_fields.get("iva")
    otros_tributos = None

    if tipo_final == "C" and total is not None:
        # Las facturas C no tienen IVA desglosado, el Neto es el Total
        parsed_fields["importe_neto"] = total
        parsed_fields["iva"] = 0.0

    elif tipo_final == "A" and total is not None:
        if neto is not None and iva is not None:
            # Calcular si existen percepciones o retenciones (Otros Tributos)
            diff = round(total - (neto + iva), 2)
            if diff > 0.01:
                otros_tributos = diff
        elif neto is not None and iva is None:
            # Falta leer el IVA, pero si la diferencia es el 21% clavado o 10.5%, es IVA puro
            diff = round(total - neto, 2)
            if diff > 0:
                # Comprobación de sanity para 21% o 10.5% (podría haber percepciones ocultas)
                if abs(diff - round(neto * 0.21, 2)) < 0.1 or abs(diff - round(neto * 0.105, 2)) < 0.1:
                    parsed_fields["iva"] = diff
                else:
                    # Asumimos que la diferencia es retenciones + iva mezclado
                    pass
        elif iva is not None and neto is None:
            # Falta leer el neto, intentamos deducirlo (Asumiendo que no hay grandes retenciones)
            parsed_fields["importe_neto"] = round(total - iva, 2)

    # -----------------------------------------------------------------------
    # Paso 4: Construir y retornar el modelo InvoiceResult
    # -----------------------------------------------------------------------
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

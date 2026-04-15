"""
services/parser_service.py
--------------------------
Servicio de extracción de datos de facturas AFIP/ARCA mediante pdfplumber.

Procesa facturas electrónicas de cualquier tipo (A, B, C).
Si el tipo no se puede determinar, igual se intenta procesar con los campos
disponibles y se retorna tipo_factura=None.

Estrategia de parseo:
  - Se extrae el texto completo del PDF con pdfplumber.
  - Se aplican expresiones regulares priorizando los nombres de campos
    que AFIP estandarizó para facturas electrónicas.
  - Los campos se limpian y normalizan antes de retornarlos.
  - Si un campo no se puede extraer, retorna None (no lanza excepción)
    para permitir procesamiento parcial.

Notas:
  - Los layouts varían según el software de facturación del emisor
    (e.g., Gestión Plus, Bejerman, Tango, etc.), por lo que se usan
    múltiples patrones alternativos para cada campo.
  - El parseo de importes convierte "." → "" y "," → "." para manejar
    el formato numérico argentino (e.g., "1.234,56" → 1234.56).
"""

import re
import logging
from typing import Optional, Dict, Any

import pdfplumber

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Excepción personalizada para tipo de factura no admitido
# ---------------------------------------------------------------------------

class TipoFacturaInvalidaError(ValueError):
    """
    Se lanza cuando no se puede determinar el tipo de factura
    y el PDF no parece ser una factura AFIP válida.
    """
    def __init__(self, tipo_detectado: Optional[str] = None):
        msg = (
            "No se pudo determinar el tipo de factura. "
            "Verificá que el PDF sea una factura AFIP/ARCA válida."
        )
        self.tipo_detectado = tipo_detectado
        super().__init__(msg)


# ---------------------------------------------------------------------------
# Función principal
# ---------------------------------------------------------------------------

def parse_invoice(pdf_bytes: bytes) -> Dict[str, Any]:
    """
    Extrae todos los campos relevantes de una factura AFIP (tipo A, B o C) del PDF.

    Args:
        pdf_bytes: Contenido binario del PDF.

    Returns:
        Diccionario con los campos extraídos. Los campos no encontrados son None.

    Raises:
        TipoFacturaInvalidaError: Si el PDF no parece ser una factura AFIP válida
                                  (no se puede extraer texto ni detectar ningún campo).
    """
    text = _extract_text(pdf_bytes)

    if not text:
        logger.warning("[Parser] No se pudo extraer texto del PDF (posiblemente escaneado).")
        return _empty_result()

    logger.debug(f"[Parser] Texto extraído ({len(text)} chars): {text[:300]}...")

    # Detectar tipo de factura (A, B o C) — ya no es restrictivo, solo informativo
    tipo = _parse_tipo_factura(text)

    if tipo:
        logger.info(f"[Parser] ✅ Factura tipo {tipo} detectada — procesando.")
    else:
        logger.warning("[Parser] Tipo de factura no detectado — se intenta parsear igual.")

    result = {
        "tipo_factura":  tipo,
        "punto_venta":   _parse_punto_venta(text),
        "numero":        _parse_numero(text),
        "fecha":         _parse_fecha(text),
        "cuit":          _parse_cuit(text),
        "razon_social":  _parse_razon_social(text),
        "importe_neto":  _parse_importe_neto(text),
        "iva":           _parse_iva(text),
        "total":         _parse_total(text),
        "cae":           _parse_cae(text),
    }

    return result


# ---------------------------------------------------------------------------
# Extracción de texto con pdfplumber
# ---------------------------------------------------------------------------

def _extract_text(pdf_bytes: bytes) -> Optional[str]:
    """Extrae y concatena el texto de todas las páginas del PDF."""
    import io
    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages_text = []
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages_text.append(t)
            return "\n".join(pages_text)
    except Exception as exc:
        logger.error(f"[Parser] Error al abrir PDF con pdfplumber: {exc}")
        return None


# ---------------------------------------------------------------------------
# Parsers individuales por campo
# ---------------------------------------------------------------------------

def _parse_tipo_factura(text: str) -> Optional[str]:
    """
    Detecta el tipo de comprobante: A, B o C.
    Busca el encabezado estándar de AFIP: "FACTURA A", "Factura B", etc.
    """
    patterns = [
        r"FACTURA\s+([ABC])\b",
        r"Comprobante\s+tipo\s*:\s*([ABC])\b",
        r"\bFACTURA\s*\n\s*([ABC])\b",
        r"Tipo\s*:\s*([ABC])\b",
        # Casos genéricos de ARCA si cambian el membrete
        r"Letra\s*[:\-]?\s*([ABC])\b",
        r"[Cc]omprobante\s+([ABC])\b"
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).upper()
    return None


def _parse_punto_venta(text: str) -> Optional[int]:
    """
    Extrae el punto de venta (4 dígitos del número de factura).
    En facturas AFIP el número tiene formato: XXXX-XXXXXXXX (PV-Nro).
    """
    patterns = [
        r"Punto\s+de\s+Venta\s*[:\-]?\s*(\d{1,5})",
        r"Pto\.?\s*Vta\.?\s*[:\-]?\s*(\d{1,5})",
        # Formato clásico: 0001-00001234
        r"\b(\d{4,5})-\d{8}\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))
    return None


def _parse_numero(text: str) -> Optional[int]:
    """
    Extrae el número de factura (8 dígitos).
    """
    patterns = [
        r"N[úu]mero\s*[:\-]?\s*(\d{1,8})",
        r"Comp\.?\s*N[°º]?\s*[:\-]?\s*\d{4,5}-(\d{1,8})",
        # Formato clásico: 0001-00001234 → captura la parte derecha
        r"\b\d{4,5}-(\d{8})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))
    return None


def _parse_fecha(text: str) -> Optional[str]:
    """
    Extrae la fecha de emisión. Busca el formato DD/MM/AAAA.
    Prioriza la frase "Fecha de Emisión" o "Fecha".
    Soporta fechas con meses o días de un dígito (ej. 9/3/2026).
    """
    patterns = [
        r"Fecha\s+de\s+Emisi[oó]n\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{4})",
        r"Fecha\s*[:\-]?\s*(\d{1,2}/\d{1,2}/\d{4})",
        # Formato alternativo: AAAA-MM-DD
        r"(\d{1,2}/\d{1,2}/\d{4})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _parse_cuit(text: str) -> Optional[str]:
    """
    Extrae el CUIT del emisor. El CUIT tiene formato: XX-XXXXXXXX-X.
    Se normaliza eliminando guiones para retornar 11 dígitos.
    """
    patterns = [
        r"C\.?U\.?I\.?T\.?\s*[:\-]?\s*(\d{2}-?\d{8}-?\d)",
        # CUIT del Vendedor / Emisor (no el del comprador)
        r"CUIT\s+Emisor\s*[:\-]?\s*(\d{2}-?\d{8}-?\d)",
        r"C\.?U\.?I\.?T\.?\s+del\s+Emisor\s*[:\-]?\s*(\d{2}-?\d{8}-?\d)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw_cuit = match.group(1)
            # Normalizar: remover guiones → solo 11 dígitos
            return raw_cuit.replace("-", "")

    # Fallback: buscar cualquier CUIT en el texto (primero que aparezca = emisor)
    fallback = re.search(r"\b(\d{2})-?(\d{8})-?(\d)\b", text)
    if fallback:
        return fallback.group(1) + fallback.group(2) + fallback.group(3)

    return None


def _parse_razon_social(text: str) -> Optional[str]:
    """
    Extrae la razón social del emisor.
    Estrategia: buscar la línea siguiente a "Razón Social" o usar
    el nombre que aparece en el encabezado de la factura.
    """
    patterns = [
        r"Raz[oó]n\s+Social\s*[:\-]?\s*(.+?)(?:\n|CUIT|C\.U\.I\.T|$)",
        r"Nombre\s+y\s+Apellido\s*[:\-]?\s*(.+?)(?:\n|CUIT|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            # Limpiar caracteres extra
            name = re.sub(r"\s+", " ", name)
            if len(name) > 2:  # Evitar capturas vacías
                return name
    return None


def _parse_importe_neto(text: str) -> Optional[float]:
    """
    Extrae el importe neto gravado (sin IVA).
    Maneja el formato numérico argentino: punto como separador de miles,
    coma como separador decimal (e.g., "1.234,56").
    """
    patterns = [
        r"Importe\s+Neto\s+Gravado\s*[:\$]?\s*([\d.,]+)",
        r"Neto\s+Gravado\s*[:\$]?\s*([\d.,]+)",
        r"Base\s+Imponible\s*[:\$]?\s*([\d.,]+)",
        r"Subtotal\s*[:\$]?\s*([\d.,]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return _parse_amount(match.group(1))
    return None


def _parse_iva(text: str) -> Optional[float]:
    """
    Extrae el monto total de IVA (suma de todas las alícuotas).
    """
    patterns = [
        # IVA 21%, 10.5%, etc.
        r"I\.?V\.?A\.?\s+\d+(?:[.,]\d+)?%\s*[:\$]?\s*([\d.,]+)",
        r"I\.?V\.?A\s*[:\$]?\s*([\d.,]+)",
        r"Impuesto\s+al\s+Valor\s+Agregado\s*[:\$]?\s*([\d.,]+)",
    ]
    iva_total = 0.0
    found = False

    # Sumar todos los renglones de IVA que aparezcan (puede haber 21% y 10.5%)
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            amount = _parse_amount(match.group(1))
            if amount is not None:
                iva_total += amount
                found = True
        if found:
            break

    return round(iva_total, 2) if found else None


def _parse_total(text: str) -> Optional[float]:
    """
    Extrae el importe total del comprobante.
    """
    patterns = [
        r"Importe\s+Total\s*[:\$]?\s*([\d.,]+)",
        r"\bTotal\s*[:\$]?\s*([\d.,]+)",  # \b evita matchear "Subtotal"
        r"\bTOTAL\s*\$?\s*([\d.,]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return _parse_amount(match.group(1))
    return None


def _parse_cae(text: str) -> Optional[str]:
    """
    Extrae el Código de Autorización Electrónica (CAE).
    El CAE de AFIP es un número de 14 dígitos.
    """
    patterns = [
        r"C\.?A\.?E\.?\s*(?:N[°ºA-Za-z]*)?\s*[:\-]?\s*(\d{14})",
        r"CAE\s*[:\-]?\s*(\d{14})",
        r"C[oó]digo\s+de\s+Autorizaci[oó]n\s+Electr[oó]nica\s*[:\-]?\s*(\d{14})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def _parse_amount(raw: str) -> Optional[float]:
    """
    Convierte un string numérico en formato argentino a float.
    Ejemplos:
        "1.234,56" → 1234.56
        "1234.56"  → 1234.56  (formato anglosajón, también tolerado)
        "1.234"    → 1234.0   (miles sin decimales)
    """
    if not raw:
        return None
    raw = raw.strip()

    try:
        # Caso: formato argentino con punto de miles y coma decimal
        if "," in raw and "." in raw:
            raw = raw.replace(".", "").replace(",", ".")
        # Caso: solo coma (coma como decimal)
        elif "," in raw:
            raw = raw.replace(",", ".")
        # Caso: solo punto (puede ser miles o decimal anglosajón)
        # Si hay más de 3 dígitos después del punto, es decimal; si hay 3, es miles
        elif "." in raw:
            parts = raw.split(".")
            if len(parts[-1]) == 3:
                # Probablemente separador de miles (e.g., "1.234")
                raw = raw.replace(".", "")
            # else: es decimal anglosajón, dejarlo como está

        return float(raw)
    except ValueError:
        logger.warning(f"[Parser] No se pudo convertir importe: '{raw}'")
        return None


def _empty_result() -> Dict[str, Any]:
    """Retorna un diccionario vacío con todos los campos en None."""
    return {
        "tipo_factura": None,
        "punto_venta": None,
        "numero": None,
        "fecha": None,
        "cuit": None,
        "razon_social": None,
        "importe_neto": None,
        "iva": None,
        "total": None,
        "cae": None,
    }

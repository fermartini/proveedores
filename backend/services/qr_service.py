"""
services/qr_service.py
-----------------------
Servicio de extracción y corrección del código QR de facturas AFIP/ARCA.

Utiliza PyMuPDF (fitz) para renderizar las páginas del PDF como imágenes
sin necesidad de poppler ni ninguna dependencia de sistema operativo.

Flujo:
  1. Abrir el PDF con fitz (PyMuPDF).
  2. Renderizar cada página a un pixmap (imagen en memoria). Se intentan escalas mayores si falla.
  3. Convertir el pixmap a PIL Image.
  4. Escanear la imagen con pyzbar buscando códigos QR.
  5. Si se encuentra una URL con dominio "arca.gob.ar", reemplazarla por "afip.gob.ar".

Valores de retorno posibles:
  - URL válida (string comenzando con "http") → QR leído correctamente.
  - "NO TIENE"          → El PDF no contiene ningún código QR.
  - "NO SE PUEDE LEER"  → Se detectó algo parecido a un QR pero no pudo decodificarse
                          (código cortado, dañado o con baja resolución).
"""

import io
import re
import logging
from typing import Optional

from PIL import Image
from pyzbar import pyzbar

logger = logging.getLogger(__name__)

# Valor sentinel cuando el PDF no tiene ningún código QR
QR_NO_TIENE = "NO TIENE"

# Valor sentinel cuando el QR existe pero está cortado / ilegible
QR_NO_SE_PUEDE_LEER = "NO SE PUEDE LEER"


def extract_qr_url(pdf_bytes: bytes) -> str:
    """
    Extrae la URL del código QR de AFIP de un PDF de factura.

    Args:
        pdf_bytes: Contenido binario del PDF.

    Returns:
        - URL del QR (con dominio afip.gob.ar ya corregido) si se leyó correctamente.
        - "NO TIENE" si el PDF no tiene ningún QR.
        - "NO SE PUEDE LEER" si el QR está cortado, dañado o no se pudo decodificar.
    """
    try:
        import fitz  # PyMuPDF — no necesita poppler
    except ImportError:
        logger.error(
            "[QR] PyMuPDF no instalado. "
            "Ejecutar: pip install PyMuPDF"
        )
        return QR_NO_SE_PUEDE_LEER

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        logger.error(f"[QR] No se pudo abrir el PDF con PyMuPDF: {exc}")
        return QR_NO_SE_PUEDE_LEER

    found_qr_region = False  # Para distinguir "no tiene" de "no se puede leer"

    for page_num in range(min(len(doc), 2)):  # Solo primeras 2 páginas
        page = doc[page_num]

        # Intentaremos distintas escalas (zoom). A veces el QR es muy pequeño para pyzbar en 2x.
        for scale in [2.0, 3.0, 4.0]:
            mat = fitz.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat, alpha=False)

            # Convertir pixmap → bytes PNG → PIL Image
            img_bytes = pix.tobytes("png")
            pil_image = Image.open(io.BytesIO(img_bytes))

            # Escanear en busca de QR codes con pyzbar
            decoded_objects = pyzbar.decode(pil_image)

            if not decoded_objects:
                # Intentar con la página en escala de grises (mejor contraste para pyzbar)
                gray_image = pil_image.convert("L")
                decoded_objects = pyzbar.decode(gray_image)

            for obj in decoded_objects:
                raw = obj.data.decode("utf-8", errors="ignore").strip()

                if raw.startswith("http"):
                    # ✅ QR leído correctamente — corregir dominio y retornar
                    url = fix_arca_domain(raw)
                    logger.info(f"[QR] ✅ QR válido encontrado en página {page_num + 1} (Escala {scale}x): {url[:70]}...")
                    doc.close()
                    return url
                else:
                    # Se decodificó algo pero no es una URL → QR presente pero inválido
                    logger.warning(f"[QR] QR encontrado pero contenido inválido en escala {scale}x: '{raw[:40]}'")
                    found_qr_region = True

            # Detectar si hay una región que parece QR (módulo de detección de pyzbar)
            all_found = pyzbar.decode(pil_image, symbols=None)
            if all_found:
                found_qr_region = True

    doc.close()

    if found_qr_region:
        logger.warning("[QR] ⚠️ Se detectó un QR pero no se pudo leer (cortado o dañado).")
        return QR_NO_SE_PUEDE_LEER
    else:
        logger.info("[QR] ℹ️ El PDF no contiene ningún código QR.")
        return QR_NO_TIENE


def fix_arca_domain(url: str) -> str:
    """
    Corrige el dominio del link del QR.
    ARCA es el nuevo nombre institucional de AFIP, pero el verificador de
    comprobantes sigue funcionando bajo el dominio afip.gob.ar.

    Args:
        url: URL original extraída del QR (puede ser arca.gob.ar o afip.gob.ar).

    Returns:
        URL con el dominio normalizado a afip.gob.ar.
    """
    if not url or url in (QR_NO_TIENE, QR_NO_SE_PUEDE_LEER):
        return url

    corrected = re.sub(
        r"https?://(www\.)?arca\.gob\.ar",
        "https://www.afip.gob.ar",
        url,
        flags=re.IGNORECASE,
    )

    if corrected != url:
        logger.info("[QR] Dominio corregido: arca.gob.ar → afip.gob.ar")

    return corrected

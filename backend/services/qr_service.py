"""
services/qr_service.py
-----------------------
Servicio de extracción y corrección del código QR de facturas AFIP/ARCA.

Esta es una versión "Omnívora" y extremadamente robusta de Computer Vision.
Utiliza OpenCV, Numpy, PIL y ZXing para preprocesamiento e Inferencia IA.

FASE 1: Enrutamiento inicial (PDF vía PyMuPDF, Imágenes vía PIL).
FASE 2: Pipeline Estructurado de Extracción con OpenCV (Upscaling, Otsu).
FASE 3: Estabilización de URLs.
"""

import io
import re
import logging
from typing import Optional

import cv2
import numpy as np
from PIL import Image, ImageOps
import zxingcpp

logger = logging.getLogger(__name__)

QR_NO_TIENE = "NO TIENE"
QR_NO_SE_PUEDE_LEER = "NO SE PUEDE LEER"

# Resolución de render del PDF: Matrix(4,4) ≈ 300 DPI
_PDF_RENDER_SCALE = 4.0


def extract_qr_url(pdf_bytes: bytes) -> str:
    """FASE 1 - Enrutador (PDF): Renderiza a imagen nativa 300DPI."""
    try:
        import fitz
    except ImportError:
        logger.error("[QR] PyMuPDF no instalado.")
        return QR_NO_SE_PUEDE_LEER

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        logger.error(f"[QR] No se pudo abrir el PDF con PyMuPDF: {exc}")
        return QR_NO_SE_PUEDE_LEER

    for page_num in range(min(len(doc), 2)):
        page = doc[page_num]
        
        # Matrix(4,4) emula resolución de ~300 DPI, logrando máxima nitidez nativa
        mat = fitz.Matrix(4.0, 4.0)
        pix = page.get_pixmap(matrix=mat, alpha=False)

        img_bytes = pix.tobytes("png")
        pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        
        # Quiet Zone artificial en caso de márgenes estrechos
        pil_image = ImageOps.expand(pil_image, border=40, fill='white')

        # Lanzar a la FASE 2
        result = extraer_qr_robusto(pil_image)
        if result and result.lower().startswith("http"):
            url = fix_arca_domain(result)
            logger.info(f"[QR] ✅ QR válido encontrado en PDF (Pág {page_num + 1}): {url[:70]}...")
            doc.close()
            return url

    doc.close()
    logger.info("[QR] ℹ️ El PDF no arrojó lectura de código QR.")
    return QR_NO_TIENE


def extract_qr_from_image(img_bytes: bytes) -> str:
    """FASE 1 - Enrutador (Imagen): Abre en RAM y lanza a FASE 2."""
    try:
        # Convertimos RGBA -> RGB puro
        raw_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        
        # Generamos borde artificial obligatorio para asegurar lectura de fragmentos
        pil_image = ImageOps.expand(raw_img, border=60, fill='white')
        
        # Lanzar a la FASE 2
        result = extraer_qr_robusto(pil_image)
        if result and result.lower().startswith("http"):
            url = fix_arca_domain(result)
            logger.info(f"[QR] ✅ QR válido encontrado en Imagen: {url[:70]}...")
            return url
            
        return QR_NO_TIENE

    except Exception as exc:
        logger.error(f"[QR] Error al instanciar Imagen: {exc}")
        return QR_NO_SE_PUEDE_LEER


def extraer_qr_robusto(pil_image: Image.Image) -> Optional[str]:
    """
    FASE 2 - PIPELINE DE VISIÓN ARTIFICIAL (FALLBACKS CASCADA)
    Toma una imagen base y agota iteraciones matemáticas antes de rendirse.
    """
    # ====== INTENTO 1: Inferencia Directa ======
    decoded = zxingcpp.read_barcodes(pil_image)
    if decoded:
        return decoded[0].text.strip()

    # ====== PRE-PROCESAMIENTO OPENCV ======
    # Convertir PIL (RGB) -> Array Numpy -> OpenCV (BGR)
    np_img = np.array(pil_image)
    bgr_img = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)

    # ====== INTENTO 2: Upscaling Bícubico (x2) & Grayscale ======
    # cv2.INTER_CUBIC genera contornos sintéticos para "despixelar" facturas escaneadas o web
    h, w = bgr_img.shape[:2]
    upscaled = cv2.resize(bgr_img, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
    gray_img = cv2.cvtColor(upscaled, cv2.COLOR_BGR2GRAY)

    decoded = zxingcpp.read_barcodes(gray_img)
    if decoded:
        logger.info("[QR] IA logró lectura en Intento 2 (Upscaling Cúbico)")
        return decoded[0].text.strip()

    # ====== INTENTO 3: Binarización Extrema por Umbral de Otsu ======
    # Fuerza cada pixel de la imagen a 0 o 255 matemáticamente, 
    # destruyendo todo el ruido, sombras oscuras o fondos grises.
    _, binary_img = cv2.threshold(gray_img, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)

    decoded = zxingcpp.read_barcodes(binary_img)
    if decoded:
        logger.info("[QR] IA logró lectura en Intento 3 (Binarización Otsu)")
        return decoded[0].text.strip()

    # Si todo falla, retornamos None
    return None


def render_pdf_pages(file_bytes: bytes):
    """
    Generador que renderiza todas las páginas de un PDF a imágenes PIL.
    """
    try:
        import fitz
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        for page in doc:
            mat = fitz.Matrix(_PDF_RENDER_SCALE, _PDF_RENDER_SCALE)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes("png")
            yield Image.open(io.BytesIO(img_bytes)).convert("RGB")
        doc.close()
    except Exception as exc:
        logger.error(f"[QR] render_pdf_pages error: {exc}")


def render_first_page(file_bytes: bytes, is_pdf: bool) -> Optional[Image.Image]:
    """
    Renderiza la primera página de un PDF o abre directamente una Imagen.
    """
    try:
        if is_pdf:
            pages = render_pdf_pages(file_bytes)
            return next(pages, None)
        else:
            return Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception as exc:
        logger.error(f"[QR] render_first_page error: {exc}")
        return None



def fix_arca_domain(url: str) -> str:
    """FASE 3 - Limpieza Sintáctica."""
    if not url or url in (QR_NO_TIENE, QR_NO_SE_PUEDE_LEER):
        return url

    corrected = re.sub(
        r"https?://(www\.)?arca\.gob\.ar",
        "https://www.afip.gob.ar",
        url,
        flags=re.IGNORECASE,
    )
    return corrected

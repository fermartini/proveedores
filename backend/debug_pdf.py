"""
debug_pdf.py
------------
Script de diagnóstico para probar la extracción de texto y QR
de una factura PDF real. Ejecutar desde la carpeta backend:

    python debug_pdf.py ruta/a/factura.pdf

Muestra:
  - El texto completo extraído por pdfplumber
  - Los resultados del QR reader (pyzbar + PyMuPDF)
  - Los campos parseados por parser_service
"""

import sys
import io
import logging

logging.basicConfig(level=logging.DEBUG, format="%(levelname)s | %(message)s")

if len(sys.argv) < 2:
    print("\nUso: python debug_pdf.py ruta/a/factura.pdf\n")
    sys.exit(1)

pdf_path = sys.argv[1]

with open(pdf_path, "rb") as f:
    pdf_bytes = f.read()

print(f"\n{'='*60}")
print(f"PDF: {pdf_path}  ({len(pdf_bytes)} bytes)")
print(f"{'='*60}\n")

# ------------------------------------------------------------------
# 1. Texto extraído por pdfplumber
# ------------------------------------------------------------------
print(">>> [1] TEXTO EXTRAÍDO (pdfplumber)\n")
import pdfplumber

with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
    for i, page in enumerate(pdf.pages):
        t = page.extract_text()
        print(f"--- Página {i+1} ---")
        if t:
            print(t)
        else:
            print("  !! Sin texto (PDF puede ser imagen/escaneado)")
        print()

# ------------------------------------------------------------------
# 2. QR con PyMuPDF + pyzbar
# ------------------------------------------------------------------
print(f"\n{'='*60}")
print(">>> [2] QR EXTRACTION (PyMuPDF + pyzbar)\n")

import fitz
from PIL import Image
from pyzbar import pyzbar

doc = fitz.open(stream=pdf_bytes, filetype="pdf")
print(f"Páginas en el PDF: {len(doc)}")

for page_num in range(min(len(doc), 3)):
    page = doc[page_num]
    print(f"\n--- Página {page_num+1} ---")

    for scale in [2.0, 3.0, 4.0]:
        mat = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        pil_image = Image.open(io.BytesIO(img_bytes))

        decoded = pyzbar.decode(pil_image)
        if not decoded:
            gray = pil_image.convert("L")
            decoded = pyzbar.decode(gray)

        print(f"  Scale {scale}x → {len(decoded)} código(s) detectado(s)")
        for obj in decoded:
            raw = obj.data.decode("utf-8", errors="ignore").strip()
            print(f"    Tipo: {obj.type} | Contenido: {raw[:120]}")

        if decoded:
            break

doc.close()

# ------------------------------------------------------------------
# 3. Campos parseados por parser_service
# ------------------------------------------------------------------
print(f"\n{'='*60}")
print(">>> [3] CAMPOS PARSEADOS (parser_service)\n")

import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from services import parser_service

try:
    fields = parser_service.parse_invoice(pdf_bytes)
    for k, v in fields.items():
        print(f"  {k:20s}: {v}")
except parser_service.TipoFacturaInvalidaError as e:
    print(f"  !! RECHAZADA: {e}")
except Exception as e:
    print(f"  !! ERROR: {e}")

print(f"\n{'='*60}\n")

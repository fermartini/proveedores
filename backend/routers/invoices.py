"""
routers/invoices.py
--------------------
Router de FastAPI para el endpoint /upload de facturas.

Flujo de una request:
  1. Recibe N archivos PDF via multipart/form-data.
  2. Para cada PDF, llama a pdf_service.process_pdf() en un ThreadPoolExecutor
     (procesamiento paralelo para reducir latencia con múltiples archivos).
  3. Guarda cada resultado en Firestore via firebase_client.save_invoice().
  4. Retorna la lista de InvoiceResult como JSON.

Endpoints adicionales:
  - GET /invoices: Lista todas las facturas guardadas en Firestore.
  - PATCH /invoices/{id}: Actualiza campos (autorizada, pagada).
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from models.invoice import InvoiceResult, InvoiceDBPayload
from services import pdf_service
import firebase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Facturas"])


# ---------------------------------------------------------------------------
# POST /api/upload — Procesamiento masivo de PDFs
# ---------------------------------------------------------------------------

@router.post(
    "/upload",
    response_model=List[InvoiceResult],
    summary="Procesar múltiples PDFs de facturas AFIP/ARCA",
    description=(
        "Recibe hasta 50 archivos PDF de facturas AFIP electrónicas. "
        "Extrae QR, parsea datos, corrige dominio arca→afip y persiste en Firestore."
    ),
)
async def upload_invoices(files: List[UploadFile] = File(...)):
    """
    Endpoint principal: procesamiento masivo de facturas PDF.

    - Valida que todos los archivos sean PDF.
    - Procesa en paralelo usando ThreadPoolExecutor (I/O bound + CPU bound).
    - Guarda automáticamente en Firestore con autorizada=False, pagada=False.
    - Retorna los resultados aunque algunos archivos hayan fallado parcialmente.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No se recibieron archivos.")

    if len(files) > 50:
        raise HTTPException(
            status_code=400,
            detail=f"Máximo 50 archivos por request. Se recibieron {len(files)}."
        )

    # Validar que todos sean formatos permitidos antes de procesar
    allowed_extensions = (".pdf", ".jpg", ".jpeg", ".png")
    for file in files:
        if not file.filename.lower().endswith(allowed_extensions):
            raise HTTPException(
                status_code=422,
                detail=f"El archivo '{file.filename}' no es un formato válido. Usa PDF, JPG o PNG."
            )

    # Leer todos los bytes en memoria (async)
    file_data = []
    for file in files:
        content = await file.read()
        file_data.append((file.filename, content))

    logger.info(f"[Upload] Procesando {len(file_data)} archivos...")

    results: List[InvoiceResult] = []

    # Procesamiento paralelo: cada archivo puede generar N facturas (multi-página)
    with ThreadPoolExecutor(max_workers=min(len(file_data), 8)) as executor:
        future_map = {
            executor.submit(pdf_service.process_pdf, filename, content): filename
            for filename, content in file_data
        }

        for future in as_completed(future_map):
            filename = future_map[future]
            try:
                # Ahora process_pdf devuelve una LISTA de InvoiceResult
                page_results: List[InvoiceResult] = future.result()
                results.extend(page_results)
                logger.info(f"[Upload] ✓ Procesado: {filename} ({len(page_results)} facturas)")
            except Exception as exc:
                logger.error(f"[Upload] ✗ Error al procesar {filename}: {exc}")
                results.append(InvoiceResult(
                    filename=filename,
                    status="error",
                    error_detail=str(exc),
                ))

    # --- Lógica de Desduplicación Global (Cross-File) ---
    unique_results = []
    seen_qrs = set()
    seen_datos = set()

    for r in results:
        # Si ya es un error, lo dejamos pasar para que el usuario lo vea
        if r.status == "error":
            unique_results.append(r)
            continue

        is_duplicate = False
        
        # 1. Match Exacto por Link de QR
        if r.qr_link and r.qr_link.lower().startswith("http"):
            if r.qr_link in seen_qrs:
                is_duplicate = True
            else:
                seen_qrs.add(r.qr_link)
                
        # 2. Match por CUIT y Número
        if not is_duplicate and r.cuit and r.numero is not None:
            key_datos = (str(r.cuit).strip(), r.numero)
            if key_datos in seen_datos:
                is_duplicate = True
            else:
                seen_datos.add(key_datos)
                
        if is_duplicate:
            logger.info(f"[Upload] ♻️ Ignorando duplicado global: {r.filename} (CUIT: {r.cuit}, Nro: {r.numero})")
            continue
            
        unique_results.append(r)

    # Ordenar resultados por nombre de archivo
    unique_results.sort(key=lambda r: r.filename)

    logger.info(f"[Upload] Completado: {len(unique_results)} facturas únicas encontradas.")
    return unique_results



# ---------------------------------------------------------------------------
# GET /api/invoices — Listado de facturas desde Firestore
# ---------------------------------------------------------------------------

@router.get(
    "/invoices",
    summary="Obtener todas las facturas guardadas",
    description="Retorna el listado completo de facturas desde Firestore, ordenadas por fecha desc.",
)
async def get_invoices():
    """Retorna todas las facturas persistidas en Firestore."""
    invoices = firebase_client.get_all_invoices()
    return JSONResponse(content={"invoices": invoices, "total": len(invoices)})


# ---------------------------------------------------------------------------
# POST /api/confirm — Guardar facturas validadas en Base de Datos
# ---------------------------------------------------------------------------

@router.post(
    "/confirm",
    summary="Confirmar y guardar facturas en la base de datos",
    description="Recibe una lista de facturas validadas y las persiste mapeadas con el formato específico.",
)
async def confirm_invoices(payloads: List[InvoiceDBPayload]):
    """
    Recibe un array de objetos con el mapping de la base de datos y los guarda.
    Nota: El campo url_qr_afip recibe el link de ARCA convertido al dominio de AFIP.
    """
    saved_count = 0
    errors = []

    for item in payloads:
        try:
            # item.model_dump() extraerá los campos definidos (cuit_emisor, etc.)
            invoice_dict = item.model_dump()
            # La función save_invoice inyecta created_at automáticamente
            doc_id = firebase_client.save_invoice(invoice_dict)
            if doc_id:
                saved_count += 1
            else:
                errors.append(f"Fallo al guardar: {item.razon_social}")
        except Exception as e:
            logger.error(f"[Confirm] ✗ Error guardando factura: {e}")
            errors.append(str(e))

    if saved_count == 0 and len(payloads) > 0:
        error_msg = "; ".join(errors) if errors else "Firestore no disponible. Verificá el secreto FIREBASE_SERVICE_ACCOUNT_JSON en Hugging Face."
        raise HTTPException(status_code=500, detail=f"No se guardó ninguna factura. Error: {error_msg}")

    return {
        "success": True,
        "saved_count": saved_count,
        "errors": errors
    }


# ---------------------------------------------------------------------------
# PATCH /api/invoices/{doc_id} — Actualizar campo de una factura
# ---------------------------------------------------------------------------

@router.patch(
    "/invoices/{doc_id}",
    summary="Actualizar campo de una factura",
    description="Actualiza un campo específico (e.g., autorizada, pagada) de una factura.",
)
async def update_invoice(doc_id: str, payload: dict):
    """
    Permite actualizar campos como 'autorizada' y 'pagada' desde el frontend.

    Body JSON esperado: {"field": "autorizada", "value": true}
    """
    field = payload.get("field")
    value = payload.get("value")

    if not field:
        raise HTTPException(status_code=400, detail="El campo 'field' es requerido.")

    allowed_fields = {"autorizada", "pagada", "cuenta_contable", "comentario"}
    if field not in allowed_fields:
        raise HTTPException(
            status_code=422,
            detail=f"Campo '{field}' no permitido. Campos editables: {allowed_fields}"
        )

    success = firebase_client.update_invoice_field(doc_id, field, value)
    if not success:
        raise HTTPException(status_code=500, detail="Error al actualizar el documento.")

    return {"success": True, "doc_id": doc_id, "field": field, "value": value}

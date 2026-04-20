"""
firebase_client.py
------------------
Inicialización del Firebase Admin SDK y operaciones de Firestore.

El Admin SDK se usa en el backend (Python) para guardar/leer datos
con privilegios de administrador sin necesidad de autenticación de usuario.

Configuración requerida:
  - Archivo serviceAccountKey.json (credenciales de la cuenta de servicio)
  - Variable de entorno FIREBASE_CREDENTIALS_PATH apuntando al JSON.

Ver: https://firebase.google.com/docs/admin/setup
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# Cargar variables de entorno desde .env
load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Inicialización singleton del SDK — solo se ejecuta una vez al importar
# ---------------------------------------------------------------------------

_db: Optional[firestore.Client] = None


def _init_firebase() -> Optional[firestore.Client]:
    """
    Inicializa Firebase Admin SDK y retorna el cliente de Firestore.
    Usa el patrón singleton para evitar múltiples inicializaciones.
    """
    global _db
    if _db is not None:
        return _db

    credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")

    try:
        if not firebase_admin._apps:
            # 1. Intentar cargar desde variable de entorno (JSON string) - Recomendado para Prod/HF
            service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            
            if service_account_json:
                try:
                    cred_dict = json.loads(service_account_json)
                    cred = credentials.Certificate(cred_dict)
                    logger.info("[Firebase] Usando credenciales desde variable FIREBASE_SERVICE_ACCOUNT_JSON.")
                except Exception as json_err:
                    logger.error(f"[Firebase] Error parseando FIREBASE_SERVICE_ACCOUNT_JSON: {json_err}")
                    return None
            else:
                # 2. Fallback: Intentar cargar desde archivo físico (comportamiento anterior)
                if not os.path.exists(credentials_path):
                    logger.error(
                        f"[Firebase] Archivo de credenciales no encontrado: {credentials_path}\n"
                        "Configura FIREBASE_SERVICE_ACCOUNT_JSON o sube el archivo."
                    )
                    return None
                cred = credentials.Certificate(credentials_path)
                logger.info(f"[Firebase] Usando credenciales desde archivo: {credentials_path}")

            firebase_admin.initialize_app(cred)
            logger.info("[Firebase] SDK inicializado correctamente.")

        _db = firestore.client()
        return _db

    except Exception as exc:
        logger.error(f"[Firebase] Error al inicializar SDK: {exc}")
        return None


# ---------------------------------------------------------------------------
# Operaciones de Firestore
# ---------------------------------------------------------------------------

COLLECTION_NAME = os.getenv("INVOICES_COLLECTION", "invoices")


def save_invoice(invoice_dict: dict) -> Optional[str]:
    """
    Guarda una factura procesada en la colección 'invoices' de Firestore.

    Agrega automáticamente:
      - created_at: timestamp del servidor Firestore (más confiable que el cliente).
      - autorizada: False (pendiente de revisión manual).
      - pagada: False (pendiente de pago).

    Args:
        invoice_dict: Diccionario con los datos de la factura (del modelo InvoiceResult).

    Returns:
        ID del documento creado en Firestore, o None si falló.
    """
    db = _init_firebase()
    if db is None:
        logger.warning("[Firebase] Firestore no disponible, la factura no se guardará.")
        return None

    try:
        # Mapear campos del payload al esquema de Firestore
        # estado_autorizacion → autorizada (default False: las facturas entran como recibidas, no autorizadas)
        # estado_pago        → pagada     (default False: aún no fueron abonadas)
        invoice_dict["autorizada"] = invoice_dict.pop("estado_autorizacion", False)
        invoice_dict["pagada"]     = invoice_dict.pop("estado_pago", False)
        invoice_dict["created_at"] = firestore.SERVER_TIMESTAMP

        # Agregar a la colección (Firestore genera el ID automáticamente)
        doc_ref = db.collection(COLLECTION_NAME).add(invoice_dict)
        doc_id = doc_ref[1].id  # add() retorna (timestamp, DocumentReference)

        logger.info(f"[Firebase] Factura guardada con ID: {doc_id}")
        return doc_id

    except Exception as exc:
        logger.error(f"[Firebase] Error al guardar factura: {exc}")
        return None


def _serialize_doc(doc_dict: dict) -> dict:
    """
    Convierte tipos no serializables de Firestore (DatetimeWithNanoseconds, etc.)
    a tipos primitivos compatibles con JSON.
    """
    result = {}
    for key, value in doc_dict.items():
        if hasattr(value, "isoformat"):
            # DatetimeWithNanoseconds, datetime, date → ISO string
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = _serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [
                _serialize_doc(v) if isinstance(v, dict)
                else (v.isoformat() if hasattr(v, "isoformat") else v)
                for v in value
            ]
        else:
            result[key] = value
    return result


def get_all_invoices(company_cuit: str = None) -> list:
    """
    Obtiene todas las facturas de Firestore filtradas obligatoriamente por company_cuit.
    Si no se provee un company_cuit, retorna una lista vacía para seguridad.

    Returns:
        Lista de dicts con los datos de cada factura, incluyendo su ID de documento.
    """
    if not company_cuit:
        logger.warning("[Firebase] Se intentó obtener facturas sin especificar company_cuit. Retornando vacío.")
        return []

    db = _init_firebase()
    if db is None:
        return []

    try:
        # Consulta filtrada
        docs = (
            db.collection(COLLECTION_NAME)
            .where("company_cuit", "==", company_cuit)
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .stream()
        )
        return [{"id": doc.id, **_serialize_doc(doc.to_dict())} for doc in docs]

    except Exception as exc:
        logger.error(f"[Firebase] Error al obtener facturas: {exc}")
        return []



def update_invoice_field(doc_id: str, field: str, value) -> bool:
    """
    Actualiza un campo específico de una factura (e.g., autorizada, pagada).

    Args:
        doc_id: ID del documento en Firestore.
        field: Nombre del campo a actualizar.
        value: Nuevo valor del campo.

    Returns:
        True si se actualizó correctamente, False si hubo un error.
    """
    db = _init_firebase()
    if db is None:
        return False

    try:
        db.collection(COLLECTION_NAME).document(doc_id).update({field: value})
        logger.info(f"[Firebase] Actualizado {doc_id}.{field} = {value}")
        return True
    except Exception as exc:
        logger.error(f"[Firebase] Error al actualizar factura {doc_id}: {exc}")
        return False


def migrate_missing_company_cuits(default_cuit: str):
    """
    Busca todas las facturas que no tengan el campo 'company_cuit' 
    y les asigna el CUIT por defecto proporcionado.
    """
    db = _init_firebase()
    if db is None:
        return 0

    try:
        # Firestore no permite query directa por falta de campo de forma eficiente en SDK básico
        # Traemos todos y filtramos localmente o usamos query por NO existencia si es posible.
        # Una forma común es traer todos y chequear si 'company_cuit' in doc_dict.
        
        docs = db.collection(COLLECTION_NAME).stream()
        count = 0
        
        batch = db.batch()
        batch_count = 0
        
        for doc in docs:
            data = doc.to_dict()
            if "company_cuit" not in data or not data["company_cuit"]:
                doc_ref = db.collection(COLLECTION_NAME).document(doc.id)
                batch.update(doc_ref, {"company_cuit": default_cuit})
                count += 1
                batch_count += 1
                
                # Firestore batch limit is 500
                if batch_count >= 400:
                    batch.commit()
                    batch = db.batch()
                    batch_count = 0
        
        if batch_count > 0:
            batch.commit()
            
        logger.info(f"[Firebase] Migración completada. {count} documentos actualizados a CUIT: {default_cuit}")
        return count

    except Exception as exc:
        logger.error(f"[Firebase] Error en migración: {exc}")
        return 0

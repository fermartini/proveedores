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

    if not os.path.exists(credentials_path):
        logger.error(
            f"[Firebase] Archivo de credenciales no encontrado: {credentials_path}\n"
            "Por favor, descarga el serviceAccountKey.json desde:\n"
            "Firebase Console → Proyecto → Configuración → Cuentas de servicio"
        )
        return None

    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(credentials_path)
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
        # Asegurar campos obligatorios del ERP
        invoice_dict["autorizada"] = False
        invoice_dict["pagada"] = False
        invoice_dict["created_at"] = firestore.SERVER_TIMESTAMP

        # Agregar a la colección (Firestore genera el ID automáticamente)
        doc_ref = db.collection(COLLECTION_NAME).add(invoice_dict)
        doc_id = doc_ref[1].id  # add() retorna (timestamp, DocumentReference)

        logger.info(f"[Firebase] Factura guardada con ID: {doc_id}")
        return doc_id

    except Exception as exc:
        logger.error(f"[Firebase] Error al guardar factura: {exc}")
        return None


def get_all_invoices() -> list:
    """
    Obtiene todas las facturas de Firestore ordenadas por fecha de creación.

    Returns:
        Lista de dicts con los datos de cada factura, incluyendo su ID de documento.
    """
    db = _init_firebase()
    if db is None:
        return []

    try:
        docs = (
            db.collection(COLLECTION_NAME)
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .stream()
        )
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]

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

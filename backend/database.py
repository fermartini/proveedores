"""
database.py
-----------
Inicialización del Firebase Admin SDK y exportación de la instancia de Firestore.

Uso:
    from database import db

    doc_ref = db.collection("comprobantes_ingreso").add(data)

Requiere:
    - Archivo serviceAccountKey.json en la misma carpeta que este script.
      Descargarlo desde:
      Firebase Console → Tu Proyecto → Configuración → Cuentas de servicio
      → Generar nueva clave privada.
"""

import os
import logging

import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ruta al archivo de credenciales de la cuenta de servicio
# ---------------------------------------------------------------------------
_CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")


def _initialize_firebase() -> firestore.Client:
    """
    Inicializa el Firebase Admin SDK usando el patrón singleton.
    Si la app ya fue inicializada (ej: hot reload de uvicorn), la reutiliza.

    Returns:
        Instancia de Firestore Client lista para usar.

    Raises:
        FileNotFoundError: Si serviceAccountKey.json no existe.
    """
    if not os.path.exists(_CREDENTIALS_PATH):
        raise FileNotFoundError(
            f"No se encontró el archivo de credenciales en: {_CREDENTIALS_PATH}\n"
            "Descargarlo desde: Firebase Console → Proyecto → "
            "Configuración → Cuentas de servicio → Generar nueva clave privada."
        )

    # Evitar doble inicialización en reloads de uvicorn
    if not firebase_admin._apps:
        cred = credentials.Certificate(_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        logger.info("[Firebase] SDK inicializado correctamente.")
    else:
        logger.info("[Firebase] SDK ya inicializado, reutilizando instancia.")

    return firestore.client()


# ---------------------------------------------------------------------------
# Instancia global de Firestore — importar desde otros módulos
# ---------------------------------------------------------------------------
db: firestore.Client = _initialize_firebase()

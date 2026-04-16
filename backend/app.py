"""
main.py
--------
Punto de entrada principal de la API FastAPI.

Configura:
  - CORS para permitir requests desde el frontend React (localhost:5173).
  - Logging con formato legible.
  - Inclusión del router de facturas.
  - Endpoint de health check.
"""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers.invoices import router as invoices_router

# Cargar variables de entorno
load_dotenv()

# ---------------------------------------------------------------------------
# Configuración de logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Instancia de FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Plataforma de Facturas AFIP/ARCA",
    description=(
        "API backend para el procesamiento masivo de facturas PDF electrónicas "
        "argentinas (AFIP/ARCA). Extrae datos via QR y texto, y persiste en Firebase Firestore."
    ),
    version="1.0.0",
    docs_url="/docs",       # Swagger UI en /docs
    redoc_url="/redoc",     # ReDoc en /redoc
)

# ---------------------------------------------------------------------------
# CORS — Configuración para desarrollo local
# ---------------------------------------------------------------------------
# En produccion, el frontend esta en Vercel (dominio variable).
# Se usa allow_origins=["*"] para simplicidad — el acceso real lo
# controla la autenticacion de Firebase en el frontend.
CORS_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,  # Debe ser False cuando allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(invoices_router)

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/", tags=["Sistema"])
async def root():
    """Endpoint de verificación de estado del servidor."""
    return {
        "status": "online",
        "service": "Plataforma Facturas AFIP/ARCA",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Sistema"])
async def health_check():
    """Health check para monitoreo y load balancers."""
    return {"status": "healthy"}


@app.get("/health/firebase", tags=["Sistema"])
async def health_firebase():
    """Diagnóstico de la conexión con Firebase Firestore."""
    import os, json
    import firebase_client

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")

    config_status = {
        "env_var_present": bool(service_account_json),
        "env_var_length": len(service_account_json) if service_account_json else 0,
        "file_exists": __import__('os.path', fromlist=['exists']).exists(credentials_path),
    }

    if service_account_json:
        try:
            parsed = json.loads(service_account_json)
            config_status["json_valid"] = True
            config_status["project_id"] = parsed.get("project_id", "N/A")
            config_status["client_email"] = parsed.get("client_email", "N/A")
        except Exception as e:
            config_status["json_valid"] = False
            config_status["json_error"] = str(e)

    db = firebase_client._init_firebase()
    config_status["firestore_connected"] = db is not None

    return config_status


# ---------------------------------------------------------------------------
# Arranque directo (para desarrollo)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Iniciando servidor en http://localhost:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

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
# En producción, reemplazar ["*"] por el dominio real del frontend.
CORS_ORIGINS = [
    "http://localhost:5173",   # Vite dev server
    "http://localhost:3000",   # Alternativa
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
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


# ---------------------------------------------------------------------------
# Arranque directo (para desarrollo)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Iniciando servidor en http://localhost:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

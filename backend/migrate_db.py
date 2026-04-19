import logging
import os
import firebase_client

# Configurar logging para ver el progreso en consola
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

def main():
    logger.info("--- Iniciando Proceso de Migración de CUIT ---")
    
    # CUIT Objetivo (Jockey Club)
    cuit_objetivo = "30527990773"
    
    logger.info(f"Buscando facturas sin dueño para asignar al CUIT: {cuit_objetivo}...")
    
    actualizados = firebase_client.migrate_missing_company_cuits(cuit_objetivo)
    
    if actualizados > 0:
        logger.info(f"SUCCESS: Se actualizaron {actualizados} facturas correctamente.")
    else:
        logger.info("INFO: No se encontraron facturas pendientes de migración o hubo un error.")
    
    logger.info("--- Fin del Proceso ---")

if __name__ == "__main__":
    main()

"""
services/cuit_service.py
-------------------------
Servicio de consulta pública para obtener la Razón Social a partir de un CUIT.
Utiliza CuitOnline como fuente de respaldo gratuita y rápida.
"""

import re
import requests
import logging

logger = logging.getLogger(__name__)

def lookup_cuit_name(cuit: str) -> str | None:
    """
    Busca la razón social de un CUIT en CuitOnline.
    """
    if not cuit:
        return None
    
    # Limpiar solo números
    clean_cuit = re.sub(r"\D", "", str(cuit))
    if len(clean_cuit) != 11:
        return None

    # URL de búsqueda por detalle (funciona con cualquier slug al final)
    url = f"https://www.cuitonline.com/detalle/{clean_cuit}/info"
    
    # User agent para evitar bloqueos básicos
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "es-ES,es;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
    }
    
    try:
        logger.info(f"[CuitService] Consultando CUIT: {clean_cuit}...")
        response = requests.get(url, headers=headers, timeout=7)
        
        if response.status_code == 200:
            # El nombre suele estar en el <title> antes de los paréntesis del CUIT
            # Ejemplo <title>JOCKEY CLUB A C (30-52799077-3), ...
            match = re.search(r"<title>\s*([^(\n]+?)\s*\(", response.text, re.IGNORECASE)
            
            if match:
                name = match.group(1).strip()
                # Limpiar ruidos tipicos
                name = re.sub(r"\s+", " ", name)
                logger.info(f"[CuitService] ✓ Encontrado: {name}")
                return name.upper()
            
            # Fallback: buscar en meta description si el title falló
            meta_match = re.search(r'content="([^"]+?)\s?[-—–]\s?CUIT:\s?' + clean_cuit, response.text, re.IGNORECASE)
            if meta_match:
                return meta_match.group(1).strip().upper()

        elif response.status_code == 404:
            logger.warning(f"[CuitService] CUIT {clean_cuit} no encontrado en la base pública.")
            
    except Exception as e:
        logger.warning(f"[CuitService] Error en consulta de CUIT {clean_cuit}: {e}")
    
    return None

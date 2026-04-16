"""
services/llm_service.py
------------------------
Fallback de IA Multimodal usando Google Gemini 1.5 Flash (gratuito).

Se activa SOLO cuando el pipeline de QR (ZXing + OpenCV) no puede extraer
datos suficientes de una factura. Envía la imagen completa a la API de Google
y pide un JSON estructurado de vuelta.

Configuración requerida en .env:
    GEMINI_API_KEY=AIzaSy...

Si la variable no existe, el módulo devuelve {} silenciosamente (graceful degradation).
"""

import io
import os
import json
import logging
import re
from typing import Optional

from PIL import Image

logger = logging.getLogger(__name__)

# Prompt diseñado para extraer datos de facturas argentinas de forma estructurada
EXTRACTION_PROMPT = """Analizá esta imagen de una factura argentina. 
Extraé la siguiente información y devolvé ÚNICAMENTE un objeto JSON válido, sin Markdown, 
sin bloques de código, sin texto antes ni después del JSON:

{
  "cuit_emisor": "string o null",
  "razon_social": "string o null",
  "punto_venta": "número entero o null",
  "numero_comprobante": "número entero o null",
  "fecha_emision": "string en formato DD/MM/AAAA o null",
  "importe_neto": "número decimal o null",
  "iva": "número decimal o null",
  "otros_tributos": "número decimal o null",
  "total": "número decimal o null",
  "moneda": "ARS o USD",
  "cotizacion": "número decimal o null (Tipo de cambio si es USD)",
  "cae": "string o null",
  "tipo_factura": "A, B o C o null",
  "cuit_receptor": "string o null",
  "url_qr_afip": "URL completa si la ves o null"
}

Reglas:
- El CUIT Emisor es un número de 11 dígitos que aparece en el encabezado de la factura.
- El CUIT Receptor es a nombre de quien sale la factura (receptor).
- El CAE es un número de 14 dígitos que aparece generalmente al pie de la factura.
- El total es el importe TOTAL final de la factura.
- Si moneda es USD, buscá el "Tipo de Cambio" o "Cotización" para completar el campo cotizacion.
- No inventes datos. Solo extraé lo que esté claramente visible en la imagen.

"""


def _get_gemini_client():
    """Inicializa el cliente de Gemini a partir de la variable de entorno."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning(
            "[LLM] GEMINI_API_KEY no configurada. "
            "Agrega GEMINI_API_KEY=... a tu archivo .env para activar el fallback de IA."
        )
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        return genai
    except ImportError:
        logger.error("[LLM] google-generativeai no instalado. Ejecutar: pip install google-generativeai")
        return None


def extraer_datos_con_llm(pil_image: Image.Image) -> dict:
    """
    PLAN B - Fallback Multimodal: Envía la imagen de la factura a Gemini 1.5 Flash
    y obtiene un diccionario estructurado de datos.

    Args:
        pil_image: Imagen PIL de la primera página de la factura.

    Returns:
        dict con los campos extraídos. Devuelve {} si falla por cualquier motivo.
    """
    genai = _get_gemini_client()
    if genai is None:
        return {}

    try:
        logger.info("[LLM] 🤖 Activando fallback Gemini 1.5 Flash...")

        # Asegurar que la imagen esté en RGB (descarta canal alpha)
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")

        # Intentar con varios nombres de modelo posibles (la API de Google cambia nombres de alias frecuentemente)
        models_to_try = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-flash-latest"]
        response = None
        last_err = None

        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content([EXTRACTION_PROMPT, pil_image])
                if response:
                    logger.info(f"[LLM] ✅ Lectura exitosa con el modelo: {model_name}")
                    break
            except Exception as e:
                last_err = e
                if "404" in str(e):
                    continue
                else:
                    raise e
        
        if not response:
            if last_err:
                raise last_err
            return {}

        raw_text = response.text.strip()
        logger.info(f"[LLM] Respuesta cruda de Gemini: {raw_text[:200]}...")

        # Intentar parsear el JSON de la respuesta
        parsed = _parse_json_response(raw_text)

        if parsed:
            logger.info(f"[LLM] ✅ Gemini extrajo {len([v for v in parsed.values() if v is not None])} campos no nulos.")
        else:
            logger.warning("[LLM] ⚠️ Gemini respondió pero el JSON no pudo parsearse.")

        return parsed or {}

    except Exception as exc:
        logger.error(f"[LLM] ❌ Error al llamar a Gemini: {exc}")
        return {}


def _parse_json_response(text: str) -> Optional[dict]:
    """
    Parsea la respuesta de texto de Gemini intentando extraer el JSON.
    Maneja casos donde el modelo agrega Markdown o texto extra aunque se le pide que no.
    """
    # Intento directo
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Intento por extracción regex de bloque JSON
    json_match = re.search(r"\{[\s\S]*\}", text)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    return None


def normalizar_datos_llm(llm_data: dict) -> dict:
    """
    Normaliza los datos crudos que devolvió el LLM hacia el formato de 'parsed_fields'
    que usa pdf_service.py internamente.

    Convierte los nombres de campo del LLM (snake_case largo) al formato interno del sistema.
    """
    if not llm_data:
        return {}

    normalized = {}

    if llm_data.get("cuit_emisor"):
        normalized["cuit"] = str(llm_data["cuit_emisor"]).replace("-", "").replace(".", "").strip()

    if llm_data.get("razon_social"):
        normalized["razon_social"] = str(llm_data["razon_social"]).strip()

    if llm_data.get("punto_venta") is not None:
        try:
            normalized["punto_venta"] = int(llm_data["punto_venta"])
        except (ValueError, TypeError):
            pass

    if llm_data.get("numero_comprobante") is not None:
        try:
            normalized["numero"] = int(llm_data["numero_comprobante"])
        except (ValueError, TypeError):
            pass

    if llm_data.get("fecha_emision"):
        normalized["fecha"] = str(llm_data["fecha_emision"]).strip()

    if llm_data.get("importe_neto") is not None:
        try:
            normalized["importe_neto"] = float(llm_data["importe_neto"])
        except: pass

    if llm_data.get("iva") is not None:
        try:
            normalized["iva"] = float(llm_data["iva"])
        except: pass

    if llm_data.get("otros_tributos") is not None:
        try:
            normalized["otros_tributos"] = float(llm_data["otros_tributos"])
        except: pass

    if llm_data.get("total") is not None:
        try:
            normalized["total"] = float(llm_data["total"])
        except (ValueError, TypeError):
            pass

    if llm_data.get("moneda"):
        mon = str(llm_data["moneda"]).strip().upper()
        normalized["moneda"] = "USD" if "USD" in mon or "DOL" in mon else "ARS"

    if llm_data.get("cotizacion") is not None:
        try:
            val = float(llm_data["cotizacion"])
            if val > 0:
                normalized["cotizacion"] = val
        except: pass

    if llm_data.get("cae"):
        normalized["cae"] = str(llm_data["cae"]).strip()

    if llm_data.get("tipo_factura"):
        tipo = str(llm_data["tipo_factura"]).strip().upper()
        if tipo in ("A", "B", "C"):
            normalized["tipo_factura"] = tipo

    if llm_data.get("url_qr_afip"):
        url = str(llm_data["url_qr_afip"]).strip()
        if url.lower().startswith("http"):
            normalized["qr_url_from_llm"] = url

    if llm_data.get("cuit_receptor"):
        normalized["cuit_receptor"] = str(llm_data["cuit_receptor"]).replace("-", "").replace(".", "").strip()

    return normalized



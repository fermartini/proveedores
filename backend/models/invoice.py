"""
models/invoice.py
-----------------
Schemas Pydantic para la validación y serialización de datos de facturas AFIP/ARCA.
Pydantic v2 permite validación automática de tipos y generación de JSON Schema.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class InvoiceResult(BaseModel):
    """
    Representa el resultado parseado de una factura PDF de AFIP/ARCA.
    Todos los campos numéricos monetarios son float para soportar decimales.
    Los campos opcionales (Optional) se completan si el PDF los contiene.
    """

    # --- Identificación del archivo ---
    id: Optional[str] = Field(None, description="ID temporal único para manejo en UI")
    filename: str = Field(..., description="Nombre del archivo PDF procesado")


    # --- Datos del emisor ---
    cuit: Optional[str] = Field(None, description="CUIT del emisor (sin guiones, 11 dígitos)")
    razon_social: Optional[str] = Field(None, description="Nombre o razón social del emisor")

    # --- Datos del receptor ---
    cuit_receptor: Optional[str] = Field(None, description="CUIT del receptor")
    company_cuit: Optional[str] = Field(None, description="CUIT de la empresa dueña de la sesión")

    # --- Datos del comprobante ---

    tipo_factura: Optional[str] = Field(None, description="Tipo de comprobante: A, B o C")
    punto_venta: Optional[int] = Field(None, description="Número de punto de venta (4 dígitos)")
    numero: Optional[int] = Field(None, description="Número de factura (8 dígitos)")
    fecha: Optional[str] = Field(None, description="Fecha de emisión en formato DD/MM/AAAA")

    # --- Importes ---
    importe_neto: Optional[float] = Field(None, description="Importe neto gravado (sin IVA)")
    iva: Optional[float] = Field(None, description="Monto de IVA (21%, 10.5%, etc.)")
    otros_tributos: Optional[float] = Field(None, description="Retenciones, percepciones u otros tributos")
    total: Optional[float] = Field(None, description="Importe total del comprobante")
    
    # --- Multimoneda y Notas de Crédito ---
    moneda: str = Field("ARS", description="Moneda: 'ARS' o 'USD'")
    cotizacion: float = Field(1.0, description="Tipo de cambio para conversión a ARS")
    es_credito: bool = Field(False, description="Flag que indica si es Nota de Crédito")

    # --- Autorización AFIP ---
    cae: Optional[str] = Field(None, description="Código de Autorización Electrónica (CAE)")
    qr_link: Optional[str] = Field(None, description="URL del QR con dominio afip.gob.ar corregido")
    descripcion: Optional[str] = Field(None, description="Resumen de los conceptos facturados extraído por IA")

    # --- Campos contables (defaults ERP) ---
    cuenta_contable: str = Field(
        default="Muebles y Útiles",
        description="Cuenta contable asignada por defecto para carga en ERP"
    )
    autorizada: bool = Field(default=True, description="¿Fue autorizada manualmente?")
    pagada: bool = Field(default=False, description="¿Fue pagada?")

    # --- Archivo Adjunto ---
    pdf_base64: Optional[str] = Field(None, description="PDF de 1 sola página codificado en base64 para reemplazar el multipágina original")

    # --- Estado del procesamiento ---
    status: str = Field(
        default="recibida",
        description="Estado del procesamiento: 'recibida' | 'error' | 'sin_qr'"
    )
    error_detail: Optional[str] = Field(
        None,
        description="Detalle del error si el procesamiento falló parcialmente"
    )

    # --- Metadatos ---
    created_at: Optional[str] = Field(
        default_factory=lambda: datetime.utcnow().isoformat(),
        description="Timestamp de creación en ISO 8601 UTC"
    )

    class Config:
        # Permite serializar a dict y JSON cómodamente
        json_encoders = {datetime: lambda v: v.isoformat()}


class InvoiceDBPayload(BaseModel):
    """
    Representa el formato exacto requerido para guardar en la Base de Datos.
    """
    cuit_emisor: Optional[str] = Field(None)
    razon_social: Optional[str] = Field(None)
    punto_venta: Optional[str] = Field(None)
    numero_comprobante: Optional[str] = Field(None)
    fecha_emision: Optional[str] = Field(None)
    total: Optional[float] = Field(None)
    importe_neto: Optional[float] = Field(None)
    iva: Optional[float] = Field(None)
    otros_tributos: Optional[float] = Field(None)
    cae: Optional[str] = Field(None)
    url_qr_afip: Optional[str] = Field(None)
    descripcion: Optional[str] = Field(None)
    cuenta_contable_sugerida: str = Field("Muebles y Útiles")
    estado_autorizacion: bool = Field(True)
    estado_pago: bool = Field(False)
    moneda: str = Field("ARS")
    cotizacion: float = Field(1.0)
    es_credito: bool = Field(False)
    cuit_receptor: Optional[str] = Field(None)
    comentario: Optional[str] = Field(None)
    company_cuit: Optional[str] = Field(None)


"""
models.py
----------
Esquema Pydantic del comprobante de ingreso que se persiste en Firestore.

Colección Firestore: comprobantes_ingreso

Cada documento representa una factura electrónica AFIP/ARCA procesada,
con todos los campos necesarios para el circuito de cuentas a pagar del ERP.
"""

from pydantic import BaseModel, Field
from typing import Optional


class ComprobanteIngreso(BaseModel):
    """
    Modelo de datos de un comprobante de ingreso (factura de proveedor).
    Refleja exactamente la estructura del documento en la colección
    'comprobantes_ingreso' de Firestore.
    """

    # -------------------------------------------------------------------------
    # Identificación del emisor
    # -------------------------------------------------------------------------
    cuit_emisor: str = Field(
        ...,
        description="CUIT del emisor sin guiones (11 dígitos). Ej: '20123456789'."
    )

    razon_social: str = Field(
        ...,
        description="Nombre o razón social del proveedor emisor de la factura."
    )

    # -------------------------------------------------------------------------
    # Datos del comprobante
    # -------------------------------------------------------------------------
    punto_venta: str = Field(
        ...,
        description="Punto de venta con ceros a la izquierda (4 dígitos). Ej: '0001'."
    )

    numero_comprobante: str = Field(
        ...,
        description="Número de factura con ceros a la izquierda (8 dígitos). Ej: '00001234'."
    )

    fecha_emision: str = Field(
        ...,
        description="Fecha de emisión del comprobante en formato DD/MM/AAAA."
    )

    total: float = Field(
        ...,
        description="Importe total del comprobante (incluye IVA). Ej: 1234.56."
    )

    cae: str = Field(
        ...,
        description="Código de Autorización Electrónica emitido por AFIP (14 dígitos)."
    )

    # -------------------------------------------------------------------------
    # Link de verificación QR
    # -------------------------------------------------------------------------
    url_qr_afip: str = Field(
        ...,
        description=(
            "URL de verificación del comprobante en AFIP. "
            # RECORDATORIO: El QR de facturas recientes puede venir con dominio
            # arca.gob.ar (nuevo nombre de AFIP). Antes de guardar, convertir:
            #   https://www.arca.gob.ar/...  →  https://www.afip.gob.ar/...
            # Ver: services/qr_service.py → función fix_arca_domain()
            "Si el QR usa el dominio arca.gob.ar, debe convertirse a afip.gob.ar "
            "antes de persistir. Valores posibles: URL válida | 'NO TIENE' | 'NO SE PUEDE LEER'."
        )
    )

    # -------------------------------------------------------------------------
    # Campos contables y de estado (con defaults del ERP)
    # -------------------------------------------------------------------------
    cuenta_contable_sugerida: str = Field(
        default="Muebles y Útiles",
        description=(
            "Cuenta contable del plan de cuentas sugerida para este comprobante. "
            "Por defecto 'Muebles y Útiles'. Editable desde el frontend."
        )
    )

    estado_autorizacion: bool = Field(
        default=False,
        description=(
            "Indica si el comprobante fue verificado y autorizado manualmente "
            "en el sistema contable. Por defecto False (pendiente de revisión)."
        )
    )

    estado_pago: bool = Field(
        default=False,
        description=(
            "Indica si la factura fue efectivamente pagada al proveedor. "
            "Por defecto False (pendiente de pago)."
        )
    )

    # -------------------------------------------------------------------------
    # Campos opcionales de soporte
    # -------------------------------------------------------------------------
    nombre_archivo: Optional[str] = Field(
        default=None,
        description="Nombre original del archivo PDF procesado (para trazabilidad)."
    )

    class Config:
        # Permite serializar a dict con model.model_dump()
        populate_by_name = True

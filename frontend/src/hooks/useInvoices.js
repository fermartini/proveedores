/**
 * hooks/useInvoices.js
 * --------------------
 * Hook personalizado que centraliza toda la lógica de estado de facturas.
 *
 * Gestiona:
 *   - Estado local: lista de facturas, loading, error, progreso de upload.
 *   - Listener de Firestore en tiempo real (si Firebase está configurado).
 *   - Llamada a la API de upload.
 *   - Estadísticas derivadas (total, suma de importes, etc.).
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { uploadInvoices, confirmInvoices } from "../services/api";

export const useInvoices = () => {
  // --- Estado principal ---
  const [invoices, setInvoices] = useState([]);        // Lista de facturas
  const [uploading, setUploading] = useState(false);   // ¿Hay un upload en curso?
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [error, setError] = useState(null);            // Mensaje de error

  // La suscripción a Firestore en tiempo real fue removida porque ahora 
  // las facturas se mantienen en memoria hasta que el usuario decida Confirmarlas.

  // ---------------------------------------------------------------------------
  // handleUpload — Procesar nuevos PDFs
  // ---------------------------------------------------------------------------
  /**
   * Sube archivos al backend y actualiza el estado local con los resultados.
   * Si Firestore está activo, los datos también llegarán vía el listener.
   *
   * @param {File[]} files - Array de archivos PDF a procesar.
   */
  const handleUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const results = await uploadInvoices(files, (percent) => {
        setUploadProgress(percent);
      });

      // Agregar resultados al estado local. 
      // Usamos el ID único (filename + index) para no perder facturas del mismo archivo.
      setInvoices((prev) => {
        const newResults = results || [];
        // Filtramos prev para quitar los que tengan el mismo ID que los nuevos resultados (reemplazo)
        const newIds = new Set(newResults.map(r => r.id));
        return [...newResults, ...prev.filter(inv => !newIds.has(inv.id))];
      });


    } catch (err) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Error al procesar los archivos. Verificá que el servidor esté corriendo.";
      setError(message);
      console.error("[useInvoices] Error en upload:", err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // handleConfirm — Enviar facturas a base de datos
  // ---------------------------------------------------------------------------
  const handleConfirm = useCallback(async (mode = "valid_only") => {
    setUploading(true);
    setError(null);

    // Seleccionamos las facturas según la elección del usuario
    const invoicesToSubmit = mode === "all" 
      ? invoices 
      : invoices.filter((inv) => inv.status === "procesado");
    
    if (invoicesToSubmit.length === 0) {
      setError(mode === "all" ? "No hay facturas para confirmar." : "No hay facturas válidas para confirmar.");
      setUploading(false);
      return;
    }

    // Mapeamos el modelo al Payload exacto de la DB requirido por el cliente
    const payloads = invoicesToSubmit.map((inv) => ({
      cuit_emisor: inv.cuit ? String(inv.cuit) : null,
      razon_social: inv.razon_social ?? null,
      punto_venta: inv.punto_venta ? String(inv.punto_venta) : null,
      numero_comprobante: inv.numero ? String(inv.numero) : null,
      fecha_emision: inv.fecha ?? null,
      total: inv.total ?? null,
      cae: inv.cae ?? null,
      // NOTA: Acá pasamos la URL del QR, el backend de python la corrige 
      // y la convierte a afip si era de ARCA.
      url_qr_afip: inv.qr_link ?? null,
      cuenta_contable_sugerida: "Muebles y Útiles",
      estado_autorizacion: false,
      estado_pago: false,
    }));

    try {
      const { confirmInvoices } = await import("../services/api");
      const result = await confirmInvoices(payloads);
      
      // Limpiar la tabla porque ya se enviaron con éxito a la nube
      setInvoices([]);
      alert(`¡Éxito! Se subieron ${result.saved_count} facturas a la Base de Datos.`);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || "Hubo un error guardando las facturas en la base de datos.";
      setError(detail);
      console.error("[useInvoices] Error en confirm:", err);
    } finally {
      setUploading(false);
    }
  }, [invoices]);

  // ---------------------------------------------------------------------------
  // clearError
  // ---------------------------------------------------------------------------
  const clearError = useCallback(() => setError(null), []);

  // ---------------------------------------------------------------------------
  // removeInvoice — Eliminar una factura del estado local antes de confirmarla
  // ---------------------------------------------------------------------------
  const removeInvoice = useCallback((id) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }, []);

  // ---------------------------------------------------------------------------
  // Estadísticas derivadas
  // ---------------------------------------------------------------------------
  const stats = {
    totalFacturas: invoices.length,
    totalImporte: invoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0),
    pendientesPago: invoices.filter((inv) => !inv.pagada).length,
    procesadas: invoices.filter((inv) => inv.status === "procesado").length,
    errores: invoices.filter((inv) => inv.status === "error").length,
  };

  return {
    invoices,
    uploading,
    uploadProgress,
    error,
    stats,
    handleUpload,
    handleConfirm,
    clearError,
    removeInvoice,
  };
};

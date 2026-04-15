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

      // Agregar resultados al estado local inmediatamente (sin esperar Firestore)
      // Firestore los sobreescribirá cuando el listener notifique el cambio.
      setInvoices((prev) => {
        // Evitar duplicados si Firestore ya los agregó
        const existingFilenames = new Set(prev.map((inv) => inv.filename));
        const newResults = results.filter(
          (r) => !existingFilenames.has(r.filename)
        );
        return [...results, ...prev.filter(
          (inv) => !results.find((r) => r.filename === inv.filename)
        )];
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
  const handleConfirm = useCallback(async () => {
    setUploading(true);
    setError(null);

    // Filtramos solo las que están en estado procesado
    const validInvoices = invoices.filter((inv) => inv.status === "procesado");
    
    if (validInvoices.length === 0) {
      setError("No hay facturas válidas para confirmar.");
      setUploading(false);
      return;
    }

    // Mapeamos el modelo al Payload exacto de la DB requirido por el cliente
    const payloads = validInvoices.map((inv) => ({
      cuit_emisor: String(inv.cuit ?? ""),
      razon_social: inv.razon_social,
      punto_venta: String(inv.punto_venta ?? ""),
      numero_comprobante: String(inv.numero ?? ""),
      fecha_emision: inv.fecha,
      total: inv.total,
      cae: inv.cae,
      // NOTA: Acá pasamos la URL del QR, el backend de python la corrige 
      // y la convierte a afip si era de ARCA.
      url_qr_afip: inv.qr_link,
      cuenta_contable_sugerida: "Muebles y Útiles",
      estado_autorizacion: false,
      estado_pago: false,
    }));

    try {
      const result = await confirmInvoices(payloads);
      
      // Limpiar la tabla porque ya se enviaron con éxito a la nube
      setInvoices([]);
      alert(`¡Éxito! Se subieron ${result.saved_count} facturas a la Base de Datos.`);
    } catch (err) {
      setError("Hubo un error guardando las facturas en la base de datos.");
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
  // Estadísticas derivadas (memoizadas implícitamente por ser derivadas del estado)
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
  };
};

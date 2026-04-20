/**
 * context/InvoiceContext.jsx
 * --------------------------
 * Contexto global para manejar las facturas procesadas y sus archivos binarios (Blobs).
 * Esto permite navegar entre la lista y la vista de verificación sin perder el estado.
 */

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { 
  uploadInvoices as apiUploadInvoices, 
  confirmInvoices as apiConfirmInvoices,
  getInvoices as apiGetDashboardInvoices,
  updateInvoice as apiUpdateDashboardInvoice
} from "../services/api";
import { useAuth } from "./AuthContext";

const InvoiceContext = createContext();

export const useInvoiceContext = () => {
  const context = useContext(InvoiceContext);
  if (!context) {
    throw new Error("useInvoiceContext debe usarse dentro de un InvoiceProvider");
  }
  return context;
};

export const InvoiceProvider = ({ children }) => {
  const { cuit } = useAuth();
  const [invoices, setInvoices] = useState([]); // Sesión de carga actual
  const [dashboardInvoices, setDashboardInvoices] = useState([]); // Historial DB
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  
  // Mapeo de ID de factura a Blob URL del PDF
  const [fileMap, setFileMap] = useState({});

  // 1. Fetch Historial
  const fetchDashboardInvoices = useCallback(async () => {
    setDbLoading(true);
    try {
      const data = await apiGetDashboardInvoices(cuit);
      setDashboardInvoices(data);
    } catch (err) {
      console.error("Error al cargar historial:", err);
    } finally {
      setDbLoading(false);
    }
  }, [cuit]);

  useEffect(() => {
    fetchDashboardInvoices();
  }, [fetchDashboardInvoices]);

  // 2. Upload
  const handleUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const results = await apiUploadInvoices(files, cuit, (percent) => {
        setUploadProgress(percent);
      });

      const newFileMap = { ...fileMap };
      const fileByFilename = {};
      files.forEach(f => { fileByFilename[f.name] = URL.createObjectURL(f); });

      const processedResults = results.map(res => {
        if (res.pdf_base64) {
          // Si el backend devolvió el PDF/Imagen específico pre-recortado
          const isPdf = res.filename?.toLowerCase().endsWith('.pdf');
          const mimeType = isPdf ? "application/pdf" : "image/jpeg";
          const byteCharacters = atob(res.pdf_base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });
          newFileMap[res.id] = URL.createObjectURL(blob);
        } else {
          // Fallback a archivo original si no vino base64
          const blobUrl = fileByFilename[res.filename];
          if (blobUrl) { newFileMap[res.id] = blobUrl; }
        }
        return res;
      });

      setFileMap(newFileMap);
      setInvoices((prev) => {
        const newIds = new Set(processedResults.map(r => r.id));
        return [...processedResults, ...prev.filter(inv => !newIds.has(inv.id))];
      });

    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Error al subir archivos.");
    } finally {
      setUploading(false);
    }
  }, [fileMap, cuit]);

  // 3. Confirm
  const handleConfirm = useCallback(async (mode = "valid_only") => {
    setUploading(true);
    const toSubmit = mode === "all" ? invoices : invoices.filter(i => i.status === "recibida");
    
    const payloads = toSubmit.map(inv => ({
      cuit_emisor: inv.cuit ? String(inv.cuit) : null,
      razon_social: inv.razon_social ?? null,
      punto_venta: inv.punto_venta ? String(inv.punto_venta) : null,
      numero_comprobante: inv.numero ? String(inv.numero) : null,
      fecha_emision: inv.fecha ?? null,
      importe_neto: inv.importe_neto ?? null,
      iva: inv.iva ?? null,
      otros_tributos: inv.otros_tributos ?? null,
      total: inv.total ?? null,
      cae: inv.cae ?? null,
      url_qr_afip: inv.qr_link ?? null,
      cuenta_contable_sugerida: inv.cuenta_contable ?? "Muebles y Útiles",
      estado_autorizacion: inv.autorizada ?? true,
      estado_pago: inv.pagada ?? false,
      moneda: inv.moneda ?? "ARS",
      cotizacion: inv.cotizacion ?? 1.0,
      es_credito: inv.es_credito ?? false,
      cuit_receptor: inv.cuit_receptor ?? null,
      comentario: inv.comentario ?? null,
      company_cuit: cuit || null
    }));

    try {
      await apiConfirmInvoices(payloads);
      setInvoices([]);
      setFileMap({});
      fetchDashboardInvoices(); // Refrescar historial
      alert("Facturas guardadas con éxito.");
    } catch (err) {
      setError(err?.message || "Error al confirmar.");
    } finally {
      setUploading(false);
    }
  }, [invoices, fetchDashboardInvoices, cuit]);

  const removeInvoice = useCallback((id) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateInvoice = useCallback((id, fields) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...fields } : i));
  }, []);

  // 4. Update Dashboard Field (Sync)
  const toggleDashboardField = useCallback(async (docId, field, currentValue) => {
    const newValue = !currentValue;
    setDashboardInvoices(prev => prev.map(inv => inv.id === docId ? { ...inv, [field]: newValue } : inv));
    try {
      await apiUpdateDashboardInvoice(docId, field, newValue);
    } catch (err) {
      setDashboardInvoices(prev => prev.map(inv => inv.id === docId ? { ...inv, [field]: currentValue } : inv));
      console.error(err);
    }
  }, []);

  const updateDashboardComment = useCallback(async (docId, text) => {
    setDashboardInvoices(prev => prev.map(inv => inv.id === docId ? { ...inv, comentario: text } : inv));
    try {
      await apiUpdateDashboardInvoice(docId, "comentario", text);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const stats = {
    totalFacturas: invoices.length,
    totalImporte: invoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0),
    pendientesPago: invoices.filter(i => !i.pagada).length,
    procesadas: invoices.filter(i => i.status === "procesado").length,
    errores: invoices.filter(i => i.status === "error").length,
    dashboardStats: {
      total: dashboardInvoices.length,
      pagadas: dashboardInvoices.filter(i => i.pagada).length,
      importeTotal: dashboardInvoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0)
    }
  };

  return (
    <InvoiceContext.Provider value={{
      invoices, uploading, uploadProgress, error, stats,
      dashboardInvoices, dbLoading, 
      fileMap,
      handleUpload, handleConfirm, removeInvoice, updateInvoice,
      fetchDashboardInvoices, toggleDashboardField, updateDashboardComment,
      clearError: () => setError(null)
    }}>
      {children}
    </InvoiceContext.Provider>
  );
};

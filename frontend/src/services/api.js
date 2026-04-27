/**
 * services/api.js
 * ---------------
 * Cliente HTTP para comunicación con el backend FastAPI.
 *
 * Todas las llamadas a la API pasan por este módulo para:
 * - Centralizar la URL base (configurable vía env).
 * - Unificar el manejo de errores HTTP.
 * - Facilitar mock/testing.
 */

import axios from "axios";

// URL base del backend — configurable via .env (VITE_API_URL)
export const BASE_URL = import.meta.env.VITE_API_URL || "https://khalldragon-api-facturas-mas.hf.space";

// Instancia de axios con config base
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 300_000, // 5 minutos para procesamiento masivo de PDFs
});

// ---------------------------------------------------------------------------
// uploadInvoices — POST /api/upload
// ---------------------------------------------------------------------------
/**
 * Sube múltiples archivos PDF al backend para su procesamiento.
 *
 * @param {File[]} files - Array de objetos File (PDF).
 * @param {string} empresa_cuit - CUIT de la empresa auth.
 * @param {function} onProgress - Callback de progreso (0-100).
 * @returns {Promise<InvoiceResult[]>} Array de resultados procesados.
 */
export const uploadInvoices = async (files, empresa_cuit, onProgress) => {
  const formData = new FormData();

  // Agregar cada archivo con el mismo campo "files" (FastAPI List[UploadFile])
  files.forEach((file) => {
    formData.append("files", file);
  });

  if (empresa_cuit) {
    formData.append("empresa_cuit", empresa_cuit);
  }

  const response = await apiClient.post("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return response.data;
};

// ---------------------------------------------------------------------------
// getInvoices — GET /api/invoices (fallback si Firestore no está configurado)
// ---------------------------------------------------------------------------
/**
 * Obtiene todas las facturas desde el backend.
 * Usar este endpoint si Firebase no está configurado en el frontend.
 */
export const getInvoices = async (empresa_cuit) => {
  const params = empresa_cuit ? { empresa_cuit } : {};
  const response = await apiClient.get("/api/invoices", { params });
  return response.data.invoices ?? [];
};

// ---------------------------------------------------------------------------
// confirmInvoices — POST /api/confirm
// ---------------------------------------------------------------------------
/**
 * Envía un arreglo de facturas mapeadas para guardarse en Firestore.
 *
 * @param {Object[]} payloads - Array de InvoiceDBPayload
 */
export const confirmInvoices = async (payloads) => {
  const response = await apiClient.post("/api/confirm", payloads);
  return response.data;
};

// ---------------------------------------------------------------------------
// updateInvoice — PATCH /api/invoices/:id
// ---------------------------------------------------------------------------
/**
 * Actualiza uno o varios campos de una factura vía el backend.
 *
 * @param {string} docId - ID del documento.
 * @param {object} data - Objeto con los campos a actualizar (e.g. { autorizada: true, razon_social: "Nuevo Nombre" }).
 */
export const updateInvoice = async (docId, data) => {
  const response = await apiClient.patch(`/api/invoices/${docId}`, data);
  return response.data;
};

// ---------------------------------------------------------------------------
// deleteInvoice — DELETE /api/invoices/:id
// ---------------------------------------------------------------------------
/**
 * Elimina una factura de la base de datos.
 */
export const deleteInvoice = async (docId) => {
  const response = await apiClient.delete(`/api/invoices/${docId}`);
  return response.data;
};

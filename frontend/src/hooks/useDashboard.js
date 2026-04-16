/**
 * hooks/useDashboard.js
 * ---------------------
 * Hook para el dashboard de facturas persistidas en Firestore.
 * Maneja fetch, filtrado, y actualización de campos (pagada, autorizada).
 */

import { useState, useEffect, useCallback } from "react";
import { getInvoices, updateInvoice } from "../services/api";

export const useDashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null); // ID del doc que está siendo actualizado

  // ---------------------------------------------------------------------------
  // fetchInvoices — Obtener todas las facturas desde el backend/Firestore
  // ---------------------------------------------------------------------------
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (err) {
      setError("Error al cargar las facturas desde la base de datos.");
      console.error("[useDashboard] Error al obtener facturas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // ---------------------------------------------------------------------------
  // toggleField — Cambiar pagada o autorizada de una factura
  // ---------------------------------------------------------------------------
  const toggleField = useCallback(async (docId, field, currentValue) => {
    setUpdatingId(docId);
    const newValue = !currentValue;

    // Optimistic update
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === docId ? { ...inv, [field]: newValue } : inv
      )
    );

    try {
      await updateInvoice(docId, field, newValue);
    } catch (err) {
      // Revertir si falla
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === docId ? { ...inv, [field]: currentValue } : inv
        )
      );
      setError(`Error al actualizar el campo "${field}".`);
      console.error("[useDashboard] Error al actualizar:", err);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Estadísticas del dashboard
  // ---------------------------------------------------------------------------
  const stats = {
    total: invoices.length,
    pagadas: invoices.filter((i) => i.pagada).length,
    pendientesPago: invoices.filter((i) => !i.pagada).length,
    autorizadas: invoices.filter((i) => i.autorizada).length,
    totalImporte: invoices.reduce((s, i) => s + (i.total ?? 0), 0),
    importePagado: invoices
      .filter((i) => i.pagada)
      .reduce((s, i) => s + (i.total ?? 0), 0),
  };

  return {
    invoices,
    loading,
    error,
    updatingId,
    stats,
    fetchInvoices,
    toggleField,
  };
};

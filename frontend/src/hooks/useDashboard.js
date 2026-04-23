import { useMemo } from "react";
import { useInvoiceContext } from "../context/InvoiceContext";

export const useDashboard = () => {
  const { 
    dashboardInvoices, dbLoading, error, 
    fetchDashboardInvoices, toggleDashboardField, updateDashboardComment,
    updateDashboardInvoice, deleteDashboardInvoice
  } = useInvoiceContext();

  // Mapeamos los nombres para mantener compatibilidad con el componente DashboardPage
  const stats = useMemo(() => {
    const total = dashboardInvoices.length;
    const pagadas = dashboardInvoices.filter((i) => i.pagada).length;
    const pendientesPago = total - pagadas;
    const autorizadas = dashboardInvoices.filter((i) => i.autorizada).length;
    const totalImporte = dashboardInvoices.reduce((s, i) => s + (i.total ?? 0), 0);
    const importePagado = dashboardInvoices
      .filter((i) => i.pagada)
      .reduce((s, i) => s + (i.total ?? 0), 0);

    return { total, pagadas, pendientesPago, autorizadas, totalImporte, importePagado };
  }, [dashboardInvoices]);

  return {
    invoices: dashboardInvoices,
    loading: dbLoading,
    error,
    updatingId: null, // El context maneja el estado de carga por campo ahora
    stats,
    fetchInvoices: fetchDashboardInvoices,
    toggleField: toggleDashboardField,
    updateComment: updateDashboardComment,
    updateInvoice: updateDashboardInvoice,
    deleteInvoice: deleteDashboardInvoice,
  };
};

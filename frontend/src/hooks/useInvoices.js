/**
 * hooks/useInvoices.js
 * --------------------
 * Hook puente que expone el InvoiceContext global.
 * Mantiene compatibilidad con los componentes existentes.
 */

import { useInvoiceContext } from "../context/InvoiceContext";

export const useInvoices = () => {
  return useInvoiceContext();
};

/**
 * components/VerificationPage.jsx
 * ------------------------------
 * Vista de pantalla completa dividida (Split-Screen).
 * Izquierda: PDFViewer.
 * Derecha: VerificationPanel.
 */

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, ShieldCheck } from "lucide-react";
import { useInvoices } from "../hooks/useInvoices";
import PDFViewer from "./PDFViewer";
import VerificationPanel from "./VerificationPanel";

export default function VerificationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, fileMap, updateInvoice } = useInvoices();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    const found = invoices.find(inv => inv.id === id);
    if (found) {
      setInvoice(found);
    } else {
      // Si no existe, volvemos al inicio.
      // Opcionalmente podrías buscar en Firestore si el flujo fuera distinto.
      console.warn(`Factura con id ${id} no encontrada en la sesión.`);
    }
  }, [id, invoices]);

  const pdfUrl = fileMap[id] || null;

  return (
    <div className="fixed inset-0 z-50 bg-main flex flex-col h-full overflow-hidden">
      
      {/* Mini Header de Navegación */}
      <div className="h-16 bg-surface border-b border-base text-main flex items-center px-8 justify-between no-print shadow-sm">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-3 text-xs font-black text-dim hover:text-brand-primary transition-all uppercase tracking-[0.2em]"
        >
          <ArrowLeft size={16} />
          Volver al panel
        </button>

        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck size={16} className="text-emerald-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Protocolo de Verificación Segura</span>
        </div>

        <button 
          onClick={() => {
            updateInvoice(id, { pagada: true });
            navigate(-1);
          }}
          className="btn-success px-6 shadow-lg shadow-emerald-500/20"
        >
          <Save size={16} />
          Finalizar Auditoría
        </button>
      </div>

      {/* Contenedor Split-Screen */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Lado Izquierdo: PDF */}
        <section className="flex-1 min-h-[40vh] lg:h-full border-b lg:border-b-0 lg:border-r border-base bg-surface/30">
           <PDFViewer 
             pdfUrl={pdfUrl} 
             filename={invoice?.filename} 
           />
        </section>

        {/* Lado Derecho: Datos */}
        <section className="w-full lg:w-[520px] h-[60vh] lg:h-full flex-shrink-0 bg-surface no-print lg:shadow-[-20px_0_40px_rgba(0,0,0,0.1)] z-10">
          <VerificationPanel invoice={invoice} />
        </section>

      </div>

      <style>
        {`
          @media print {
              .no-print {
                  display: none !important;
              }
          }
        `}
      </style>
    </div>
  );
}

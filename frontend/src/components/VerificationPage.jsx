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
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col h-full overflow-hidden">
      
      {/* Mini Header de Navegación */}
      <div className="h-12 bg-slate-900 border-b border-white text-white flex items-center px-4 justify-between no-print">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          Volver a la lista
        </button>

        <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Modo Verificación Segura</span>
        </div>

        <button 
          onClick={() => {
            updateInvoice(id, { pagada: true });
            navigate(-1);
          }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-[10px] font-bold transition-all uppercase"
        >
          <Save size={12} />
          Confirmar y Cerrar
        </button>
      </div>

      {/* Contenedor Split-Screen */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Lado Izquierdo: PDF */}
        <section className="flex-1 h-full border-r border-slate-800">
           <PDFViewer 
             pdfUrl={pdfUrl} 
             filename={invoice?.filename} 
           />
        </section>

        {/* Lado Derecho: Datos */}
        <section className="w-[480px] h-full flex-shrink-0 bg-slate-900 no-print shadow-2xl z-10">
          <VerificationPanel invoice={invoice} />
        </section>

      </div>

      <style jsx>{`
        @media print {
            .no-print {
                display: none !important;
            }
        }
      `}</style>
    </div>
  );
}

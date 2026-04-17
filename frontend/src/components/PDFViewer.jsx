/**
 * components/PDFViewer.jsx
 * ------------------------
 * Visor de PDF embebido con barra de herramientas y función de impresión.
 */

import { Printer, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { useRef } from "react";

export default function PDFViewer({ pdfUrl, filename }) {
  const iframeRef = useRef(null);

  const handlePrint = () => {
    if (iframeRef.current) {
      // Invocamos la impresión nativa del navegador.
      // El CSS @media print en index.css se encargará de mostrar solo el visor.
      window.print();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 no-print">
      {/* Barra de herramientas */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center">
            <Maximize2 size={16} className="text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-none">Visor de Documento</h3>
            <p className="text-[10px] text-slate-500 font-mono mt-1">{filename}</p>
          </div>
        </div>
      </div>

      {/* Contenedor del PDF */}
      <div className="flex-1 relative bg-slate-800 printable-content">
        {pdfUrl ? (
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
            className="w-full h-full border-none"
            title="Factura PDF"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border-2 border-dashed border-slate-800">
               <Printer size={24} />
            </div>
            <p className="text-sm font-medium">No se pudo cargar la vista previa del archivo</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .printable-content {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 9999 !important;
            background: white !important;
          }
          iframe {
            width: 100% !important;
            height: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

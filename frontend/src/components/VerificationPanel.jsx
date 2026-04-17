/**
 * components/VerificationPanel.jsx
 * --------------------------------
 * Panel derecho de la vista de verificación.
 * Muestra los datos extraídos en formato grande y legible, con botones de copia.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, QrCode as QrIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const textToCopy = value?.toString() || "";
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copiar ${label}`}
      className={`
        p-2 rounded-xl transition-all duration-200
        ${copied 
          ? "bg-emerald-500/20 text-emerald-400" 
          : "bg-slate-800 text-slate-500 hover:text-brand-400 hover:bg-slate-700"
        }
      `}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
          >
            <Check size={18} />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
          >
            <Copy size={18} />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

function DataField({ label, value, copyValue, large = false }) {
  return (
    <div className="space-y-2 group">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
      <div className="flex items-center justify-between gap-4">
        <p className={`
          text-white font-bold leading-none
          ${large ? "text-4xl" : "text-2xl"}
        `}>
          {value || "—"}
        </p>
        <CopyButton value={copyValue || value} label={label} />
      </div>
    </div>
  );
}

export default function VerificationPanel({ invoice }) {
  if (!invoice) return null;

  const formatARS = (v) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(v ?? 0);

  return (
    <div className="h-full bg-slate-900 p-10 overflow-y-auto space-y-10">
      <header className="border-b border-slate-800 pb-6">
        <h2 className="text-sm font-black text-brand-500 uppercase tracking-[0.2em]">Panel de Verificación</h2>
        <p className="text-slate-400 text-sm mt-1">Valide la información extraída del documento</p>
      </header>

      {/* Sección QR - AHORA ARRIBA */}
      <section>
        <div className="bg-slate-800/40 rounded-3xl p-8 flex flex-col items-center gap-6 border border-slate-800">
          <div className="flex items-center gap-3 self-start mb-2">
            <QrIcon size={20} className="text-brand-500" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Código QR AFIP</h3>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-2xl shadow-black/50">
            {invoice.qr_link ? (
              <QRCodeSVG 
                value={invoice.qr_link} 
                size={220}
                level="H"
                includeMargin={true}
              />
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center text-slate-300 italic text-sm text-center px-4">
                No se detectó enlace de QR en esta factura
              </div>
            )}
          </div>

          <div className="w-full flex items-center justify-between bg-slate-900/60 px-5 py-4 rounded-2xl border border-slate-700/50 mt-4">
            <div className="truncate pr-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Enlace del QR</p>
              <p className="text-xs text-slate-400 truncate font-mono">{invoice.qr_link || "—"}</p>
            </div>
            <CopyButton value={invoice.qr_link} label="Link de QR" />
          </div>
        </div>
      </section>

      <div className="divider-gradient" />

      {/* Grid de Datos Reorganizado */}
      <div className="space-y-10">
        {/* 1. Razón Social */}
        <DataField label="Proveedor / Razón Social" value={invoice.razon_social} />
        
        {/* 2. CUIT emisor */}
        <div className="pt-4 border-t border-slate-800/50">
          <DataField label="CUIT Emisor" value={invoice.cuit} />
        </div>

        {/* 3. Punto de Venta y Número (Mismo renglón) */}
        <div className="grid grid-cols-2 gap-10 pt-4 border-t border-slate-800/50">
          <DataField label="Punto de Venta" value={invoice.punto_venta ? String(invoice.punto_venta).padStart(4, "0") : "—"} />
          <DataField label="Número de Factura" value={invoice.numero ? String(invoice.numero).padStart(8, "0") : "—"} />
        </div>

        {/* 4. Fecha de Emisión */}
        <div className="pt-4 border-t border-slate-800/50">
          <DataField label="Fecha de Emisión" value={invoice.fecha} />
        </div>

        {/* 5. Importe Total (Conversión Automática si es USD) */}
        <div className="pt-6 border-t-2 border-brand-500/20">
          {invoice.moneda === "USD" ? (
            <div className="space-y-3">
              <DataField 
                label={`Importe Total (ARS) - T.C. ${invoice.cotizacion}`}
                value={formatARS(invoice.total * invoice.cotizacion)} 
                copyValue={(invoice.total * invoice.cotizacion).toFixed(2).replace(".", ",")}
                large 
              />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-800/50 px-3 py-1.5 rounded-lg inline-block">
                Original: <span className="text-blue-400">USD {invoice.total?.toFixed(2)}</span>
              </p>
            </div>
          ) : (
            <DataField 
              label="Importe Total" 
              value={formatARS(invoice.total)} 
              copyValue={invoice.total ? invoice.total.toFixed(2).replace(".", ",") : ""}
              large 
            />
          )}
        </div>
      </div>
      
      <footer className="pt-10 text-center opacity-30">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            FacturaScan v1.0 · Verificación Manual
          </p>
      </footer>
    </div>
  );
}

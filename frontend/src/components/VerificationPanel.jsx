/* eslint-disable no-unused-vars */
/**
 * components/VerificationPanel.jsx
 * --------------------------------
 * Panel derecho de la vista de verificación.
 * Muestra los datos extraídos en formato grande y legible, con botones de copia.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, QrCode as QrIcon, ShieldCheck } from "lucide-react";
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
        w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border shadow-sm
        ${copied 
          ? "bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20" 
          : "bg-surface border-base text-dim hover:text-brand-primary hover:border-brand-primary"
        }
      `}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
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
    <div className="space-y-3 group">
      <p className="text-[10px] font-black text-dim uppercase tracking-[0.2em]">{label}</p>
      <div className="flex items-center justify-between gap-6">
        <p className={`
          text-main font-black leading-none tracking-tight
          ${large ? "text-5xl" : "text-2xl"}
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
    <div className="h-full bg-surface p-12 overflow-y-auto space-y-12 custom-scrollbar">
      <header className="border-b border-base pb-8">
        <div className="flex items-center gap-3 mb-2">
           <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck size={16} className="text-white" />
           </div>
           <h2 className="text-xs font-black text-brand-primary uppercase tracking-[0.3em]">Auditoría de Datos</h2>
        </div>
        <p className="text-dim text-sm font-medium">Verifique la integridad de la información procesada</p>
      </header>

      {/* Sección QR */}
      <section>
        <div className="bg-surface border border-base rounded-[32px] p-8 flex flex-col items-center gap-8 shadow-xl shadow-black/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
            <QrIcon size={80} />
          </div>

          <div className="flex items-center gap-3 self-start mb-2 relative z-10">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <QrIcon size={18} className="text-brand-primary" />
            </div>
            <h3 className="text-[10px] font-black text-main uppercase tracking-[0.2em]">Enlace AFIP</h3>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-indigo-500/10 border border-indigo-500/5 relative z-10 transition-transform hover:scale-105 duration-500">
            {invoice.qr_link ? (
              <QRCodeSVG 
                value={invoice.qr_link} 
                size={220}
                level="H"
                includeMargin={true}
              />
            ) : (
              <div className="w-[220px] h-[220px] flex items-center justify-center text-muted italic text-xs text-center px-6 leading-relaxed">
                El motor de extracción no detectó un código QR válido en este documento.
              </div>
            )}
          </div>

          <div className="w-full flex items-center justify-between bg-surface-hover/50 px-6 py-5 rounded-2xl border border-base relative z-10">
            <div className="truncate pr-6">
              <p className="text-[9px] text-dim font-black uppercase tracking-widest mb-1.5 opacity-60">Dirección de Destino</p>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 truncate font-black tracking-tight">{invoice.qr_link || "Sin enlace disponible"}</p>
            </div>
            <CopyButton value={invoice.qr_link} label="Link de QR" />
          </div>
        </div>
      </section>

      {/* Grid de Datos Reorganizado */}
      <div className="space-y-12">
        {/* 1. Razón Social */}
        <DataField label="Entidad / Proveedor" value={invoice.razon_social} />
        
        {/* 2. CUIT emisor */}
        <div className="pt-8 border-t border-base">
          <DataField label="Identificación Tributaria (CUIT)" value={invoice.cuit} />
        </div>

        {/* 3. Punto de Venta y Número (Mismo renglón) */}
        <div className="grid grid-cols-2 gap-12 pt-8 border-t border-base">
          <DataField label="Punto Vta" value={invoice.punto_venta ? String(invoice.punto_venta).padStart(4, "0") : "—"} />
          <DataField label="Número" value={invoice.numero ? String(invoice.numero).padStart(8, "0") : "—"} />
        </div>

        {/* 4. Fecha de Emisión */}
        <div className="pt-8 border-t border-base">
          <DataField label="Fecha de Registro" value={invoice.fecha} />
        </div>

        {/* 5. Importe Total (Conversión Automática si es USD) */}
        <div className="pt-10 border-t-4 border-brand-primary">
          {invoice.moneda === "USD" ? (
            <div className="space-y-4">
              <DataField 
                label={`Importe Liquidado (ARS) · T.C. ${invoice.cotizacion}`}
                value={formatARS(invoice.total * invoice.cotizacion)} 
                copyValue={(invoice.total * invoice.cotizacion).toFixed(2).replace(".", ",")}
                large 
              />
              <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Original: USD {invoice.total?.toFixed(2)}
              </div>
            </div>
          ) : (
            <DataField 
              label="Importe Total Liquidado" 
              value={formatARS(invoice.total)} 
              copyValue={invoice.total ? invoice.total.toFixed(2).replace(".", ",") : ""}
              large 
            />
          )}
        </div>
      </div>
      
      <footer className="pt-12 text-center opacity-40">
          <p className="text-[10px] text-dim font-black uppercase tracking-[0.3em]">
            Central Asset Control · v2.0 · Gold Integrity
          </p>
      </footer>
    </div>
  );
}

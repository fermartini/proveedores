/**
 * components/InvoiceRow.jsx
 * -------------------------
 * Fila de la tabla de facturas con botones de copia al portapapeles.
 *
 * Botones de copia disponibles:
 *   - Link AFIP (URL del QR corregida)
 *   - CAE (código de autorización)
 *   - Descripción completa (Razón Social + Nro + Fecha)
 *
 * Cada botón muestra feedback visual "¡Copiado!" durante 2 segundos.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, ExternalLink, FileText, Building2, WifiOff, QrCode, Trash2, Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import { useInvoiceContext } from "../context/InvoiceContext";
import EditInvoiceModal from "./EditInvoiceModal";
import { Pencil } from "lucide-react";

// Valores sentinel del QR que vienen del backend
const QR_NO_TIENE          = "NO TIENE";
const QR_NO_SE_PUEDE_LEER  = "NO SE PUEDE LEER";

/** Devuelve true si el qr_link es una URL real copêble */
const isValidQrUrl = (url) =>
  url && url.startsWith("http");

/** Devuelve el label y estilo del sentinel de QR */
const qrSentinelInfo = (url) => {
  if (url === QR_NO_TIENE)
    return { label: "Sin QR",        color: "text-slate-500", icon: QrCode };
  if (url === QR_NO_SE_PUEDE_LEER)
    return { label: "No se lee",     color: "text-amber-500", icon: WifiOff };
  return null;
};

/**
 * Botón de copia reutilizable con feedback visual.
 */
function CopyButton({ id, value, label, icon: Icon = Copy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para entornos sin clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      id={id}
      onClick={handleCopy}
      disabled={!value}
      title={value ? `Copiar ${label}` : `${label} no disponible`}
      className={`
        relative p-1.5 rounded-lg transition-all duration-200
        ${value
          ? "text-slate-500 hover:text-brand-400 hover:bg-brand-500/10 cursor-pointer"
          : "text-slate-700 cursor-not-allowed"
        }
      `}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check size={13} className="text-emerald-400" />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Icon size={13} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

// Componente para volver texto normal en click-to-copy
function ClickToCopyText({ value, children }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement("textarea"); ta.value = value;
      document.body.appendChild(ta); ta.select(); document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <div onClick={handleCopy} title={value ? `Click para copiar: ${value}` : ""} className="group/copy cursor-pointer relative inline-flex items-center">
      {children}
      <AnimatePresence>
        {copied && (
          <motion.span initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -15 }} exit={{ opacity: 0 }} className="absolute left-1/2 -translate-x-1/2 top-0 bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
            ¡Copiado!
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// Formatea un número como moneda ARS
const formatARS = (value) => {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value);
};

// Formatea el número de factura completo: 0001-00001234
const formatNumero = (pv, num) => {
  if (!pv && !num) return "—";
  const pvStr = String(pv ?? "").padStart(4, "0");
  const numStr = String(num ?? "").padStart(8, "0");
  return `${pvStr}-${numStr}`;
};

/**
 * @param {object} props
 * @param {object} props.invoice - Objeto InvoiceResult.
 * @param {number} props.index   - Índice para animación escalonada.
 * @param {function} props.onRemove - Callback para eliminar la fila.
 */
export default function InvoiceRow({ invoice, index, onRemove, onUpdate }) {
  const navigate = useNavigate();
  const { dashboardInvoices } = useInvoiceContext();
  const [localInvoice, setLocalInvoice] = useState(invoice);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- Lógica de Memoria de Cuentas (Sugerencia) ---
  useEffect(() => {
    if (!invoice.cuenta_contable && invoice.cuit && dashboardInvoices.length > 0) {
      // Buscar la última factura de este CUIT
      const matches = dashboardInvoices
        .filter(inv => String(inv.cuit_emisor) === String(invoice.cuit))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (matches.length > 0 && matches[0].cuenta_contable) {
        const suggestion = matches[0].cuenta_contable;
        setLocalInvoice(prev => ({ ...prev, cuenta_contable: suggestion }));
        onUpdate({ cuenta_contable: suggestion });
      }
    }
  }, [invoice.cuit, dashboardInvoices, invoice.cuenta_contable]);

  const [showRetInput, setShowRetInput] = useState(false);
  const {
    filename, cuit, razon_social, tipo_factura, punto_venta, numero,
    fecha, importe_neto, iva, total, cae, qr_link, cuenta_contable,
    autorizada, pagada, status, error_detail, otros_tributos, descripcion: iaDesc
  } = localInvoice;

  // --- Lógica de Detección de Duplicados ---
  const isDuplicateInDB = dashboardInvoices.some(inv => 
    String(inv.cuit_emisor) === String(cuit) && 
    String(inv.numero_comprobante) === String(numero)
  );

  const [ivaRate, setIvaRate] = useState(0.21); // Default 21%

  // Función para recalcular Neto e IVA basándose en Total y Retenciones
  const handleRecalculate = (newOtros, newRate = ivaRate) => {
    const valOtros = parseFloat(newOtros) || 0;
    const currentTotal = total || 0;
    
    // Neto = (Total - Otros) / (1 + Rate)
    const base = currentTotal - valOtros;
    const newNeto = base / (1 + newRate);
    const newIva = base - newNeto;

    const updatedFields = {
      importe_neto: Number(newNeto.toFixed(2)),
      iva: Number(newIva.toFixed(2)),
      otros_tributos: Number(valOtros.toFixed(2))
    };

    setLocalInvoice(prev => ({ ...prev, ...updatedFields }));
    setIvaRate(newRate);
    onUpdate(updatedFields);
  };

  // Efecto inicial: Si es Factura A, forzar cálculo al 21% de entrada para evitar inventos
  useEffect(() => {
    if (tipo_factura === "A" && total > 0) {
      // Forzamos el cálculo inicial al 21% para garantizar precisión
      handleRecalculate(otros_tributos || 0, 0.21);
    }
  }, []);

  const handleTogglePago = () => {
    const newPagada = !localInvoice.pagada;
    setLocalInvoice((prev) => ({ ...prev, pagada: newPagada }));
    onUpdate({ pagada: newPagada });
  };

  const handleEditSave = (newData) => {
    setLocalInvoice(prev => ({ ...prev, ...newData }));
    onUpdate(newData);
  };

  // Descripción para copiar (campo compuesto para ERP)
  const descripcion = [
    razon_social,
    tipo_factura ? `Factura ${tipo_factura}` : null,
    formatNumero(punto_venta, numero),
    fecha,
  ]
    .filter(Boolean)
    .join(" | ");

  // Determinar si el QR es válido o un valor sentinel
  const qrIsUrl     = isValidQrUrl(qr_link);
  const qrSentinel  = qrIsUrl ? null : qrSentinelInfo(qr_link);
  // El botón de copia del Link AFIP solo está activo si hay URL real
  const qrCopyValue = qrIsUrl ? qr_link : null;

  // Para filas rechazadas o con error fatal, mostrar el detalle en la celda del proveedor
  const isErrorRow = status === "tipo_invalido" || status === "error";
  const isInvalidReceptor = status === "receptor_invalido";
  
  const rowClass = isInvalidReceptor
    ? "bg-red-500 text-white"
    : (pagada 
        ? "bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 shadow-[inset_0_0_20px_rgba(0,255,157,0.05)]" 
        : (invoice.es_credito 
            ? "bg-violet-500/5 hover:bg-violet-500/10" 
            : (invoice.moneda === "USD" ? "bg-indigo-500/5 hover:bg-indigo-500/10" : "hover:bg-surface-hover")
          )
      );


  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`border-b border-base transition-all duration-200 group ${rowClass}`}
    >
      {/* Estado */}
      <td className="px-1 py-2">
        <StatusBadge 
          status={pagada ? "pagada" : status} 
          onClick={status === "recibida" || status === "sin_qr" ? handleTogglePago : null} 
        />
      </td>

      {/* Razón Social + CUIT */}
      <td className="px-1 py-2 min-w-[120px]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => navigate(`/factura/${invoice.id}/verificacion`)}
              title="Abrir vista de verificación dividida"
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                isInvalidReceptor ? "bg-white/20 text-white" : "bg-surface border border-base text-muted hover:text-brand-primary hover:border-brand-primary/50 shadow-sm"
              }`}
            >
              <Eye size={12} />
            </button>
          </div>
          <div className="min-w-0">
            {isErrorRow || isInvalidReceptor ? (
              <>
                <p className={`text-[8px] font-bold uppercase tracking-wider truncate max-w-[100px] ${isInvalidReceptor ? "text-white/70" : "text-dim"}`}>
                  {filename}
                </p>
                <ClickToCopyText value={razon_social}>
                  <p className={`text-[10px] font-black leading-tight break-words transition-colors ${isInvalidReceptor ? "text-white" : "text-red-500"}`}>
                    {razon_social ?? "Proveedor no identificado"}
                  </p>
                </ClickToCopyText>
              </>
            ) : (
              <>
                <ClickToCopyText value={razon_social}>
                  <p className={`text-[10px] font-black leading-tight break-words hover:text-brand-primary transition-colors ${
                    invoice.es_credito ? "text-violet-600 dark:text-violet-400" : (invoice.moneda === "USD" ? "text-indigo-600 dark:text-indigo-400" : "text-main")
                  }`}>
                    {razon_social ?? <span className="text-dim italic font-medium">No identificado</span>}
                  </p>
                </ClickToCopyText>
                {cuit && (
                  <p className={`text-[8px] font-bold mt-0.5 uppercase tracking-tighter ${isInvalidReceptor ? "text-white/60" : "text-dim"}`}>
                    {cuit.replace(/(\d{2})(\d{8})(\d)/, "$1-$2-$3")}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </td>

      {/* Tipo | Número Separado */}
      <td className="px-1 py-2 whitespace-nowrap">
        <div className="flex items-center gap-1">
          {tipo_factura && (
            <span className={`px-1 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tight ${
              isInvalidReceptor ? "bg-white/20 text-white" : (invoice.es_credito ? "bg-violet-500/10 text-violet-500 border border-violet-500/20" : "bg-surface border border-base text-muted shadow-sm")
            }`}>
              {tipo_factura}
            </span>
          )}

          <div className={`text-[9px] font-black flex items-center tracking-tighter ${isInvalidReceptor ? "text-white" : "text-main"}`}>
            <ClickToCopyText value={punto_venta ? String(punto_venta).padStart(4, "0") : ""}>
              <span className="hover:text-brand-primary transition-colors">{punto_venta ? String(punto_venta).padStart(4, "0") : "—"}</span>
            </ClickToCopyText>
            <span className="mx-0.5 opacity-20">—</span>
            <ClickToCopyText value={numero ? String(numero).padStart(8, "0") : ""}>
              <span className="hover:text-brand-primary transition-colors">{numero ? String(numero).padStart(8, "0") : "—"}</span>
            </ClickToCopyText>
          </div>
        </div>
      </td>

      {isInvalidReceptor ? (
        <td colSpan={11} className="px-6 py-2 text-center">
            <div className="flex flex-col items-center justify-center py-4">
              <p className="text-white font-black text-2xl tracking-tighter uppercase italic">
                ⚠️ RECEPTOR INVÁLIDO ⚠️
              </p>
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">
                La factura no pertenece a Jockey Club
              </p>
            </div>
        </td>
      ) : (

        <>
          {/* Fecha */}
          <td className="px-1 py-1 lg:py-2 whitespace-nowrap text-[9px] font-bold text-dim uppercase">
            <ClickToCopyText value={fecha}>
              <span className="hover:text-brand-primary transition-colors">{fecha ?? "—"}</span>
            </ClickToCopyText>
          </td>

          {/* NETO (Calculado) */}
          <td className="px-1 py-1 lg:py-2 whitespace-nowrap text-right">
            <ClickToCopyText value={importe_neto?.toString()}>
              <span className="text-[9px] font-black text-main hover:text-brand-primary transition-colors">
                {formatARS(importe_neto)}
              </span>
            </ClickToCopyText>
          </td>

          {/* IVA */}
          <td className="px-1 py-1 lg:py-2 whitespace-nowrap text-right">
            <div className="flex items-center justify-end gap-1 group/iva">
              <ClickToCopyText value={iva?.toString()}>
                <span className="text-[9px] font-black text-main order-1 min-w-[50px] hover:text-brand-primary transition-colors">
                  {formatARS(iva)}
                </span>
              </ClickToCopyText>
              
              {tipo_factura === "A" && (
                <div className="flex flex-col gap-0.5 order-2 opacity-0 group-hover/iva:opacity-100 transition-opacity">
                  {[0.21, 0.105].map(rate => (
                    <button
                      key={rate}
                      onClick={() => handleRecalculate(otros_tributos, rate)}
                      className={`text-[7px] px-0.5 py-0.5 rounded font-black border leading-none transition-all ${
                        ivaRate === rate 
                          ? "bg-brand-primary border-brand-primary text-white shadow-lg shadow-indigo-500/20" 
                          : "bg-surface border-base text-dim hover:text-main hover:border-brand-primary"
                      }`}
                    >
                      {(rate * 100).toFixed(1)}%
                    </button>
                  ))}
                </div>
              )}
            </div>
          </td>

          {/* Otros / Ret */}
          <td className="px-1 py-1 lg:py-2 whitespace-nowrap text-right">
            <div className="flex flex-col items-end gap-0.5">
              {!showRetInput && (!otros_tributos || otros_tributos === 0) ? (
                <button
                  onClick={() => setShowRetInput(true)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all transform hover:scale-105 shadow-sm border border-emerald-500/20"
                >
                  <span className="text-sm font-black">+</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-surface border border-emerald-500 px-1 py-0.5 rounded-lg shadow-lg focus-within:scale-105 transition-transform">
                  <span className="text-emerald-500 text-[10px] font-black">+</span>
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    placeholder="0.00"
                    value={otros_tributos || ""}
                    onChange={(e) => handleRecalculate(e.target.value)}
                    onBlur={() => { if(!otros_tributos) setShowRetInput(false); }}
                    className="w-12 bg-transparent border-none text-right text-[10px] font-black text-emerald-600 dark:text-emerald-400 outline-none p-0"
                  />
                </div>
              )}
            </div>
          </td>

          {/* Total */}
          <td className="px-1 py-1 lg:py-2 whitespace-nowrap text-right flex-1">
            <ClickToCopyText value={total?.toString()}>
              <span className={`inline-block text-[11px] font-black hover:text-brand-primary transition-colors ${
                invoice.es_credito ? "text-red-500" : (invoice.moneda === "USD" ? "text-brand-primary" : "text-main")
              }`}>
                {formatARS(total)}
              </span>
            </ClickToCopyText>
          </td>

          {/* Cuenta Contable */}
          <td className="px-1 py-1 lg:py-2 whitespace-nowrap">
            <span className="text-[8px] font-black text-white bg-indigo-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
              {cuenta_contable ?? "SIN CTA"}
            </span>
          </td>
        </>
      )}

      {!isInvalidReceptor && (
        <td className="px-2 py-4 whitespace-nowrap">
          <div className="flex items-center gap-1">
            {qrIsUrl ? (
              <CopyButton
                id={`copy-qr-${cae ?? filename}`}
                value={qrCopyValue}
                label="Link AFIP"
                icon={ExternalLink}
              />
            ) : (
              <div
                className="flex items-center justify-center p-1 rounded-md bg-surface border border-base text-dim"
                title={qr_link ?? "Sin QR"}
              >
                {qrSentinel && <qrSentinel.icon size={11} />}
              </div>
            )}

            <CopyButton
              id={`copy-cae-${cae ?? filename}`}
              value={cae}
              label="CAE"
              icon={FileText}
            />
          </div>
        </td>
      )}


      {/* Botones Acciones */}
      <td className="px-2 py-4 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-dim hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all duration-200"
            title="Editar datos"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onRemove}
            className="w-8 h-8 flex items-center justify-center text-dim hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <EditInvoiceModal 
          isOpen={isEditModalOpen}
          invoice={localInvoice}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleEditSave}
        />
      </td>
    </motion.tr>
  );
}

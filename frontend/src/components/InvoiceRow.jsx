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
    ? "bg-red-600/90 hover:bg-red-700 transition-all duration-300"
    : (pagada 
        ? "bg-emerald-500/10 hover:bg-emerald-600/15 border-l-4 border-l-emerald-500" 
        : (invoice.es_credito 
            ? "bg-violet-500/10 hover:bg-violet-500/20 shadow-inner" 
            : (invoice.moneda === "USD" ? "bg-blue-500/10 hover:bg-blue-500/20 shadow-inner" : "hover:bg-slate-800/30")
          )
      );


  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`border-b border-slate-700/50 transition-colors duration-150 group ${rowClass}`}
    >
      {/* Estado */}
      <td className="px-4 py-3 whitespace-nowrap">
        <StatusBadge 
          status={status} 
          onClick={null} 
        />
      </td>

      {/* Razón Social + CUIT */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => navigate(`/factura/${invoice.id}/verificacion`)}
              title="Abrir vista de verificación dividida"
              className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${
                isInvalidReceptor ? "bg-white/20 text-white" : "bg-brand-500/10 text-brand-400 hover:bg-brand-500 hover:text-white"
              }`}
            >
              <Eye size={14} />
            </button>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isInvalidReceptor ? "bg-white/20" : (invoice.es_credito ? "bg-violet-500/20" : (invoice.moneda === "USD" ? "bg-blue-500/20" : "bg-slate-700/60"))
            }`}>
              <Building2 size={13} className={isInvalidReceptor ? "text-white" : (invoice.es_credito ? "text-violet-400" : (invoice.moneda === "USD" ? "text-blue-400" : "text-slate-400"))} />
            </div>
          </div>
          <div className="min-w-0">
            {isErrorRow || isInvalidReceptor ? (
              // Fila rechazada o receptor inválido: mostrar el archivo y el motivo
              <>
                <p className={`text-xs font-mono truncate max-w-[200px] ${isInvalidReceptor ? "text-white/80" : "text-slate-500"}`}>
                  {filename}
                </p>
                <ClickToCopyText value={razon_social}>
                  <p className={`text-sm font-bold truncate max-w-[180px] hover:underline transition-colors ${isInvalidReceptor ? "text-white" : "text-red-400"}`}>
                    {razon_social ?? "Proveedor no identificado"}
                  </p>
                </ClickToCopyText>
              </>
            ) : (
              // Fila normal
              <>
                <ClickToCopyText value={razon_social}>
                  <p className={`text-sm font-medium truncate max-w-[180px] hover:text-brand-400 hover:underline transition-colors decoration-brand-400/50 underline-offset-2 ${
                    invoice.es_credito ? "text-violet-300" : (invoice.moneda === "USD" ? "text-blue-300" : "text-slate-200")
                  }`}>
                    {razon_social ?? <span className="text-slate-600 hover:no-underline">No extraído</span>}
                  </p>
                </ClickToCopyText>
                {cuit && (
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {cuit.replace(/(\d{2})(\d{8})(\d)/, "$1-$2-$3")}
                  </p>
                )}
                
                {isDuplicateInDB && (
                  <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[9px] font-black text-red-400 uppercase tracking-tighter animate-pulse">
                    ⚠️ YA REGISTRADA EN DB
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </td>

      {/* Tipo | Número Separado */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {tipo_factura && (
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
              isInvalidReceptor ? "bg-white/20 text-white" : (invoice.es_credito ? "bg-violet-500/20 text-violet-300" : "bg-slate-700/60 text-slate-300")
            }`}>
              {tipo_factura}
            </span>
          )}

          <div className={`text-xs font-mono flex items-center ${isInvalidReceptor ? "text-white/90" : "text-slate-400"}`}>
            <ClickToCopyText value={punto_venta ? String(punto_venta).padStart(4, "0") : ""}>
              <span className="hover:text-brand-400 transition-colors font-bold">{punto_venta ? String(punto_venta).padStart(4, "0") : "—"}</span>
            </ClickToCopyText>
            <span className="mx-0.5 opacity-50">-</span>
            <ClickToCopyText value={numero ? String(numero).padStart(8, "0") : ""}>
              <span className="hover:text-brand-400 transition-colors font-bold">{numero ? String(numero).padStart(8, "0") : "—"}</span>
            </ClickToCopyText>
          </div>
        </div>
      </td>

      {isInvalidReceptor ? (
        // MODO ULTRA ROJO: Aviso gigante ocultando el resto de las celdas de datos (excepto eliminar)
        <td colSpan={6} className="px-4 py-3 text-center">
            <div className="flex flex-col items-center justify-center animate-pulse">
              <p className="text-white font-black text-xl tracking-tighter uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                ⚠️ NO ESTÁ A NOMBRE DEL JC ⚠️
              </p>
              <p className="text-white/80 text-[11px] font-mono mt-1 font-bold">
                ARCHIVO: {filename}
              </p>
            </div>
        </td>
      ) : (

        <>
          {/* Fecha */}
          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
            <ClickToCopyText value={fecha}>
              <span className="hover:text-brand-400 transition-colors">{fecha ?? "—"}</span>
            </ClickToCopyText>
          </td>

          {/* NETO (Calculado) */}
          <td className="px-4 py-3 whitespace-nowrap text-right">
            <ClickToCopyText value={importe_neto?.toString()}>
              <span className="text-xs font-mono text-white font-medium hover:text-brand-400 transition-colors">
                {formatARS(importe_neto)}
              </span>
            </ClickToCopyText>
          </td>

          {/* IVA con Selector Vertical */}
          <td className="px-4 py-3 whitespace-nowrap text-right">
            <div className="flex items-center justify-end gap-2">
              <ClickToCopyText value={iva?.toString()}>
                <span className="text-xs font-mono text-white font-bold order-1 min-w-[70px] hover:text-brand-400 transition-colors">
                  {formatARS(iva)}
                </span>
              </ClickToCopyText>
              
              {tipo_factura === "A" && (
                <div className="flex flex-col gap-0.5 order-2">
                  {[0.27, 0.21, 0.105].map(rate => (
                    <button
                      key={rate}
                      onClick={() => handleRecalculate(otros_tributos, rate)}
                      title={`Calcular al ${(rate * 100).toFixed(1)}%`}
                      className={`text-[8px] px-1 py-0 rounded border leading-tight ${
                        ivaRate === rate 
                          ? "bg-brand-500 border-brand-400 text-white" 
                          : "bg-slate-800/80 border-slate-700 text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {(rate * 100).toFixed(0)}%
                    </button>
                  ))}
                </div>
              )}
            </div>
          </td>

          {/* Otros / Ret (Botón + Verde) */}
          <td className="px-4 py-3 whitespace-nowrap text-right">
            <div className="flex flex-col items-end gap-1">
              {!showRetInput && (!otros_tributos || otros_tributos === 0) ? (
                <button
                  onClick={() => setShowRetInput(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all transform hover:scale-110"
                  title="Agregar Retenciones / Percepciones"
                >
                  <span className="text-lg font-bold">+</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-slate-900/50 border border-slate-700 rounded px-1.5 py-0.5 focus-within:border-brand-500 transition-colors">
                  <span className="text-brand-500 text-[10px] font-bold">+</span>
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    placeholder="0.00"
                    value={otros_tributos || ""}
                    onChange={(e) => handleRecalculate(e.target.value)}
                    onBlur={() => { if(!otros_tributos) setShowRetInput(false); }}
                    className="w-16 bg-transparent border-none text-right text-xs font-mono text-brand-300 outline-none p-0"
                  />
                </div>
              )}
              <span className="text-[8px] text-slate-600 uppercase font-bold tracking-tighter">Ret | Perc</span>
            </div>
          </td>

          {/* Total */}
          <td className="px-4 py-3 whitespace-nowrap text-right">
            <div className="flex flex-col items-end">
              <ClickToCopyText value={total?.toString()}>
                <span className={`inline-block text-sm font-semibold font-mono hover:text-brand-400 transition-colors ${
                  invoice.es_credito ? "text-red-400" : (invoice.moneda === "USD" ? "text-blue-400" : "text-white")
                }`}>
                  {formatARS(total)}
                </span>
              </ClickToCopyText>
              {invoice.moneda === "USD" && (
                <span className="text-[10px] text-blue-500/90 mt-0.5 font-medium">
                  USD (Conv. a ARS)
                </span>
              )}
            </div>
          </td>

          {/* Cuenta Contable */}
          <td className="px-4 py-3 whitespace-nowrap">
            <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-1 rounded-lg">
              {cuenta_contable ?? "—"}
            </span>
          </td>
        </>
      )}

      {!isInvalidReceptor && (
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-0.5">

            {/* Copiar Link AFIP — o mostrar sentinel si no hay URL */}
            {qrIsUrl ? (
              <CopyButton
                id={`copy-qr-${cae ?? filename}`}
                value={qrCopyValue}
                label="Link AFIP"
                icon={ExternalLink}
              />
            ) : (
              // Sentinel visual: icono + texto descriptivo, sin botón de copia
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
                title={qr_link ?? "Sin QR"}
              >
                {qrSentinel && (() => {
                  const SentinelIcon = qrSentinel.icon;
                  return (
                    <>
                      <SentinelIcon size={11} className={qrSentinel.color} />
                      <span className={qrSentinel.color}>{qrSentinel.label}</span>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Copiar CAE */}
            <CopyButton
              id={`copy-cae-${cae ?? filename}`}
              value={cae}
              label="CAE"
              icon={FileText}
            />

            {/* Copiar Descripción */}
            <CopyButton
              id={`copy-desc-${cae ?? filename}`}
              value={descripcion}
              label="Descripción"
              icon={Copy}
            />
          </div>
        </td>
      )}


      {/* Botón Eliminar */}
      <td className="px-4 py-3 text-center">
        <button
          onClick={onRemove}
          className="text-red-500/50 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors tooltip-trigger"
          title="Eliminar de la lista"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </motion.tr>
  );
}

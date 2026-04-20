/**
 * components/StatusBadge.jsx
 * --------------------------
 * Badge visual que indica el estado de procesamiento de una factura.
 *
 * Estados disponibles:
 *   - "procesado" → Verde (éxito)
 *   - "sin_qr"    → Amarillo (advertencia: texto OK pero sin QR)
 *   - "error"     → Rojo (falló el procesamiento)
 *   - (default)   → Gris (estado desconocido)
 */

import { CheckCircle, AlertTriangle, XCircle, Clock, ShieldOff } from "lucide-react";

const STATUS_CONFIG = {
  recibida: {
    label: "Recibida",
    icon: CheckCircle,
    classes: "bg-sky-500/10 text-sky-400 border border-sky-500/30",
    dotClass: "bg-sky-400",
  },
  pagada: {
    label: "Pagada",
    icon: CheckCircle,
    classes: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    dotClass: "bg-emerald-400",
  },
  sin_qr: {
    label: "Sin QR",
    icon: AlertTriangle,
    classes: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    dotClass: "bg-amber-400",
  },
  tipo_invalido: {
    label: "Tipo inválido",
    icon: ShieldOff,
    classes: "bg-red-500/10 text-red-500 border border-red-500/30",
    dotClass: "bg-red-500",
  },

  error: {
    label: "Error",
    icon: XCircle,
    classes: "bg-red-500/10 text-red-400 border border-red-500/30",
    dotClass: "bg-red-400",
  },
  receptor_invalido: {
    label: "Receptor Erróneo",
    icon: ShieldOff,
    classes: "bg-red-600/20 text-red-500 border border-red-600/40",
    dotClass: "bg-red-600",
  },
  pendiente: {

    label: "Pendiente",
    icon: Clock,
    classes: "bg-slate-500/10 text-slate-400 border border-slate-500/30",
    dotClass: "bg-slate-400",
  },
};

/**
 * @param {object}   props
 * @param {string}   props.status  - Estado de la factura.
 * @param {function} [props.onClick] - Callback opcional para cuando se hace click en el badge.
 */
export default function StatusBadge({ status, onClick }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendiente;
  const Icon = config.icon;

  return (
    <span 
      onClick={onClick}
      className={`
        inline-flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200
        ${config.classes}
        ${onClick ? "cursor-pointer hover:scale-110 active:scale-95 shadow-lg shadow-emerald-500/10" : ""}
      `}
      title={onClick ? `Clic para cambiar estado: ${config.label}` : config.label}
    >
      <Icon size={14} />
    </span>
  );
}

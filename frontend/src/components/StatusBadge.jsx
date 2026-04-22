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
    classes: "badge-info",
    dotClass: "bg-indigo-500",
  },
  pagada: {
    label: "Pagada",
    icon: CheckCircle,
    classes: "badge-success",
    dotClass: "bg-emerald-500",
  },
  sin_qr: {
    label: "Sin QR",
    icon: AlertTriangle,
    classes: "badge-warning",
    dotClass: "bg-amber-500",
  },
  tipo_invalido: {
    label: "Bloqueada",
    icon: ShieldOff,
    classes: "badge-error",
    dotClass: "bg-red-500",
  },
  error: {
    label: "Error",
    icon: XCircle,
    classes: "badge-error",
    dotClass: "bg-red-500",
  },
  receptor_invalido: {
    label: "Crítico",
    icon: ShieldOff,
    classes: "bg-red-500 text-white border-none",
    dotClass: "bg-white",
  },
  pendiente: {
    label: "Procesando",
    icon: Clock,
    classes: "bg-surface border border-base text-muted",
    dotClass: "bg-dim",
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
        inline-flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 shadow-sm
        ${config.classes}
        ${onClick ? "cursor-pointer hover:scale-110 active:scale-95 hover:shadow-lg" : ""}
      `}
      title={onClick ? `Acción: ${config.label}. Clic para cambiar.` : config.label}
    >
      <Icon size={16} />
    </span>
  );
}

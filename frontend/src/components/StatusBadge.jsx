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
  procesado: {
    label: "Procesado",
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
    classes: "bg-orange-500/10 text-orange-400 border border-orange-500/30",
    dotClass: "bg-orange-400",
  },
  error: {
    label: "Error",
    icon: XCircle,
    classes: "bg-red-500/10 text-red-400 border border-red-500/30",
    dotClass: "bg-red-400",
  },
  pendiente: {
    label: "Pendiente",
    icon: Clock,
    classes: "bg-slate-500/10 text-slate-400 border border-slate-500/30",
    dotClass: "bg-slate-400",
  },
};

/**
 * @param {object} props
 * @param {string} props.status - Estado de la factura.
 */
export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pendiente;
  const Icon = config.icon;

  return (
    <span className={`badge ${config.classes} whitespace-nowrap`}>
      <Icon size={11} />
      {config.label}
    </span>
  );
}

/**
 * components/StatsCard.jsx
 * ------------------------
 * Tarjeta de métricas para el dashboard superior.
 * Muestra un ícono, etiqueta, valor principal y delta/subtexto.
 * Animación de entrada escalonada via Framer Motion.
 */

import { motion } from "framer-motion";

/**
 * @param {object} props
 * @param {React.ReactNode} props.icon        - Ícono Lucide
 * @param {string}          props.label       - Etiqueta de la métrica
 * @param {string|number}   props.value       - Valor principal
 * @param {string}          [props.sublabel]  - Texto secundario debajo del valor
 * @param {string}          [props.color]     - Color del ícono (clase Tailwind text-*)
 * @param {string}          [props.bgColor]   - Color de fondo del ícono (clase Tailwind bg-*)
 * @param {number}          [props.index]     - Índice para stagger animation
 */
export default function StatsCard({
  icon,
  label,
  value,
  sublabel,
  color = "text-brand-400",
  bgColor = "bg-brand-500/10",
  index = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className="glass-card p-6 flex items-center gap-5 group"
    >
      {/* Ícono con fondo tintado */}
      <div
        className={`
          w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm
          ${bgColor}
          group-hover:scale-110 group-hover:rotate-3 transition-all duration-300
        `}
      >
        <span className={color}>{icon}</span>
      </div>

      {/* Contenido */}
      <div className="min-w-0">
        <p className="text-[10px] text-muted font-bold uppercase tracking-[0.15em]">
          {label}
        </p>
        <p className="text-2xl font-black text-main mt-1 leading-none tracking-tight">
          {value}
        </p>
        {sublabel && (
          <p className="text-xs text-dim mt-1.5 font-medium">{sublabel}</p>
        )}
      </div>
    </motion.div>
  );
}

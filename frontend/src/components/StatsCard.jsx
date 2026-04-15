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
      className="glass-card p-5 flex items-center gap-4 hover:border-slate-600/60 transition-colors duration-200 group"
    >
      {/* Ícono con fondo tintado */}
      <div
        className={`
          w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
          ${bgColor}
          group-hover:scale-110 transition-transform duration-200
        `}
      >
        <span className={color}>{icon}</span>
      </div>

      {/* Contenido */}
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-bold text-white mt-0.5 leading-none">
          {value}
        </p>
        {sublabel && (
          <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
        )}
      </div>
    </motion.div>
  );
}

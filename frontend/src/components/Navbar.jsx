/**
 * components/Navbar.jsx
 * ---------------------
 * Barra de navegación superior de la plataforma.
 * Diseño premium con glassmorphism, logo con gradiente y badge de estado.
 */

import { FileText, Activity, Zap } from "lucide-react";
import { motion } from "framer-motion";

/**
 * @param {object} props
 * @param {number} props.totalFacturas - Cantidad total de facturas procesadas.
 */
export default function Navbar({ totalFacturas = 0 }) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-b border-slate-700/60"
      style={{
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* ---- Logo + Nombre ---- */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Ícono con gradiente */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              <FileText size={18} className="text-white" />
            </div>
            {/* Punto de "online" */}
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0f172a]" />
          </div>

          <div>
            <h1 className="text-base font-bold leading-none">
              <span className="brand-gradient-text">FacturaScan</span>
              <span className="text-slate-400 font-light ml-1 text-sm">AFIP</span>
            </h1>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">
              Procesamiento masivo de facturas
            </p>
          </div>
        </div>

        {/* ---- Centro: Badge del sistema ---- */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50">
          <Zap size={12} className="text-amber-400" />
          <span className="text-xs text-slate-400">Motor de extracción AFIP/ARCA v1.0</span>
        </div>

        {/* ---- Derecha: Estadística rápida ---- */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <Activity size={14} className="text-brand-400" />
            <span className="text-sm text-slate-400">
              <span className="text-white font-semibold">{totalFacturas}</span>
              {" "}factura{totalFacturas !== 1 ? "s" : ""} procesada{totalFacturas !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Indicador de sistema online */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Sistema activo</span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

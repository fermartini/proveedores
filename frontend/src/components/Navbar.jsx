/**
 * components/Navbar.jsx
 * ---------------------
 * Barra de navegación superior con tabs para cambiar de sección.
 */

import { FileText, Activity, Zap, UploadCloud, LayoutDashboard, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

/**
 * @param {object}   props
 * @param {number}   props.totalFacturas - Cantidad de facturas en la sesión.
 * @param {string}   props.activeTab     - Tab activo: "upload" | "dashboard"
 * @param {Function} props.onTabChange   - Callback para cambiar de tab.
 */
export default function Navbar({ totalFacturas = 0, activeTab, onTabChange }) {
  const { logOut, currentUser, nombreEmpresa } = useAuth();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-b border-slate-700/60"
      style={{
        background: "rgba(15, 23, 42, 0.90)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center gap-6">

        {/* ---- Logo ---- */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              <FileText size={18} className="text-white" />
            </div>
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

        {/* ---- Tabs de navegación ---- */}
        <nav className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1 flex-shrink-0">
          <button
            id="tab-upload"
            onClick={() => onTabChange("upload")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === "upload"
                ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-700/60"
              }
            `}
          >
            <UploadCloud size={14} />
            <span className="hidden sm:block">Cargar Facturas</span>
            <span className="sm:hidden">Cargar</span>
          </button>

          <button
            id="tab-dashboard"
            onClick={() => onTabChange("dashboard")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === "dashboard"
                ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-700/60"
              }
            `}
          >
            <LayoutDashboard size={14} />
            <span className="hidden sm:block">Dashboard</span>
            <span className="sm:hidden">DB</span>
          </button>
        </nav>

        {/* ---- Centro: Badge del sistema ---- */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50">
          <Zap size={12} className="text-amber-400" />
          <span className="text-xs text-slate-400">Motor AFIP/ARCA v1.0</span>
        </div>

        {/* ---- Derecha ---- */}
        <div className="flex items-center gap-4 ml-auto">
          {activeTab === "upload" && (
            <div className="hidden sm:flex items-center gap-2">
              <Activity size={14} className="text-brand-400" />
              <span className="text-sm text-slate-400">
                <span className="text-white font-semibold">{totalFacturas}</span>
                {" "}factura{totalFacturas !== 1 ? "s" : ""} en sesión
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium hidden sm:inline">{nombreEmpresa || "Online"}</span>
          </div>

          {currentUser && (
            <button
              onClick={logOut}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors border border-transparent hover:border-slate-600"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}

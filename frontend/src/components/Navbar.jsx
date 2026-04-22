/**
 * components/Navbar.jsx
 * ---------------------
 * Barra de navegación superior con tabs para cambiar de sección.
 */

import { FileText, Activity, Zap, UploadCloud, LayoutDashboard, LogOut, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

/**
 * @param {object}   props
 * @param {number}   props.totalFacturas - Cantidad de facturas en la sesión.
 * @param {string}   props.activeTab     - Tab activo: "upload" | "dashboard"
 * @param {Function} props.onTabChange   - Callback para cambiar de tab.
 */
export default function Navbar({ totalFacturas = 0, activeTab, onTabChange }) {
  const { logOut, currentUser, nombreEmpresa } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-b border-base bg-main/80 backdrop-blur-xl shadow-sm"
    >
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12 h-20 flex items-center gap-8">

        {/* ---- Logo ---- */}
        <div className="flex items-center gap-4 flex-shrink-0 cursor-pointer group" onClick={() => onTabChange("upload")}>
          <div className="relative">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xl transition-transform group-hover:scale-105 duration-300`}
              style={{ background: "var(--brand-gradient)" }}
            >
              <FileText size={22} className="text-white" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-[3px] border-surface" />
          </div>

          <div>
            <h1 className="text-lg font-black leading-none tracking-tight">
              <span className="brand-gradient-text uppercase">Factura</span>
              <span className="text-main uppercase">Scan</span>
            </h1>
            <p className="text-[10px] text-dim font-black uppercase tracking-[0.2em] mt-1.5 opacity-60">
              Arca Intelligence v2.0
            </p>
          </div>
        </div>

        {/* ---- Tabs de navegación ---- */}
        <nav className="hidden md:flex items-center gap-2 bg-surface/50 border border-base rounded-[20px] p-1.5 flex-shrink-0 shadow-inner">
          <button
            id="tab-upload"
            onClick={() => onTabChange("upload")}
            className={`
              flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300
              ${activeTab === "upload"
                ? "bg-brand-primary text-white shadow-lg shadow-indigo-500/20"
                : "text-dim hover:text-main hover:bg-surface-hover"
              }
            `}
          >
            <UploadCloud size={16} />
            Cargar Lote
          </button>

          <button
            id="tab-dashboard"
            onClick={() => onTabChange("dashboard")}
            className={`
              flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300
              ${activeTab === "dashboard"
                ? "bg-brand-primary text-white shadow-lg shadow-indigo-500/20"
                : "text-dim hover:text-main hover:bg-surface-hover"
              }
            `}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
        </nav>

        {/* ---- Derecha ---- */}
        <div className="flex items-center gap-4 ml-auto">
          {activeTab === "upload" && totalFacturas > 0 && (
            <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-indigo-500/10 text-brand-primary border border-indigo-500/20 shadow-sm">
              <Activity size={16} />
              <span className="text-xs font-black tracking-tighter">
                {totalFacturas} PROCESADAS
              </span>
            </div>
          )}

          <div className="h-8 w-[1px] bg-base hidden sm:block mx-2" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-surface border border-base text-main hover:text-brand-primary hover:border-brand-primary transition-all duration-300 shadow-sm flex items-center justify-center group/theme"
            title={theme === 'dark' ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {theme === 'dark' ? <Sun size={20} className="transition-transform group-hover/theme:rotate-90" /> : <Moon size={18} className="transition-transform group-hover/theme:-rotate-12" />}
          </button>

          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest hidden lg:inline">
              {nombreEmpresa || "Corporativo"}
            </span>
          </div>

          {currentUser && (
            <button
              onClick={logOut}
              className="w-10 h-10 rounded-xl text-dim hover:text-red-500 hover:bg-red-500/10 transition-all duration-300 border border-base hover:border-red-500/30 shadow-sm flex items-center justify-center"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>

      {/* --- Navegación Mobile en el Bottom --- */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-sm bg-surface/90 backdrop-blur-2xl border border-base rounded-[32px] p-2 flex items-center justify-around shadow-2xl z-[60]">
        <button
          onClick={() => onTabChange("upload")}
          className={`flex flex-col items-center gap-1 px-6 py-3 rounded-2xl transition-all ${activeTab === "upload" ? "bg-brand-primary text-white shadow-xl shadow-indigo-500/30" : "text-dim"}`}
        >
          <UploadCloud size={18} />
          <span className="text-[9px] font-black uppercase tracking-widest">Cargar</span>
        </button>
        <button
          onClick={() => onTabChange("dashboard")}
          className={`flex flex-col items-center gap-1 px-6 py-3 rounded-2xl transition-all ${activeTab === "dashboard" ? "bg-brand-primary text-white shadow-xl shadow-indigo-500/30" : "text-dim"}`}
        >
          <LayoutDashboard size={18} />
          <span className="text-[9px] font-black uppercase tracking-widest">Historial</span>
        </button>
      </nav>
    </motion.header>
  );
}

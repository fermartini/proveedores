import { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, DollarSign, Clock, CheckCircle2,
} from "lucide-react";

import Navbar        from "./components/Navbar";
import StatsCard     from "./components/StatsCard";
import DropZone      from "./components/DropZone";
import InvoiceTable  from "./components/InvoiceTable";
import DashboardPage from "./components/DashboardPage";
import VerificationPage from "./components/VerificationPage";
import LoginView from "./components/LoginView";
import { useInvoices } from "./hooks/useInvoices";
import { useAuth } from "./context/AuthContext";
import { BASE_URL } from "./services/api";

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

function UploadTab() {
  const {
    invoices,
    uploading,
    uploadProgress,
    error,
    stats,
    handleUpload,
    handleConfirm,
    clearError,
    removeInvoice,
    updateInvoice,
  } = useInvoices();
  const { nombreEmpresa } = useAuth();

  const formatARSShort = (v) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
    return new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS", minimumFractionDigits: 0,
    }).format(v);
  };

  return (
    <motion.div
      key="upload"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-12"
    >
      {/* Hero */}
      <section className="space-y-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary">
            Sincronización Bancaria Activa
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        </div>
        
        <h2 className="text-5xl md:text-7xl font-black text-main leading-[1.1] tracking-tight">
          Panel de <span className="brand-gradient-text">Procesamiento</span>.
          <br />
          Audita tus <span className="relative inline-block">
            activos
            <span className="absolute bottom-2 left-0 w-full h-3 bg-indigo-500/20 -z-10 rounded-lg" />
          </span>
        </h2>
        
        <p className="text-dim max-w-3xl text-lg md:text-xl leading-relaxed font-bold opacity-80">
          Subí tus comprobantes AFIP y extraé automáticamente datos fiscales con inteligencia artificial. 
          Un ecosistema diseñado para la velocidad y la precisión administrativa.
        </p>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" aria-label="Métricas del sistema">
        <StatsCard
          index={0}
          icon={<FileText size={22} />}
          label="Volumen Sesión"
          value={stats.totalFacturas}
          sublabel={`${stats.procesadas} validadas`}
          color="text-indigo-500"
          bgColor="bg-indigo-500/10"
        />
        <StatsCard
          index={1}
          icon={<DollarSign size={22} />}
          label="Liquidez Total"
          value={formatARSShort(stats.totalImporte)}
          sublabel="Suma de comprobantes"
          color="text-emerald-500"
          bgColor="bg-emerald-500/10"
        />
        <StatsCard
          index={2}
          icon={<Clock size={22} />}
          label="Operaciones Pendientes"
          value={stats.pendientesPago}
          sublabel="Pendientes de cierre"
          color="text-amber-500"
          bgColor="bg-amber-500/10"
        />
        <StatsCard
          index={3}
          icon={<CheckCircle2 size={22} />}
          label="Alertas Audit."
          value={stats.errores}
          sublabel={stats.errores > 0 ? "Requiere inspección" : "Firma digital OK"}
          color={stats.errores > 0 ? "text-red-500" : "text-emerald-500"}
          bgColor={stats.errores > 0 ? "bg-red-500/10" : "bg-emerald-500/10"}
        />
      </section>

      <div className="divider-gradient !my-12" />

      {/* Dropzone */}
      <section aria-label="Cargar facturas PDF" className="space-y-8">
        <div className="flex items-center justify-between">
           <div>
            <h3 className="text-xl font-black text-main uppercase tracking-tight">Carga de Documentación</h3>
            <p className="text-sm text-dim font-bold mt-1">
              Validación OCR en tiempo real via Azure/Gemini
            </p>
          </div>
          <div className="p-3 bg-surface border border-base rounded-2xl hidden md:block">
             <p className="text-[10px] font-black text-dim uppercase tracking-widest">Capacidad de Lote: 50 PDFs</p>
          </div>
        </div>
        <div className="glass-card p-3 shadow-2xl shadow-indigo-500/5">
          <DropZone
            onUpload={handleUpload}
            uploading={uploading}
            uploadProgress={uploadProgress}
            error={error}
            onClearError={clearError}
          />
        </div>
      </section>

      <div className="divider-gradient !my-12" />

      {/* Tabla de sesión */}
      <section aria-label="Facturas procesadas en esta sesión" className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <h3 className="text-xl font-black text-main uppercase tracking-tight">Extracto de Sesión</h3>
             <span className="px-4 py-1.5 rounded-full bg-indigo-500/10 text-brand-primary text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
               {invoices.length} archivos detectados
             </span>
          </div>
        </div>
        <InvoiceTable
          invoices={invoices}
          onConfirm={handleConfirm}
          isConfirming={uploading}
          onRemove={removeInvoice}
          onUpdate={updateInvoice}
        />
      </section>

      {/* Footer */}
      <footer className="pt-20 pb-12 mt-20 border-t border-base">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <h4 className="text-lg font-black brand-gradient-text uppercase">FacturaScan Pro</h4>
            <p className="text-xs text-dim font-bold uppercase tracking-[0.2em] opacity-60">
               Infraestructura Administrativa Inteligente
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-10">
            <div className="space-y-3">
               <p className="text-[10px] font-black text-main uppercase tracking-widest">Recursos</p>
               <ul className="space-y-2">
                  <li>
                    <a href={`${BASE_URL}/docs`} target="_blank" rel="noopener noreferrer" className="text-xs text-dim hover:text-brand-primary font-bold transition-colors">
                      Documentación API
                    </a>
                  </li>
                  <li>
                    <span className="text-xs text-dim font-bold cursor-help">Soporte Técnico</span>
                  </li>
               </ul>
            </div>
            <div className="space-y-3 text-right">
               <p className="text-[10px] font-black text-main uppercase tracking-widest">Legal</p>
               <p className="text-xs text-dim font-bold">© 2026 Cuentas Claras S.A.</p>
            </div>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}

import LandingPage from "./components/LandingPage";

export default function App() {
  return <AppContent />;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { stats } = useInvoices();
  const { cuit } = useAuth();

  // Mapeo de rutas a tabs para el Navbar
  const activeTab = location.pathname.includes("dashboard") ? "dashboard" : "upload";

  return (
    <div className="min-h-screen flex flex-col">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          
          {/* ---- Rutas Públicas ---- */}
          {!cuit && (
            <>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}

          {/* ---- Rutas Privadas ---- */}
          {cuit && (
            <>
              <Route path="/" element={
                <>
                  <Navbar
                    totalFacturas={stats.totalFacturas}
                    activeTab={activeTab}
                    onTabChange={(tab) => navigate(tab === "dashboard" ? "/dashboard" : "/")}
                  />
                  <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-8">
                     <UploadTab />
                  </main>
                </>
              } />

              <Route path="/dashboard" element={
                <>
                  <Navbar
                    totalFacturas={stats.totalFacturas}
                    activeTab="dashboard"
                    onTabChange={(tab) => navigate(tab === "dashboard" ? "/dashboard" : "/")}
                  />
                  <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-8">
                    <motion.div
                      key="dashboard"
                      variants={pageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <DashboardPage />
                    </motion.div>
                  </main>
                </>
              } />

              <Route path="/factura/:id/verificacion" element={<VerificationPage />} />
              
              {/* Fallback para autenticados */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}

        </Routes>
      </AnimatePresence>
    </div>
  );
}

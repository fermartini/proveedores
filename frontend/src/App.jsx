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
import { useInvoices } from "./hooks/useInvoices";
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
      className="space-y-8"
    >
      {/* Hero */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wider">
          <span className="w-4 h-px bg-brand-500" />
          Plataforma ERP · AFIP/ARCA
        </div>
        <h2 className="text-3xl font-bold text-white">
          Procesamiento masivo de{" "}
          <span className="brand-gradient-text">facturas PDF</span>
        </h2>
        <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
          Subí tus facturas electrónicas AFIP/ARCA y extraé automáticamente
          CUIT, CAE, importes y el link de verificación corregido.
          Los datos se guardan en Firestore listos para tu ERP.
        </p>
      </section>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Métricas del sistema">
        <StatsCard
          index={0}
          icon={<FileText size={20} />}
          label="Total Facturas"
          value={stats.totalFacturas}
          sublabel={`${stats.procesadas} procesadas correctamente`}
          color="text-brand-400"
          bgColor="bg-brand-500/10"
        />
        <StatsCard
          index={1}
          icon={<DollarSign size={20} />}
          label="Importe Total"
          value={formatARSShort(stats.totalImporte)}
          sublabel="Suma de todos los comprobantes"
          color="text-emerald-400"
          bgColor="bg-emerald-500/10"
        />
        <StatsCard
          index={2}
          icon={<Clock size={20} />}
          label="Pend. de Pago"
          value={stats.pendientesPago}
          sublabel="Facturas sin confirmar pago"
          color="text-amber-400"
          bgColor="bg-amber-500/10"
        />
        <StatsCard
          index={3}
          icon={<CheckCircle2 size={20} />}
          label="Con Errores"
          value={stats.errores}
          sublabel={stats.errores > 0 ? "Revisar PDFs con problemas" : "Sin errores"}
          color={stats.errores > 0 ? "text-red-400" : "text-slate-500"}
          bgColor={stats.errores > 0 ? "bg-red-500/10" : "bg-slate-700/30"}
        />
      </section>

      <div className="divider-gradient" />

      {/* Dropzone */}
      <section aria-label="Cargar facturas PDF">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-300">Carga de archivos</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Soporta facturas tipo A, B y C · Extracción automática de QR y texto
          </p>
        </div>
        <DropZone
          onUpload={handleUpload}
          uploading={uploading}
          uploadProgress={uploadProgress}
          error={error}
          onClearError={clearError}
        />
      </section>

      <div className="divider-gradient" />

      {/* Tabla de sesión */}
      <section aria-label="Facturas procesadas en esta sesión">
        <InvoiceTable
          invoices={invoices}
          onConfirm={handleConfirm}
          isConfirming={uploading}
          onRemove={removeInvoice}
          onUpdate={updateInvoice}
        />
      </section>

      {/* Footer */}
      <footer className="pb-6 text-center">
        <p className="text-xs text-slate-700">
          FacturaScan AFIP/ARCA · Motor de extracción v1.0 ·{" "}
          <a
            href={`${BASE_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-brand-400 transition-colors"
          >
            API Docs
          </a>
        </p>
      </footer>
    </motion.div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { stats } = useInvoices();

  // Mapeo de rutas a tabs para el Navbar
  const activeTab = location.pathname.includes("dashboard") ? "dashboard" : "upload";

  return (
    <div className="min-h-screen flex flex-col">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          
          {/* Layout Principal con Navbar */}
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

          {/* Nueva Vista de Verificación */}
          <Route path="/factura/:id/verificacion" element={<VerificationPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

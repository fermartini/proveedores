/**
 * App.jsx
 * -------
 * Componente raíz con navegación por tabs:
 *   - "upload": Carga y procesamiento de facturas PDF.
 *   - "dashboard": Listado de facturas en Firestore con gestión de estado.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, DollarSign, Clock, CheckCircle2,
} from "lucide-react";

import Navbar        from "./components/Navbar";
import StatsCard     from "./components/StatsCard";
import DropZone      from "./components/DropZone";
import InvoiceTable  from "./components/InvoiceTable";
import DashboardPage from "./components/DashboardPage";
import { useInvoices } from "./hooks/useInvoices";
import { BASE_URL } from "./services/api";

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export default function App() {
  const [activeTab, setActiveTab] = useState("upload");

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
  } = useInvoices();

  const formatARSShort = (v) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
    return new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS", minimumFractionDigits: 0,
    }).format(v);
  };

  return (
    <div className="min-h-screen flex flex-col">

      {/* ---- Navbar con tabs ---- */}
      <Navbar
        totalFacturas={stats.totalFacturas}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* ---- Contenido principal ---- */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-8">
        <AnimatePresence mode="wait">

          {/* ================================================================
              TAB: UPLOAD
          ================================================================ */}
          {activeTab === "upload" && (
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
          )}

          {/* ================================================================
              TAB: DASHBOARD
          ================================================================ */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <DashboardPage />
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

/**
 * App.jsx
 * -------
 * Componente raíz de la aplicación FacturaScan AFIP.
 *
 * Estructura del layout:
 *   - Navbar (sticky top)
 *   - Hero section con título y descripción
 *   - StatsCards (4 métricas principales)
 *   - DropZone (upload de PDFs)
 *   - InvoiceTable (dashboard de facturas)
 */

import { motion } from "framer-motion";
import {
  FileText, DollarSign, Clock, CheckCircle2,
} from "lucide-react";

import Navbar      from "./components/Navbar";
import StatsCard   from "./components/StatsCard";
import DropZone    from "./components/DropZone";
import InvoiceTable from "./components/InvoiceTable";
import { useInvoices } from "./hooks/useInvoices";

export default function App() {
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

  // Formatea número como moneda ARS abreviada para StatsCards
  const formatARSShort = (v) => {
    if (v >= 1_000_000)
      return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)
      return `$${(v / 1_000).toFixed(1)}K`;
    return new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS", minimumFractionDigits: 0,
    }).format(v);
  };

  return (
    <div className="min-h-screen flex flex-col">

      {/* ---- Navbar ---- */}
      <Navbar totalFacturas={stats.totalFacturas} />

      {/* ---- Contenido principal ---- */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-8 space-y-8">

        {/* ---- Hero ---- */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
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
        </motion.section>

        {/* ---- Stats Cards ---- */}
        <section
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          aria-label="Métricas del sistema"
        >
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

        {/* ---- Divider ---- */}
        <div className="divider-gradient" />

        {/* ---- Upload Section ---- */}
        <section aria-label="Cargar facturas PDF">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-300">
              Carga de archivos
            </h3>
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

        {/* ---- Divider ---- */}
        <div className="divider-gradient" />

        {/* ---- Dashboard de Facturas ---- */}
        <section aria-label="Dashboard de facturas procesadas">
          <InvoiceTable 
            invoices={invoices} 
            onConfirm={handleConfirm} 
            isConfirming={uploading} 
            onRemove={removeInvoice}
          />
        </section>

        {/* ---- Footer ---- */}
        <footer className="pb-6 text-center">
          <p className="text-xs text-slate-700">
            FacturaScan AFIP/ARCA · Motor de extracción v1.0 ·{" "}
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-brand-400 transition-colors"
            >
              API Docs
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

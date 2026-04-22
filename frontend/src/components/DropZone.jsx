/**
 * components/DropZone.jsx
 * -----------------------
 * Zona de drag & drop para subir múltiples PDFs de facturas.
 *
 * Características:
 *   - Animaciones con Framer Motion (hover, drag active, idle pulse).
 *   - Aceptación de múltiples archivos PDF simultáneamente.
 *   - Preview de archivos seleccionados con opción de eliminar.
 *   - Progress bar durante el upload.
 *   - Validación de tipo de archivo (solo PDF).
 *   - Compatible con mobile (input file tap).
 */

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, X, Loader2, CheckCircle, AlertCircle, Sparkles
} from "lucide-react";

/**
 * @param {object}   props
 * @param {function} props.onUpload      - Callback con File[] cuando el usuario confirma.
 * @param {boolean}  props.uploading     - ¿Hay un upload en curso?
 * @param {number}   props.uploadProgress - Progreso 0-100.
 * @param {string}   [props.error]       - Mensaje de error a mostrar.
 */
export default function DropZone({ onUpload, uploading, uploadProgress, error }) {
  // Archivos seleccionados (antes de procesar)
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [justUploaded, setJustUploaded] = useState(false);

  // ---- react-dropzone config ----
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      console.warn("Archivos rechazados:", rejectedFiles);
    }
    setSelectedFiles((prev) => {
      // Evitar duplicados por nombre
      const existingNames = new Set(prev.map((f) => f.name));
      const newFiles = acceptedFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
    setJustUploaded(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"]
    },
    multiple: true,
    disabled: uploading,
  });

  // ---- Handlers ----
  const removeFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0 || uploading) return;
    await onUpload(selectedFiles);
    setSelectedFiles([]);
    setJustUploaded(true);
    setTimeout(() => setJustUploaded(false), 3000);
  };

  // ---- Render ----
  return (
    <div className="w-full space-y-6">

      {/* ---- Zona de drop ---- */}
      <motion.div
        {...getRootProps()}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`
          relative overflow-hidden rounded-3xl border-2 border-dashed cursor-pointer
          transition-all duration-500 select-none group/dz
          ${isDragActive
            ? "border-indigo-500 bg-indigo-500/5 scale-[1.01] shadow-2xl shadow-indigo-500/10"
            : "border-base hover:border-indigo-400 bg-surface/50 hover:bg-surface"
          }
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
        style={{ minHeight: "260px" }}
      >
        <input {...getInputProps()} id="file-dropzone-input" />

        {/* Fondo animado cuando está activo el drag */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(99,102,241,0.1) 0%, transparent 80%)",
              }}
            />
          )}
        </AnimatePresence>

        {/* Contenido central */}
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center h-full min-h-[260px]">
          <motion.div
            animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className={`
              w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl
              ${isDragActive ? "bg-indigo-500 text-white" : "bg-surface border border-base text-muted group-hover/dz:bg-indigo-50 group-hover/dz:border-indigo-200 group-hover/dz:text-indigo-500 dark:group-hover/dz:bg-indigo-900/20"}
              transition-all duration-300
            `}
          >
            <Upload size={32} />
          </motion.div>

          {isDragActive ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                ¡Soltalo acá!
              </p>
              <p className="text-sm text-dim font-bold uppercase tracking-widest">
                Listos para el escaneo
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-black text-main">
                Arrastrá tus comprobantes
              </p>
              <p className="text-sm text-muted font-medium">
                Soportamos PDF, JPG y PNG. Máximo 50 archivos simultáneos.
              </p>
              <div className="flex flex-wrap justify-center items-center gap-3 mt-6">
                {["Factura A", "B", "C"].map((tipo) => (
                  <div
                    key={tipo}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-base text-[10px] font-bold text-muted uppercase tracking-wider"
                  >
                    <FileText size={10} />
                    Tipo {tipo}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ---- Lista de archivos seleccionados ---- */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                     <FileText size={16} className="text-indigo-500" />
                   </div>
                   <p className="text-sm font-black text-main">
                    {selectedFiles.length} archivo{selectedFiles.length > 1 ? "s" : ""} preparado{selectedFiles.length > 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-xs font-bold text-dim hover:text-red-500 transition-colors uppercase tracking-widest"
                >
                  Limpiar cola
                </button>
              </div>

              {/* Scroll container para muchos archivos */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {selectedFiles.map((file, idx) => (
                  <motion.div
                    key={file.name + idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-surface/50 border border-base group hover:border-indigo-300 transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-muted group-hover:text-indigo-500 transition-colors">
                       <FileText size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-main truncate">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-dim font-medium uppercase">
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-dim hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      aria-label="Eliminar archivo"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Botón de procesar */}
              <div className="pt-4 flex justify-end">
                <button
                  id="btn-process-invoices"
                  onClick={handleProcess}
                  disabled={uploading || selectedFiles.length === 0}
                  className="btn-primary w-full sm:w-auto min-w-[200px]"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Iniciar Extracción Masiva
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Progress bar ---- */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                 <Loader2 size={18} className="animate-spin text-indigo-500" />
                 <div>
                    <p className="text-sm font-black text-main uppercase tracking-tight">Extrayendo datos corporativos</p>
                    <p className="text-xs text-dim font-medium">Validando QR y OCR via IA...</p>
                 </div>
              </div>
              <span className="text-lg font-black text-indigo-500">{uploadProgress}%</span>
            </div>
            <div className="w-full h-3 bg-surface rounded-full overflow-hidden border border-base">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: "var(--brand-gradient)",
                  width: `${uploadProgress}%`,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Feedback de éxito ---- */}
      <AnimatePresence>
        {justUploaded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 p-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg">
               <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-800 dark:text-emerald-400">¡Extracción completada!</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">Tus facturas están listas para revisión en la lista inferior.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Error ---- */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 rounded-3xl bg-red-500/10 border border-red-500/20 shadow-lg shadow-red-500/5"
          >
            <div className="w-10 h-10 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg flex-shrink-0">
               <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-red-800 dark:text-red-400">Se produjo un error</p>
              <p className="text-xs text-red-600 dark:text-red-500 font-medium">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

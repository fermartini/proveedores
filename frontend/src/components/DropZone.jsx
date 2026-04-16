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
    <div className="w-full space-y-4">

      {/* ---- Zona de drop ---- */}
      <motion.div
        {...getRootProps()}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`
          relative overflow-hidden rounded-2xl border-2 border-dashed cursor-pointer
          transition-all duration-300 select-none
          ${isDragActive
            ? "border-brand-500 bg-brand-500/10 scale-[1.01]"
            : "border-slate-600 hover:border-slate-500 bg-slate-800/30 hover:bg-slate-800/50"
          }
          ${uploading ? "pointer-events-none opacity-70" : ""}
        `}
        style={{ minHeight: "200px" }}
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
                  "radial-gradient(ellipse at center, rgba(59,130,246,0.15) 0%, transparent 70%)",
              }}
            />
          )}
        </AnimatePresence>

        {/* Contenido central */}
        <div className="relative z-10 flex flex-col items-center justify-center p-10 text-center">
          <motion.div
            animate={isDragActive ? { scale: 1.15 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`
              w-16 h-16 rounded-2xl flex items-center justify-center mb-4
              ${isDragActive ? "bg-brand-500/20" : "bg-slate-700/60"}
              transition-colors duration-300
            `}
          >
            <Upload
              size={28}
              className={isDragActive ? "text-brand-400" : "text-slate-400"}
            />
          </motion.div>

          {isDragActive ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <p className="text-lg font-semibold text-brand-400">
                Soltá los archivos aquí
              </p>
              <p className="text-sm text-brand-300/70 mt-1">
                Se agregarán a la cola de procesamiento
              </p>
            </motion.div>
          ) : (
            <>
              <p className="text-base font-semibold text-slate-200">
                Arrastrá tus facturas PDF o Imágenes aquí
              </p>
              <p className="text-sm text-slate-500 mt-1.5">
                o{" "}
                <span className="text-brand-400 hover:text-brand-300 transition-colors">
                  hacé click para seleccionar
                </span>
              </p>
              <div className="flex items-center gap-4 mt-4">
                {["Facturas A", "Facturas B", "Facturas C"].map((tipo) => (
                  <div
                    key={tipo}
                    className="flex items-center gap-1.5 text-xs text-slate-500"
                  >
                    <FileText size={11} className="text-slate-600" />
                    {tipo}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-3">
                Máximo 50 archivos · Formato PDF, JPG o PNG
              </p>
            </>
          )}
        </div>
      </motion.div>

      {/* ---- Lista de archivos seleccionados ---- */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-4 space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-300">
                  {selectedFiles.length} archivo{selectedFiles.length > 1 ? "s" : ""} seleccionado{selectedFiles.length > 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Limpiar todo
                </button>
              </div>

              {/* Scroll container para muchos archivos */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {selectedFiles.map((file, idx) => (
                  <motion.div
                    key={file.name + idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-800/60 group"
                  >
                    <FileText size={13} className="text-brand-400 flex-shrink-0" />
                    <span className="text-xs text-slate-300 truncate flex-1 font-mono">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-slate-600 flex-shrink-0">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                    <button
                      onClick={() => removeFile(idx)}
                      className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      aria-label="Eliminar archivo"
                    >
                      <X size={13} />
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Botón de procesar */}
              <div className="pt-2 flex justify-end">
                <button
                  id="btn-process-invoices"
                  onClick={handleProcess}
                  disabled={uploading || selectedFiles.length === 0}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Procesar {selectedFiles.length} factura{selectedFiles.length > 1 ? "s" : ""}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-300 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-brand-400" />
                Extrayendo datos de las facturas...
              </p>
              <span className="text-sm font-mono text-brand-400">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                  width: `${uploadProgress}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Feedback de éxito ---- */}
      <AnimatePresence>
        {justUploaded && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
          >
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-sm text-emerald-400">
              ¡Facturas procesadas y guardadas exitosamente!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Error ---- */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30"
          >
            <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-400">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

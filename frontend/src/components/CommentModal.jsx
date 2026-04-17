/**
 * components/CommentModal.jsx
 * ---------------------------
 * Modal para editar el comentario de una factura.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Save } from "lucide-react";

export default function CommentModal({ isOpen, onClose, onSave, initialValue, invoiceInfo }) {
  const [text, setText] = useState(initialValue || "");

  useEffect(() => {
    if (isOpen) setText(initialValue || "");
  }, [isOpen, initialValue]);

  const handleSave = () => {
    onSave(text);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101] px-4"
          >
            <div className="bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-slate-800/50 px-6 py-4 flex items-center justify-between border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center text-brand-400">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px]">Comentarios</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{invoiceInfo}</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Escribí un comentario u observación para esta factura..."
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all resize-none font-sans leading-relaxed"
                />
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-800/30 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-500/10 active:scale-95"
                >
                  <Save size={14} />
                  GUARDAR COMENTARIO
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

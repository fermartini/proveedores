import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Building2, DollarSign, Percent, AlertCircle } from "lucide-react";

export default function EditInvoiceModal({ isOpen, invoice, onSave, onClose }) {
  const [formData, setFormData] = useState({
    razon_social: "",
    importe_neto: 0,
    iva: 0,
    total: 0
  });

  useEffect(() => {
    if (invoice) {
      setFormData({
        razon_social: invoice.razon_social || invoice.cuit_emisor || "",
        importe_neto: invoice.importe_neto || 0,
        iva: invoice.iva || 0,
        total: invoice.total || 0
      });
    }
  }, [invoice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numValue = name === "razon_social" ? value : parseFloat(value) || 0;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: numValue };
      
      // Si se cambia el neto o el iva, recalcular total
      if (name === "importe_neto" || name === "iva") {
        newData.total = Number((newData.importe_neto + newData.iva).toFixed(2));
      }
      // Si se cambia el total y tenemos un neto, recalcular IVA (opcional, pero ayuda)
      if (name === "total") {
        newData.iva = Number((newData.total - newData.importe_neto).toFixed(2));
      }
      
      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-surface border border-base rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-base bg-surface-hover/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-main leading-tight">Editar Factura</h3>
                <p className="text-[10px] text-dim font-bold uppercase tracking-widest">Ajuste manual de valores</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-surface-hover flex items-center justify-center text-dim transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Razon Social */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Proveedor / Razón Social</label>
              <div className="relative group">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-brand-primary transition-colors" size={18} />
                <input
                  type="text"
                  name="razon_social"
                  value={formData.razon_social}
                  onChange={handleChange}
                  placeholder="Nombre del proveedor"
                  className="input-base pl-12 bg-surface-hover/30 border-base focus:border-brand-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Neto */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Importe Neto</label>
                <div className="relative group">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-brand-primary transition-colors" size={16} />
                  <input
                    type="number"
                    step="0.01"
                    name="importe_neto"
                    value={formData.importe_neto}
                    onChange={handleChange}
                    className="input-base pl-10 bg-surface-hover/30 border-base focus:border-brand-primary text-right font-black"
                    required
                  />
                </div>
              </div>

              {/* IVA */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">IVA</label>
                <div className="relative group">
                  <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-brand-primary transition-colors" size={16} />
                  <input
                    type="number"
                    step="0.01"
                    name="iva"
                    value={formData.iva}
                    onChange={handleChange}
                    className="input-base pl-10 bg-surface-hover/30 border-base focus:border-brand-primary text-right font-black"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-black text-dim uppercase tracking-widest ml-1">Total Comprobante</label>
              <div className="relative group">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary" size={18} />
                <input
                  type="number"
                  step="0.01"
                  name="total"
                  value={formData.total}
                  onChange={handleChange}
                  className="input-base pl-12 bg-brand-primary/5 border-brand-primary/20 text-brand-primary text-xl font-black text-right focus:border-brand-primary shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]"
                  required
                />
              </div>
              <p className="flex items-center gap-1.5 text-[9px] text-amber-500 font-bold uppercase tracking-tighter mt-1 ml-1">
                <AlertCircle size={10} />
                Verificá que coincida con el total del PDF
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 rounded-2xl border border-base font-black text-xs uppercase tracking-widest text-dim hover:bg-surface-hover transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-[1.5] btn-primary px-6 py-4 shadow-xl shadow-brand-primary/20"
              >
                <Save size={18} />
                Guardar Cambios
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

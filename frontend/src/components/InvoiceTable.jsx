/**
 * components/InvoiceTable.jsx
 * ---------------------------
 * Tabla elegante de facturas procesadas con búsqueda, ordenamiento y descarga ZIP.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  FileX, ChevronLeft, ChevronRight, Archive, CheckCircle2
} from "lucide-react";
import InvoiceRow from "./InvoiceRow";
import { useInvoiceContext } from "../context/InvoiceContext";

const PAGE_SIZE = 50;

const COLUMNS = [
  { key: "status",       label: "Estado",        sortable: false, align: "left"  },
  { key: "razon_social", label: "Proveedor",      sortable: true,  align: "left"  },
  { key: "numero",       label: "Nro. Factura",   sortable: true,  align: "left"  },
  { key: "fecha",        label: "Fecha",          sortable: true,  align: "left"  },
  { key: "importe_neto", label: "Neto",           sortable: true,  align: "right" },
  { key: "iva",          label: "IVA",            sortable: true,  align: "right" },
  { key: "otros",        label: "Otros / Ret",    sortable: true,  align: "right" },
  { key: "total",        label: "Total",          sortable: true,  align: "right" },
  { key: "cuenta",       label: "Cuenta",         sortable: false, align: "left"  },
  { key: "acciones",     label: "Copiar",         sortable: false, align: "center"},
  { key: "eliminar",     label: "Quitar",         sortable: false, align: "center"},
];

function SortIcon({ column, sortKey, sortDir }) {
  if (sortKey !== column) return <ChevronsUpDown size={12} className="text-slate-600" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="text-brand-400" />
    : <ChevronDown size={12} className="text-brand-400" />;
}

export default function InvoiceTable({ invoices, onConfirm, isConfirming, onRemove, onUpdate }) {
  const { fileMap } = useInvoiceContext();
  const [search, setSearch]     = useState("");
  const [sortKey, setSortKey]   = useState("fecha");
  const [sortDir, setSortDir]   = useState("desc");
  const [page, setPage]         = useState(1);
  const [isZipping, setIsZipping] = useState(false);

  // ---- Búsqueda y filtrado ----
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      (inv.razon_social ?? "").toLowerCase().includes(q) ||
      (inv.cuit ?? "").includes(q) ||
      (String(inv.numero ?? "")).includes(q) ||
      (inv.filename ?? "").toLowerCase().includes(q)
    );
  }, [invoices, search]);

  // ---- Ordenamiento ----
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      if (typeof aVal === "string" || typeof bVal === "string") {
        return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filtered, sortKey, sortDir]);

  // ---- Paginación ----
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  // ---- Descarga en Lote (ZIP) ----
  const handleDownloadZip = async () => {
    if (invoices.length === 0) return;
    setIsZipping(true);
    const zip = new JSZip();

    try {
      const mergedPdf = await PDFDocument.create();
      let hasValidPages = false;

      // Usamos el array original de invoices para mantener el orden
      const promises = invoices.map(async (inv) => {
        const blobUrl = fileMap[inv.id];
        if (!blobUrl) return null;

        try {
          const response = await fetch(blobUrl);
          const blob = await response.blob();
          
          const pv = String(inv.punto_venta ?? "0").padStart(4, "0");
          const nro = String(inv.numero ?? "0").padStart(8, "0");
          const cleanName = (inv.razon_social ?? "PROVEEDOR")
            .replace(/[/\\?%*:|"<>]/g, "-") // Sanitizar
            .toUpperCase();
          
          const fileName = `${cleanName}_${pv}-${nro}.pdf`;
          zip.file(fileName, blob);

          return { blob, inv };
        } catch (e) {
          console.error(`Error al procesar ${inv.filename}:`, e);
          return null;
        }
      });

      const fetchedResults = await Promise.all(promises);

      // Ahora procesamos en orden para el PDF UNIFICADO
      for (const res of fetchedResults) {
        if (!res) continue;
        const { blob } = res;
        const arrayBuffer = await blob.arrayBuffer();

        try {
          if (blob.type === "application/pdf") {
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
            hasValidPages = true;
          } else if (blob.type.includes("image")) {
            // Soporte para imágenes en el PDF unificado
            let image;
            if (blob.type.includes("png")) {
              image = await mergedPdf.embedPng(arrayBuffer);
            } else {
              image = await mergedPdf.embedJpg(arrayBuffer);
            }
            
            const page = mergedPdf.addPage();
            const { width, height } = image.scale(1);
            
            // Ajustar imagen a la página (con margen)
            const scale = Math.min(page.getWidth() / width, page.getHeight() / height) * 0.9;
            const x = (page.getWidth() - width * scale) / 2;
            const y = (page.getHeight() - height * scale) / 2;
            
            page.drawImage(image, { x, y, width: width * scale, height: height * scale });
            hasValidPages = true;
          }
        } catch (err) {
          console.error("Error al unir archivo al PDF:", err);
        }
      }

      if (hasValidPages) {
        const mergedPdfBytes = await mergedPdf.save();
        zip.file("TODAS_LAS_FACTURAS_UNIFICADAS.pdf", mergedPdfBytes);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `Lote_Facturas_${new Date().toISOString().split('T')[0]}.zip`;
      link.click();
    } catch (err) {
      alert("Error al generar el ZIP");
    } finally {
      setIsZipping(false);
    }
  };

  const handleConfirmClick = () => {
    const errorCount = invoices.filter(i => i.status !== "procesado").length;
    if (errorCount > 0) {
      const exclude = window.confirm(`Hay ${errorCount} facturas con errores. ¿Enviar solo las válidas?`);
      if (exclude) onConfirm("valid_only");
      else if (window.confirm("¿Forzar envío de TODAS (incluyendo errores)?")) onConfirm("all");
    } else {
      onConfirm("valid_only");
    }
  };

  const totals = useMemo(() => ({
    total: filtered.reduce((s, i) => s + (i.total ?? 0), 0),
  }), [filtered]);

  const formatARS = (v) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(v);

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Facturas procesadas</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {invoices.length} registro{invoices.length !== 1 ? "s" : ""} · {filtered.length} filtrados
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar proveedor, CUIT..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-8"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/30">
              {COLUMNS.map((col) => (
                <th key={col.key} onClick={() => col.sortable && handleSort(col.key)} className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 ${col.align === "right" ? "text-right" : ""} ${col.align === "center" ? "text-center" : ""} ${col.sortable ? "cursor-pointer hover:text-slate-300" : ""}`}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon column={col.key} sortKey={sortKey} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {paginated.length > 0 ? (
                paginated.map((invoice, idx) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} index={idx} onRemove={() => onRemove(invoice.id)} onUpdate={(data) => onUpdate(invoice.id, data)} />
                ))
              ) : (
                <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={COLUMNS.length} className="px-4 py-20 text-center text-slate-500">
                    {search ? "Sin resultados" : "No hay facturas procesadas"}
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-700/50 bg-slate-800/30">
                <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-slate-400">TOTALES ({filtered.length})</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-brand-400 font-mono">{formatARS(totals.total)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="px-6 py-4 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping || invoices.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white text-sm font-bold transition-all disabled:opacity-50"
          >
            <Archive size={16} className={isZipping ? "animate-pulse" : ""} />
            {isZipping ? "Generando ZIP..." : "Bajar LOTE (ZIP Renombrado)"}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirmClick}
            disabled={isConfirming || invoices.length === 0}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-brand-500/20"
          >
            <CheckCircle2 size={16} />
            {isConfirming ? "Guardando en DB..." : "Confirmar a Base de Datos"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  FileX, ChevronLeft, ChevronRight, Archive, CheckCircle2, Download
} from "lucide-react";
import * as XLSX from "xlsx";
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

  const handleExportExcel = () => {
    if (invoices.length === 0) return;
    const data = sorted.map(i => ({
      "Proveedor": i.razon_social,
      "CUIT": i.cuit,
      "Tipo": i.tipo_factura,
      "Punto Venta": i.punto_venta,
      "Número": i.numero,
      "Fecha": i.fecha,
      "Importe Neto": i.importe_neto,
      "IVA": i.iva,
      "Otros/Ret": i.otros_tributos,
      "Total": i.total,
      "Moneda": i.moneda || "ARS",
      "Cuenta": i.cuenta_contable || "SIN CTA",
      "Archivo": i.filename
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturas");
    XLSX.writeFile(wb, `Exportacion_Session_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleConfirmClick = () => {
    const errorCount = invoices.filter(i => i.status !== "recibida").length;
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
      <div className="px-8 py-6 border-b border-base flex flex-col md:flex-row md:items-center gap-4 justify-between bg-surface/30">
        <div>
          <h2 className="text-xl font-black text-main flex items-center gap-2">
            Facturas procesadas
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 uppercase tracking-tighter">
               Sesión Activa
            </span>
          </h2>
          <p className="text-xs text-dim mt-1 font-bold">
            {invoices.length} archivos totales · <span className="text-main">{filtered.length}</span> resultados filtrados
          </p>
        </div>

        <div className="relative w-full md:w-80 group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-brand-primary transition-colors pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrar por proveedor, CUIT o #..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-12 bg-surface hover:bg-surface/80"
          />
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-base bg-surface">
              {COLUMNS.map((col) => (
                <th 
                  key={col.key} 
                  onClick={() => col.sortable && handleSort(col.key)} 
                  className={`
                    px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-muted
                    ${col.align === "right" ? "text-right" : ""} 
                    ${col.align === "center" ? "text-center" : ""} 
                    ${col.sortable ? "cursor-pointer hover:text-brand-primary group/th" : ""}
                    transition-colors duration-200
                  `}
                >
                  <span className={`inline-flex items-center gap-2 ${col.align === "right" ? "justify-end" : ""} ${col.align === "center" ? "justify-center" : ""}`}>
                    {col.label}
                    {col.sortable && <SortIcon column={col.key} sortKey={sortKey} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-base">
            <AnimatePresence mode="popLayout">
              {paginated.length > 0 ? (
                paginated.map((invoice, idx) => (
                  <InvoiceRow 
                    key={invoice.id} 
                    invoice={invoice} 
                    index={idx} 
                    onRemove={() => onRemove(invoice.id)} 
                    onUpdate={(data) => onUpdate(invoice.id, data)} 
                  />
                ))
              ) : (
                <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={COLUMNS.length} className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center gap-3">
                       <div className="w-16 h-16 rounded-full bg-surface border border-base flex items-center justify-center text-dim">
                          <Search size={24} />
                       </div>
                       <p className="text-base font-black text-main">
                          {search ? "Sin resultados para tu búsqueda" : "No detectamos facturas"}
                       </p>
                       <p className="text-sm text-dim font-medium max-w-xs mx-auto">
                          Subí tus comprobantes arriba para verlos listados aquí automáticamente.
                       </p>
                    </div>
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-base bg-surface-hover/30">
                <td colSpan={7} className="px-6 py-5 text-sm font-black text-muted uppercase tracking-tighter">
                   Monto Total de los Comprobantes Listados
                </td>
                <td className="px-6 py-5 text-right text-lg font-black brand-gradient-text">
                  {formatARS(totals.total)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="px-8 py-6 border-t border-base flex flex-col sm:flex-row items-center justify-between gap-6 bg-surface/50">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping || invoices.length === 0}
            className="btn-ghost"
          >
            <Archive size={18} className={isZipping ? "animate-pulse" : ""} />
            {isZipping ? "Empaquetando..." : "Descargar Lote ZIP"}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={invoices.length === 0}
            className="btn-success"
          >
            <Download size={18} />
            Exportar Excel
          </button>
        </div>

        <div className="flex gap-4 w-full sm:w-auto">
          <button
            onClick={handleConfirmClick}
            disabled={isConfirming || invoices.length === 0}
            className="btn-primary w-full sm:min-w-[240px]"
          >
            <CheckCircle2 size={18} />
            {isConfirming ? "Guardando cambios..." : "Guardar sesión en Firestore"}
          </button>
        </div>
      </div>
    </div>
  );
}

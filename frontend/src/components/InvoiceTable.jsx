/**
 * components/InvoiceTable.jsx
 * ---------------------------
 * Tabla elegante de facturas procesadas con búsqueda, ordenamiento y estado vacío.
 *
 * Características:
 *   - Búsqueda en tiempo real por Razón Social, CUIT o número de factura.
 *   - Ordenamiento por columna (click en header).
 *   - Paginación (10 registros por página).
 *   - Estado vacío con ilustración.
 *   - Totales en el footer.
 *   - Scroll horizontal en pantallas pequeñas.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  FileX, ChevronLeft, ChevronRight,
} from "lucide-react";
import InvoiceRow from "./InvoiceRow";

const PAGE_SIZE = 10;

// Columnas de la tabla con sus configuraciones
const COLUMNS = [
  { key: "status",       label: "Estado",        sortable: false, align: "left"  },
  { key: "razon_social", label: "Proveedor",      sortable: true,  align: "left"  },
  { key: "numero",       label: "Nro. Factura",   sortable: false, align: "left"  },
  { key: "fecha",        label: "Fecha",          sortable: true,  align: "left"  },
  { key: "total",        label: "Total",          sortable: true,  align: "right" },
  { key: "cuenta",       label: "Cuenta",         sortable: false, align: "left"  },
  { key: "acciones",     label: "Copiar",         sortable: false, align: "center"},
  { key: "estados",      label: "Estado ERP",     sortable: false, align: "left"  },
];

// Ícono de ordenamiento
function SortIcon({ column, sortKey, sortDir }) {
  if (sortKey !== column) return <ChevronsUpDown size={12} className="text-slate-600" />;
  return sortDir === "asc"
    ? <ChevronUp size={12} className="text-brand-400" />
    : <ChevronDown size={12} className="text-brand-400" />;
}

/**
 * @param {object}   props
 * @param {object[]} props.invoices - Lista de facturas.
 */
export default function InvoiceTable({ invoices }) {
  const [search, setSearch]     = useState("");
  const [sortKey, setSortKey]   = useState("fecha");
  const [sortDir, setSortDir]   = useState("desc");
  const [page, setPage]         = useState(1);

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
      const aVal = a[sortKey] ?? 0;
      const bVal = b[sortKey] ?? 0;
      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filtered, sortKey, sortDir]);

  // ---- Paginación ----
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  // ---- Totales footer ----
  const totals = useMemo(() => ({
    total: filtered.reduce((s, i) => s + (i.total ?? 0), 0),
  }), [filtered]);

  const formatARS = (v) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS", minimumFractionDigits: 2,
    }).format(v);

  // ---- Render ----
  return (
    <div className="glass-card overflow-hidden">

      {/* ---- Header de la tabla / buscador ---- */}
      <div className="px-6 py-4 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">
            Facturas procesadas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {invoices.length} registro{invoices.length !== 1 ? "s" : ""} en total
            {filtered.length !== invoices.length && ` · ${filtered.length} filtradas`}
          </p>
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-64">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            id="invoice-search-input"
            type="text"
            placeholder="Buscar proveedor, CUIT..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-8"
          />
        </div>
      </div>

      {/* ---- Tabla ---- */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-800/30">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`
                    px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500
                    ${col.align === "right" ? "text-right" : ""}
                    ${col.align === "center" ? "text-center" : ""}
                    ${col.sortable ? "cursor-pointer hover:text-slate-300 select-none" : ""}
                    transition-colors duration-150
                  `}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <SortIcon column={col.key} sortKey={sortKey} sortDir={sortDir} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <AnimatePresence mode="popLayout">
              {paginated.length > 0 ? (
                paginated.map((invoice, idx) => (
                  <InvoiceRow
                    key={invoice.id ?? invoice.filename ?? idx}
                    invoice={invoice}
                    index={idx}
                  />
                ))
              ) : (
                /* Estado vacío */
                <motion.tr
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <td colSpan={COLUMNS.length} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
                        <FileX size={24} className="text-slate-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-500">
                        {search
                          ? `Sin resultados para "${search}"`
                          : "Aún no hay facturas procesadas"
                        }
                      </p>
                      {!search && (
                        <p className="text-xs text-slate-600">
                          Arrastrá tus PDFs a la zona de carga para comenzar
                        </p>
                      )}
                    </div>
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>

          {/* ---- Footer con totales ---- */}
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-700/50 bg-slate-800/30">
                <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Totales ({filtered.length} facturas)
                </td>
                <td className="px-4 py-3 text-right text-xs font-bold text-brand-400 font-mono">
                  {formatARS(totals.total)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ---- Paginación ---- */}
      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-slate-700/50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost px-2 py-1 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            {/* Botones de página */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    p === page
                      ? "bg-brand-600 text-white"
                      : "text-slate-400 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-ghost px-2 py-1 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

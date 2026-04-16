/**
 * components/DashboardPage.jsx
 * ----------------------------
 * Dashboard de facturas persistidas en Firestore.
 * Permite ver, filtrar y cambiar el estado de pagada/autorizada.
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Search, DollarSign, CheckCircle2,
  Clock, TrendingUp, ExternalLink, ChevronUp, ChevronDown,
  ChevronsUpDown, FileX, Filter,
} from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";

// ---------------------------------------------------------------------------
// Helpers de formateo
// ---------------------------------------------------------------------------
const formatARS = (v) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(v ?? 0);

const formatARSShort = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return formatARS(v);
};

// ---------------------------------------------------------------------------
// StatCard mini
// ---------------------------------------------------------------------------
function MiniStat({ icon, label, value, sub, color = "text-brand-400", bg = "bg-brand-500/10" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl px-5 py-4"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Toggle button para pagada / autorizada
// ---------------------------------------------------------------------------
function ToggleBtn({ value, label, onLabel, offLabel, onClick, disabled, color }) {
  const active = value === true;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={active ? `Marcar como ${offLabel}` : `Marcar como ${onLabel}`}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
        border transition-all duration-200 select-none
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105 active:scale-95"}
        ${active
          ? `${color.active} border-transparent`
          : "bg-slate-700/50 text-slate-400 border-slate-600/50 hover:bg-slate-700"
        }
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-current" : "bg-slate-500"}`} />
      {active ? onLabel : offLabel}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Fila de factura del dashboard
// ---------------------------------------------------------------------------
function DashboardRow({ invoice, onToggle, isUpdating }) {
  const isDisabled = isUpdating;

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors group"
    >
      {/* Proveedor */}
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white truncate max-w-[200px]">
            {invoice.razon_social ?? <span className="text-slate-500 italic">Sin nombre</span>}
          </p>
          <p className="text-xs text-slate-500 font-mono">{invoice.cuit_emisor ?? "—"}</p>
        </div>
      </td>

      {/* Comprobante */}
      <td className="px-4 py-3">
        <div>
          <p className="text-xs text-slate-400 font-mono">
            {invoice.punto_venta ? `${String(invoice.punto_venta).padStart(4, "0")}-` : ""}
            {invoice.numero_comprobante
              ? String(invoice.numero_comprobante).padStart(8, "0")
              : <span className="text-slate-600">—</span>
            }
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{invoice.fecha_emision ?? "—"}</p>
        </div>
      </td>

      {/* Importe */}
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-bold text-white font-mono">
          {invoice.total != null ? formatARS(invoice.total) : <span className="text-slate-600">—</span>}
        </span>
      </td>

      {/* CAE */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-slate-500 font-mono">
          {invoice.cae ? invoice.cae.slice(0, 8) + "..." : "—"}
        </span>
      </td>

      {/* Cuenta contable */}
      <td className="px-4 py-3 hidden xl:table-cell">
        <span className="text-xs text-slate-400 truncate max-w-[140px] block">
          {invoice.cuenta_contable_sugerida ?? "—"}
        </span>
      </td>

      {/* Estado Autorizada */}
      <td className="px-4 py-3 text-center">
        <ToggleBtn
          value={invoice.autorizada}
          onLabel="Autorizada"
          offLabel="Pendiente"
          onClick={() => onToggle(invoice.id, "autorizada", invoice.autorizada)}
          disabled={isDisabled}
          color={{ active: "bg-violet-500/20 text-violet-300 border border-violet-500/40" }}
        />
      </td>

      {/* Estado Pagada */}
      <td className="px-4 py-3 text-center">
        <ToggleBtn
          value={invoice.pagada}
          onLabel="Pagada"
          offLabel="Sin pagar"
          onClick={() => onToggle(invoice.id, "pagada", invoice.pagada)}
          disabled={isDisabled}
          color={{ active: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" }}
        />
      </td>

      {/* Link QR */}
      <td className="px-4 py-3 text-center">
        {invoice.url_qr_afip && invoice.url_qr_afip.startsWith("http") ? (
          <a
            href={invoice.url_qr_afip}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            <ExternalLink size={12} />
            AFIP
          </a>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>
    </motion.tr>
  );
}

// ---------------------------------------------------------------------------
// Sort Icon
// ---------------------------------------------------------------------------
function SortIcon({ col, sortKey, sortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} className="text-slate-600" />;
  return sortDir === "asc"
    ? <ChevronUp size={11} className="text-brand-400" />
    : <ChevronDown size={11} className="text-brand-400" />;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const COLS = [
  { key: "razon_social",       label: "Proveedor",       sortable: true,  align: "left"   },
  { key: "numero_comprobante", label: "Comprobante",     sortable: false, align: "left"   },
  { key: "total",              label: "Importe",         sortable: true,  align: "right"  },
  { key: "cae",                label: "CAE",             sortable: false, align: "left",  hidden: "lg" },
  { key: "cuenta",             label: "Cuenta",          sortable: false, align: "left",  hidden: "xl" },
  { key: "autorizada",         label: "Autorización",    sortable: true,  align: "center" },
  { key: "pagada",             label: "Pago",            sortable: true,  align: "center" },
  { key: "qr",                 label: "Verificar",       sortable: false, align: "center" },
];

const FILTERS = [
  { id: "all",        label: "Todas"         },
  { id: "pendiente",  label: "Sin pagar"     },
  { id: "pagada",     label: "Pagadas"       },
  { id: "autorizada", label: "Autorizadas"   },
];

const PAGE_SIZE = 20;

export default function DashboardPage() {
  const { invoices, loading, error, updatingId, stats, fetchInvoices, toggleField } = useDashboard();

  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [sortKey, setSortKey]     = useState("fecha_emision");
  const [sortDir, setSortDir]     = useState("desc");
  const [page, setPage]           = useState(1);

  // Filtrado + búsqueda
  const filtered = useMemo(() => {
    let list = [...invoices];

    if (filter === "pendiente")  list = list.filter((i) => !i.pagada);
    if (filter === "pagada")     list = list.filter((i) => i.pagada);
    if (filter === "autorizada") list = list.filter((i) => i.autorizada);

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((i) =>
        (i.razon_social ?? "").toLowerCase().includes(q) ||
        (i.cuit_emisor ?? "").includes(q) ||
        (i.numero_comprobante ?? "").includes(q) ||
        (i.fecha_emision ?? "").includes(q)
      );
    }
    return list;
  }, [invoices, filter, search]);

  // Ordenamiento
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "boolean") return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      if (typeof av === "number")  return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortKey, sortDir]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key) => {
    if (!COLS.find((c) => c.key === key)?.sortable) return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  return (
    <div className="space-y-6">

      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Dashboard de <span className="brand-gradient-text">Facturas</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {invoices.length} factura{invoices.length !== 1 ? "s" : ""} en la base de datos
          </p>
        </div>
        <button
          onClick={fetchInvoices}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700/50
                     text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* ---- Stats Cards ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          icon={<TrendingUp size={18} />}
          label="Total Facturas"
          value={stats.total}
          sub={`${formatARSShort(stats.totalImporte)} en total`}
          color="text-brand-400"
          bg="bg-brand-500/10"
        />
        <MiniStat
          icon={<Clock size={18} />}
          label="Sin Pagar"
          value={stats.pendientesPago}
          sub="Pendientes de pago"
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
        <MiniStat
          icon={<CheckCircle2 size={18} />}
          label="Pagadas"
          value={stats.pagadas}
          sub={`${formatARSShort(stats.importePagado)} abonado`}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <MiniStat
          icon={<DollarSign size={18} />}
          label="Autorizadas"
          value={stats.autorizadas}
          sub={`de ${stats.total} en total`}
          color="text-violet-400"
          bg="bg-violet-500/10"
        />
      </div>

      {/* ---- Error ---- */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* ---- Filtros + Buscador ---- */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Filtros rápidos */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f.id
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/50"
              }`}
            >
              <Filter size={10} />
              {f.label}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-64 sm:ml-auto">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            id="dashboard-search"
            type="text"
            placeholder="Buscar proveedor, CUIT..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-base pl-8 w-full text-sm"
          />
        </div>
      </div>

      {/* ---- Tabla ---- */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/30">
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`
                      px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500
                      ${col.align === "right" ? "text-right" : ""}
                      ${col.align === "center" ? "text-center" : ""}
                      ${col.sortable ? "cursor-pointer hover:text-slate-300 select-none" : ""}
                      ${col.hidden === "lg" ? "hidden lg:table-cell" : ""}
                      ${col.hidden === "xl" ? "hidden xl:table-cell" : ""}
                      transition-colors duration-150
                    `}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                // Skeleton loader
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-700/20">
                    {COLS.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 bg-slate-700/40 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <AnimatePresence mode="popLayout">
                  {paginated.length > 0 ? (
                    paginated.map((invoice) => (
                      <DashboardRow
                        key={invoice.id}
                        invoice={invoice}
                        onToggle={toggleField}
                        isUpdating={updatingId === invoice.id}
                      />
                    ))
                  ) : (
                    <motion.tr
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <td colSpan={COLS.length} className="px-4 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center">
                            <FileX size={24} className="text-slate-600" />
                          </div>
                          <p className="text-sm text-slate-500">
                            {search || filter !== "all"
                              ? "Sin resultados para el filtro aplicado"
                              : "No hay facturas en la base de datos todavía"
                            }
                          </p>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              )}
            </tbody>

            {/* Footer totales */}
            {filtered.length > 0 && !loading && (
              <tfoot>
                <tr className="border-t border-slate-700/50 bg-slate-800/20">
                  <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Totales ({filtered.length} facturas)
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-brand-400 font-mono">
                    {formatARS(filtered.reduce((s, i) => s + (i.total ?? 0), 0))}
                  </td>
                  <td colSpan={5} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-1">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

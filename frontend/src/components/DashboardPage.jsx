import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  RefreshCw, Search, DollarSign, CheckCircle2,
  Clock, TrendingUp, ChevronUp, ChevronDown,
  ChevronsUpDown, FileX, Filter, Building2,
  Copy, Check, MessageSquare, QrCode, Download,
  ChevronLeft, ChevronRight, Calendar
} from "lucide-react";

import { useDashboard } from "../hooks/useDashboard";
import CommentModal from "./CommentModal";

const PAGE_SIZE = 20;

// ... (MiniStat, CopyBtn, ToggleBtn, DashboardRow, SortIcon constants as before) ...
// (I will just replace from the imports to the end of components to be safe, 
// but keeping the logic I just added for MiniStat and others)

// ---------------------------------------------------------------------------
// StatCard mini
// ---------------------------------------------------------------------------
function MiniStat({ icon, label, value, sub, color = "text-brand-primary", bg = "bg-indigo-500/10" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card flex items-center gap-5 px-6 py-5 border-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-dim font-black uppercase tracking-[0.15em] mb-1">{label}</p>
        <p className="text-xl font-black text-main leading-none">{value}</p>
        {sub && <p className="text-xs text-dim mt-2 font-bold opacity-80">{sub}</p>}
      </div>
    </motion.div>
  );
}

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

function CopyBtn({ value, label, small = false }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error(err); }
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copiar ${label}`}
      className={`
        transition-all duration-200 p-1 rounded-md
        ${copied ? "text-emerald-400 bg-emerald-500/10" : "text-slate-500 hover:text-brand-400 hover:bg-slate-700/50"}
      `}
    >
      {copied ? <Check size={small ? 10 : 12} /> : <Copy size={small ? 10 : 12} />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Toggle button para pagada / autorizada
// ---------------------------------------------------------------------------
function ToggleBtn({ value, onLabel, offLabel, onClick, disabled, onColor, offColor }) {
  const active = value === true;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={active ? `Clic para: ${offLabel}` : `Clic para: ${onLabel}`}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold
        border transition-all duration-200 select-none
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105 active:scale-95"}
        ${active ? onColor : offColor}
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {active ? onLabel : offLabel}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Fila de factura del dashboard
// ---------------------------------------------------------------------------
function DashboardRow({ invoice, onToggle, isUpdating, onComment }) {
  const isDisabled = isUpdating;
  
  const isInvalidReceptor = invoice.status === "receptor_invalido";
  const hasComment = invoice.comentario && invoice.comentario.trim().length > 0;
  
  // Extraer fecha corta de created_at (ISO string)
  const fechaRecibido = invoice.created_at 
    ? new Date(invoice.created_at).toLocaleDateString("es-AR", { day: '2-digit', month: '2-digit' })
    : "—";

  const rowClass = isInvalidReceptor
    ? "bg-red-500/10 hover:bg-red-500/20"
    : (invoice.pagada
        ? "bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 shadow-[inset_0_0_20px_rgba(0,255,157,0.05)]"
        : (invoice.es_credito 
            ? "bg-violet-500/10 hover:bg-violet-500/20" 
            : (invoice.moneda === "USD" ? "bg-indigo-500/10 hover:bg-indigo-500/20" : "hover:bg-surface-hover")
          )
      );

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className={`border-b border-base transition-all duration-200 group ${rowClass}`}
    >
      {/* Proveedor */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${
            invoice.es_credito ? "bg-red-500/10 border-red-500/20" : (invoice.moneda === "USD" ? "bg-indigo-500/10 border-indigo-500/20" : "bg-surface border-base")
          }`}>
            <Building2 size={16} className={invoice.es_credito ? "text-red-500" : (invoice.moneda === "USD" ? "text-brand-primary" : "text-dim")} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 group/copy">
              <p className={`text-sm font-black truncate max-w-[180px] ${
                invoice.es_credito ? "text-red-500" : (invoice.moneda === "USD" ? "text-indigo-600 dark:text-indigo-400" : "text-main")
              }`}>
                {invoice.razon_social ?? <span className="text-dim italic font-medium">Sin identificar</span>}
              </p>
              <CopyBtn value={invoice.razon_social} label="Razón Social" small />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] text-dim font-black uppercase tracking-widest">{invoice.cuit_emisor ?? "—"}</p>
              <CopyBtn value={invoice.cuit_emisor} label="CUIT" small />
            </div>
          </div>
        </div>
      </td>

      {/* Comprobante */}
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter ${
              invoice.es_credito ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-surface border border-base text-muted"
            }`}>
              {invoice.tipo_factura || "FAC"}
            </span>
            <p className="text-xs text-main font-black tracking-tight">
              {invoice.punto_venta ? `${String(invoice.punto_venta).padStart(4, "0")}-` : ""}
              {invoice.numero_comprobante
                ? String(invoice.numero_comprobante).padStart(8, "0")
                : <span>—</span>
              }
            </p>
            <CopyBtn value={invoice.numero_comprobante} label="Número" small />
          </div>
        </div>
      </td>

      {/* Fecha Emision */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-xs font-bold text-dim uppercase">{invoice.fecha_emision ?? "—"}</span>
      </td>

      {/* Importe */}
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-3 group/total">
          <div className="flex flex-col items-end">
            <span className={`text-sm font-black ${
              invoice.es_credito ? "text-red-500" : (invoice.moneda === "USD" ? "text-indigo-600 dark:text-indigo-400" : "text-main")
            }`}>
              {invoice.total != null ? formatARS(invoice.total) : <span className="text-dim">—</span>}
            </span>
            {invoice.moneda === "USD" && (
              <span className="text-[9px] text-indigo-500 font-black uppercase tracking-tighter mt-0.5">Dólares</span>
            )}
          </div>
          <CopyBtn value={invoice.total} label="Importe" />
        </div>
      </td>

      {/* Recibido (Fecha Procesamiento) */}
      <td className="px-6 py-4 text-center">
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-black text-main">{fechaRecibido}</span>
          <span className="text-[9px] text-dim font-bold uppercase tracking-tighter">Sincro</span>
        </div>
      </td>

      {/* Nota / Comentario */}
      <td className="px-6 py-4 text-center">
        <button
          onClick={() => onComment(invoice)}
          className={`
            w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 border shadow-sm
            ${hasComment 
              ? "bg-[#00ff9d]/20 text-[#00ff9d] border-[#00ff9d]/40 shadow-[0_0_15px_rgba(0,255,157,0.1)] hover:bg-[#00ff9d]/30" 
              : "bg-surface text-dim border-base hover:text-main hover:border-brand-primary"
            }
          `}
          title={hasComment ? "Ver/Editar comentario" : "Agregar comentario"}
        >
          <MessageSquare size={16} fill={hasComment ? "currentColor" : "none"} />
        </button>
      </td>

      {/* Estado Autorizada */}
      <td className="px-6 py-4 text-center">
        <ToggleBtn
          value={invoice.autorizada}
          onLabel="AUTORIZ"
          offLabel="PEND"
          onClick={() => onToggle(invoice.id, "autorizada", invoice.autorizada)}
          disabled={isDisabled}
          onColor="bg-violet-500 text-white shadow-lg shadow-violet-500/20 border-none"
          offColor="bg-surface border-base text-dim hover:border-red-500/50"
        />
      </td>

      {/* Estado Pagada */}
      <td className="px-6 py-4 text-center">
        <ToggleBtn
          value={invoice.pagada}
          onLabel="PAGA"
          offLabel="IMPAGA"
          onClick={() => onToggle(invoice.id, "pagada", invoice.pagada)}
          disabled={isDisabled}
          onColor="bg-[#00ff9d] text-black shadow-lg shadow-[#00ff9d]/20 border-none"
          offColor="bg-surface border-base text-dim hover:border-violet-500/50"
        />
      </td>
      <td className="hidden lg:table-cell px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-2">
          {invoice.url_qr_afip ? (
            <>
              <a
                href={invoice.url_qr_afip}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-surface border border-base text-brand-primary flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                title="Abrir en AFIP"
              >
                <QrCode size={14} />
              </a>
              <CopyBtn value={invoice.url_qr_afip} label="Link AFIP" />
            </>
          ) : (
            <span className="text-xs text-dim">—</span>
          )}
        </div>
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
  { key: "numero_comprobante", label: "Factura",         sortable: false, align: "left"   },
  { key: "fecha_emision",      label: "Emisión",         sortable: true,  align: "left"   },
  { key: "total",              label: "Importe",         sortable: true,  align: "right"  },
  { key: "created_at",         label: "Recibido",        sortable: true,  align: "center" },
  { key: "comentario",         label: "Obs.",            sortable: false, align: "center" },
  { key: "autorizada",         label: "Aut.",            sortable: true,  align: "center" },
  { key: "pagada",             label: "Pag.",            sortable: true,  align: "center" },
  { key: "qr",                 label: "QR",              sortable: false, align: "center" },
];

const FILTERS = [
  { id: "all",        label: "Todas"         },
  { id: "pendiente",  label: "Sin pagar"     },
  { id: "pagada",     label: "Pagadas"       },
  { id: "autorizada", label: "Autorizadas"   },
];

export default function DashboardPage() {
  const { 
    invoices, loading, error, updatingId, stats, 
    fetchInvoices, toggleField, updateComment 
  } = useDashboard();

  const [search, setSearch]       = useState("");
  const [amountSearch, setAmountSearch] = useState("");
  const [filter, setFilter]       = useState("all");
  const [sortKey, setSortKey]     = useState("created_at");
  const [sortDir, setSortDir]     = useState("desc");
  const [page, setPage]           = useState(1);
  
  // --- Filtros Temporales ---
  const [viewMode, setViewMode] = useState("month"); // "month" | "all"
  const [displayDate, setDisplayDate] = useState(new Date());

  // Modal de Comentarios
  const [commentModal, setCommentModal] = useState({ isOpen: false, invoice: null });

  // 1. Filtrado + búsqueda + Mes
  const filtered = useMemo(() => {
    let list = [...invoices];

    // Filtro de Mes (basado en created_at)
    if (viewMode === "month") {
      const year = displayDate.getFullYear();
      const month = displayDate.getMonth();
      list = list.filter(i => {
        const d = new Date(i.created_at);
        return d.getFullYear() === year && d.getMonth() === month;
      });
    }

    // Filtros de estado
    if (filter === "pendiente")  list = list.filter((i) => !i.pagada);
    if (filter === "pagada")     list = list.filter((i) => i.pagada);
    if (filter === "autorizada") list = list.filter((i) => i.autorizada);

    // Búsqueda de texto
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((i) =>
        (i.razon_social ?? "").toLowerCase().includes(q) ||
        (i.cuit_emisor ?? "").includes(q) ||
        (i.numero_comprobante ?? "").includes(q) ||
        (i.fecha_emision ?? "").includes(q)
      );
    }

    // Búsqueda de Importe
    const am = amountSearch.trim();
    if (am) {
      list = list.filter((i) => {
        const totalStr = String(i.total ?? "");
        return totalStr.includes(am);
      });
    }

    return list;
  }, [invoices, filter, search, amountSearch, viewMode, displayDate]);

  // 2. Ordenamiento
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sortKey] ?? "";
      let bv = b[sortKey] ?? "";
      if (sortKey === "fecha_emision" || sortKey === "created_at") {
        av = new Date(av).getTime(); bv = new Date(bv).getTime();
      }
      if (typeof av === "boolean") return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
      if (typeof av === "number")  return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortKey, sortDir]);

  // 3. Exportar Excel
  const handleExportExcel = () => {
    const data = sorted.map(i => ({
      "Proveedor": i.razon_social,
      "CUIT": i.cuit_emisor,
      "Tipo": i.tipo_factura,
      "Punto Venta": i.punto_venta,
      "Número": i.numero_comprobante,
      "Fecha Emisión": i.fecha_emision,
      "Recibido": i.created_at ? new Date(i.created_at).toLocaleDateString() : "-",
      "Moneda": i.moneda,
      "Total": i.total,
      "Cuenta Contable": i.cuenta_contable_sugerida,
      "Autorizada": i.autorizada ? "SI" : "NO",
      "Pagada": i.pagada ? "SI" : "NO",
      "Obs/Comentario": i.comentario || ""
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturas");
    XLSX.writeFile(wb, `Reporte_Facturas_${viewMode === 'month' ? (displayDate.getMonth()+1)+'_'+displayDate.getFullYear() : 'Total'}.xlsx`);
  };

  const changeMonth = (offset) => {
    const next = new Date(displayDate);
    next.setMonth(next.getMonth() + offset);
    setDisplayDate(next);
    setPage(1);
  };

  // Paginación
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key) => {
    if (!COLS.find((c) => c.key === key)?.sortable) return;
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const handleOpenComment = (invoice) => {
    setCommentModal({ isOpen: true, invoice });
  };

  const monthLabel = displayDate.toLocaleDateString("es-AR", { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8">

      {/* ---- Header ---- */}
      <div className="flex flex-col md:flex-row md:items-end gap-6 justify-between bg-surface/30 p-8 rounded-[32px] border border-base">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-500/5">
               <TrendingUp size={20} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-main tracking-tight">
              Resumen Corporativo
            </h1>
          </div>
          <p className="text-dim text-sm font-bold ml-1.5 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {filtered.length} comprobantes listados en esta sesión
          </p>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={handleExportExcel}
            className="btn-success px-6 shadow-xl"
          >
            <Download size={18} />
            Exportar Auditoría
          </button>
          
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="btn-ghost bg-surface/50 border-base px-6 shadow-sm"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Sincronizar DB
          </button>
        </div>
      </div>

      {/* ---- Stats Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat
          icon={<TrendingUp size={22} />}
          label={viewMode === 'month' ? "Volumen Mensual" : "Volumen Histórico"}
          value={filtered.length}
          sub={`${formatARSShort(filtered.reduce((s,i) => s + (i.total ?? 0), 0))} operados`}
          color="text-indigo-500"
          bg="bg-indigo-500/10"
        />
        <MiniStat
          icon={<Clock size={22} />}
          label="Deuda Pendiente"
          value={filtered.filter(i => !i.pagada).length}
          sub="Facturas sin saldar"
          color="text-amber-500"
          bg="bg-amber-500/10"
        />
        <MiniStat
          icon={<CheckCircle2 size={22} />}
          label="Facturas Pagadas"
          value={filtered.filter(i => i.pagada).length}
          sub="Operaciones ejecutadas"
          color="text-[#00ff9d]"
          bg="bg-[#00ff9d]/10"
        />
        <MiniStat
          icon={<DollarSign size={22} />}
          label="Autorizaciones"
          value={filtered.filter(i => i.autorizada).length}
          sub="Verificadas para pago"
          color="text-violet-500"
          bg="bg-violet-500/10"
        />
      </div>

      {/* ---- Control Bar (Mes + Filtros) ---- */}
      <div className="flex flex-col lg:flex-row gap-6 items-center">
        <div className="flex p-1.5 bg-surface border border-base rounded-2xl shadow-sm w-full lg:w-auto">
          <button
            onClick={() => setViewMode("month")}
            className={`flex-1 lg:px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${
              viewMode === "month" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-dim hover:text-main"
            }`}
          >
            Vista Mensual
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={`flex-1 lg:px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${
              viewMode === "all" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-dim hover:text-main"
            }`}
          >
            Vista Histórica
          </button>
        </div>

        {viewMode === "month" && (
          <div className="flex items-center gap-4 bg-surface px-4 py-2 border border-base rounded-2xl shadow-sm">
            <button
              onClick={() => changeMonth(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-hover text-dim hover:text-main transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3 min-w-[160px] justify-center">
              <Calendar size={18} className="text-indigo-500" />
              <span className="text-sm font-black text-main uppercase tracking-tighter">
                {monthLabel}
              </span>
            </div>
            <button
              onClick={() => changeMonth(1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-hover text-dim hover:text-main transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        <div className="flex gap-2 flex-wrap justify-center lg:ml-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setPage(1); }}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                filter === f.id
                  ? "bg-main text-white border-main shadow-lg"
                  : "bg-surface text-dim border-base hover:border-brand-primary/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Tabla Central ---- */}
      <div className="glass-card overflow-hidden">
        <div className="px-8 py-6 border-b border-base bg-surface-hover/30 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-80 group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-brand-primary" />
                <input
                  type="text"
                  placeholder="Empresa, CUIT, factura..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="input-base pl-12 bg-surface"
                />
              </div>

              <div className="relative w-32 group">
                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-brand-primary" />
                <input
                  type="text"
                  placeholder="Monto"
                  value={amountSearch}
                  onChange={(e) => { setAmountSearch(e.target.value); setPage(1); }}
                  className="input-base pl-10 bg-surface"
                />
              </div>
           </div>
           
           <div className="text-right">
              <p className="text-[10px] font-black text-dim uppercase tracking-[0.2em] mb-1">Carga de Datos</p>
              <p className="text-sm font-black text-main">Sincronización en Tiempo Real</p>
           </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-base bg-surface">
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`
                      px-6 py-4 text-[10px] font-black uppercase tracking-[0.1em] text-muted
                      ${col.align === "right" ? "text-right" : ""}
                      ${col.align === "center" ? "text-center" : ""}
                      ${col.sortable ? "cursor-pointer hover:text-brand-primary select-none group/th" : ""}
                      transition-colors duration-200
                    `}
                  >
                    <span className={`inline-flex items-center gap-2 ${col.align === "right" ? "justify-end" : ""} ${col.align === "center" ? "justify-center" : ""}`}>
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-base">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {COLS.map((col) => (
                      <td key={col.key} className="px-6 py-5">
                        <div className="h-4 bg-surface-hover rounded-lg w-full" />
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
                        onComment={handleOpenComment}
                        isUpdating={updatingId === invoice.id}
                      />
                    ))
                  ) : (
                    <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <td colSpan={COLS.length} className="px-6 py-32 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-20 h-20 rounded-3xl bg-surface border-2 border-dashed border-base flex items-center justify-center">
                            <FileX size={32} className="text-dim" />
                          </div>
                          <div className="max-w-xs">
                             <p className="text-lg font-black text-main mb-1">
                               Sin registros encontrados
                             </p>
                             <p className="text-sm text-dim font-medium">
                               Intentá ajustando los filtros o el rango de fecha para encontrar lo que buscás.
                             </p>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-8 py-6 border-t border-base bg-surface-hover/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[10px] font-black text-dim uppercase tracking-[0.2em]">
               Mostrando página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="w-10 h-10 rounded-xl bg-surface border border-base flex items-center justify-center hover:border-brand-primary disabled:opacity-50 transition-all text-dim hover:text-brand-primary shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex gap-2">
                 {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - page) <= 2)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all shadow-sm ${
                        p === page
                          ? "bg-indigo-500 text-white shadow-indigo-500/20"
                          : "bg-surface border border-base text-dim hover:border-brand-primary hover:text-brand-primary"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
              </div>

              <button 
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="w-10 h-10 rounded-xl bg-surface border border-base flex items-center justify-center hover:border-brand-primary disabled:opacity-50 transition-all text-dim hover:text-brand-primary shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      <CommentModal
        isOpen={commentModal.isOpen}
        initialValue={commentModal.invoice?.comentario}
        invoiceInfo={commentModal.invoice ? `${commentModal.invoice.razon_social} - Factura ${commentModal.invoice.numero_comprobante}` : ""}
        onClose={() => setCommentModal({ isOpen: false, invoice: null })}
        onSave={(text) => updateComment(commentModal.invoice.id, text)}
      />
    </div>
  );
}

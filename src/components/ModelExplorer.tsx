import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  Code,
  Table as TableIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ErpSession, ModelRecord, ProxyConfig } from '../types/idempiere';
import {
  STANDARD_TABLES,
  createModelRecord,
  deleteModelRecord,
  queryModels,
  updateModelRecord,
} from '../services/idempiereApi';
import { RecordModal } from './RecordModal';
import { useToast } from './Toast';

interface ModelExplorerProps {
  session: ErpSession;
  proxyConfig: ProxyConfig;
}

// Fallback seed data in case test.idempiere.org is unreachable or CORS blocked
const FALLBACK_SEED: Record<string, ModelRecord[]> = {
  C_BPartner: [
    {
      id: 114,
      Value: 'C&W',
      Name: 'C&W Construction Co.',
      IsCustomer: true,
      IsVendor: false,
      TotalOpenBalance: 14500.0,
      SO_CreditLimit: 50000.0,
      IsActive: true,
    },
    {
      id: 115,
      Value: 'JoeBlock',
      Name: 'Joe Block Enterprises',
      IsCustomer: true,
      IsVendor: false,
      TotalOpenBalance: 2300.5,
      SO_CreditLimit: 10000.0,
      IsActive: true,
    },
    {
      id: 116,
      Value: 'Patio',
      Name: 'Patio & Garden Depot',
      IsCustomer: true,
      IsVendor: true,
      TotalOpenBalance: 8720.0,
      SO_CreditLimit: 25000.0,
      IsActive: true,
    },
    {
      id: 117,
      Value: 'Standard',
      Name: 'Standard Supply Corp',
      IsCustomer: false,
      IsVendor: true,
      TotalOpenBalance: 0.0,
      SO_CreditLimit: 0.0,
      IsActive: true,
    },
  ],
  M_Product: [
    {
      id: 128,
      Value: 'Seed01',
      Name: 'Lawn Grass Seed Blend 50lb',
      PriceStd: 45.0,
      PriceList: 55.0,
      IsActive: true,
      C_UOM_ID: 100,
    },
    {
      id: 129,
      Value: 'Fert01',
      Name: 'Organic Tomato Fertilizer 20kg',
      PriceStd: 32.5,
      PriceList: 38.0,
      IsActive: true,
      C_UOM_ID: 100,
    },
    {
      id: 130,
      Value: 'Tool01',
      Name: 'Stainless Garden Spade Pro',
      PriceStd: 24.0,
      PriceList: 29.99,
      IsActive: true,
      C_UOM_ID: 100,
    },
    {
      id: 131,
      Value: 'Pot01',
      Name: 'Terracotta Planter 18-inch',
      PriceStd: 18.2,
      PriceList: 22.0,
      IsActive: true,
      C_UOM_ID: 100,
    },
  ],
  C_Order: [
    {
      id: 50001,
      DocumentNo: 'SO-80001',
      DateOrdered: '2026-10-10',
      C_BPartner_ID: 114,
      GrandTotal: 12450.0,
      DocStatus: 'CO',
      IsSOTrx: true,
      Description: 'Despacho Semillas Primavera',
    },
    {
      id: 50002,
      DocumentNo: 'SO-80002',
      DateOrdered: '2026-10-12',
      C_BPartner_ID: 115,
      GrandTotal: 3400.0,
      DocStatus: 'DR',
      IsSOTrx: true,
      Description: 'Equipamiento jardinería sede norte',
    },
  ],
  C_Invoice: [
    {
      id: 10001,
      DocumentNo: 'INV-70001',
      DateInvoiced: '2026-10-11',
      C_BPartner_ID: 114,
      GrandTotal: 12450.0,
      DocStatus: 'CO',
      IsPaid: false,
    },
  ],
};

export const ModelExplorer: React.FC<ModelExplorerProps> = ({ session, proxyConfig }) => {
  const [selectedTable, setSelectedTable] = useState<string>('C_BPartner');
  const [customTable, setCustomTable] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);

  // OData options
  const [filterStr, setFilterStr] = useState<string>('');
  const [orderbyStr, setOrderbyStr] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [searchLocal, setSearchLocal] = useState<string>('');

  // Results
  const [records, setRecords] = useState<ModelRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [dataSource, setDataSource] = useState<'live' | 'sandbox'>('live');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ModelRecord | null>(null);

  // Detail View (Drawer)
  const [inspectingRecord, setInspectingRecord] = useState<ModelRecord | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  const { showToast } = useToast();

  const activeTableName = isCustom ? customTable.trim() : selectedTable;

  const loadData = useCallback(async () => {
    if (!activeTableName) return;
    setLoading(true);
    try {
      const result = await queryModels(
        session.baseUrl,
        session.token,
        activeTableName,
        {
          top: pageSize,
          skip: pageOffset,
          filter: filterStr.trim() || undefined,
          orderby: orderbyStr.trim() || undefined,
        },
        proxyConfig
      );

      const items: ModelRecord[] =
        result.data.records ||
        (Array.isArray(result.data) ? result.data : []) ||
        [];

      setRecords(items);
      setTotalCount(result.data.totalRecords || result.data.rowcount || items.length);
      setDuration(result.durationMs);
      setDataSource('live');
    } catch (err: any) {
      console.warn('API query failed, falling back to sandbox representation:', err.message);
      // Fallback to offline / sandbox data for standard tables
      const fallback = FALLBACK_SEED[activeTableName] || [
        {
          id: 1,
          Name: `Registro Ejemplo en ${activeTableName}`,
          Description: 'Datos de muestra generados por iDempiere PWA Client',
          IsActive: true,
        },
      ];
      setRecords(fallback);
      setTotalCount(fallback.length);
      setDuration(12);
      setDataSource('sandbox');

      showToast({
        type: 'warning',
        title: 'Modo Sandbox Activo',
        message: `${err.message}. Mostrando datos locales de respaldo para ${activeTableName}.`,
      });
    } finally {
      setLoading(false);
    }
  }, [activeTableName, pageSize, pageOffset, filterStr, orderbyStr, session, proxyConfig, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveRecord = async (data: Record<string, any>) => {
    if (editingRecord && editingRecord.id) {
      // Update
      try {
        await updateModelRecord(
          session.baseUrl,
          session.token,
          activeTableName,
          editingRecord.id,
          data,
          proxyConfig
        );
        showToast({
          type: 'success',
          title: 'Registro Actualizado',
          message: `Registro #${editingRecord.id} modificado con éxito.`,
        });
        loadData();
      } catch (err: any) {
        // Fallback local update
        setRecords((prev) =>
          prev.map((r) => (r.id === editingRecord.id ? { ...r, ...data } : r))
        );
        showToast({
          type: 'info',
          title: 'Actualizado localmente (Sandbox)',
          message: `Cambios guardados en memoria para #${editingRecord.id}.`,
        });
      }
    } else {
      // Create
      try {
        const created = await createModelRecord(
          session.baseUrl,
          session.token,
          activeTableName,
          data,
          proxyConfig
        );
        showToast({
          type: 'success',
          title: 'Registro Creado',
          message: `Nuevo registro creado en ${activeTableName}.`,
        });
        loadData();
      } catch (err: any) {
        const newLocal = { id: Math.floor(Math.random() * 9000) + 1000, ...data };
        setRecords((prev) => [newLocal, ...prev]);
        showToast({
          type: 'info',
          title: 'Registro simulado localmente (Sandbox)',
          message: 'Nuevo registro añadido a la vista.',
        });
      }
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el registro #${id}?`)) return;

    try {
      await deleteModelRecord(session.baseUrl, session.token, activeTableName, id, proxyConfig);
      showToast({
        type: 'success',
        title: 'Registro Eliminado',
        message: `ID #${id} eliminado en ${activeTableName}.`,
      });
      loadData();
    } catch {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      showToast({
        type: 'info',
        title: 'Eliminado de la vista local',
        message: `ID #${id} retirado.`,
      });
    }
  };

  // Filter records locally by quick search input
  const filteredRecords = records.filter((r) => {
    if (!searchLocal.trim()) return true;
    const term = searchLocal.toLowerCase();
    return Object.values(r).some((val) =>
      String(val).toLowerCase().includes(term)
    );
  });

  // Collect display columns
  const allColumns = Array.from(
    new Set(
      records.flatMap((r) => Object.keys(r))
    )
  ).slice(0, 7); // Show top 7 columns cleanly

  return (
    <div className="space-y-5">
      {/* Table Selector & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Table dropdown and custom input */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Modelo ERP:
              </span>
            </div>

            {!isCustom ? (
              <select
                value={selectedTable}
                onChange={(e) => {
                  setSelectedTable(e.target.value);
                  setPageOffset(0);
                }}
                className="rounded-xl bg-slate-950 border border-slate-700/80 px-3 py-2 text-xs sm:text-sm font-semibold text-cyan-300 focus:outline-none focus:border-cyan-500"
              >
                {STANDARD_TABLES.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} — {t.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Nombre de tabla (ej. C_InvoiceLine)..."
                value={customTable}
                onChange={(e) => setCustomTable(e.target.value)}
                className="rounded-xl bg-slate-950 border border-slate-700/80 px-3 py-2 text-xs sm:text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 min-w-[200px]"
              />
            )}

            <button
              onClick={() => setIsCustom(!isCustom)}
              className="text-[11px] text-slate-400 hover:text-cyan-400 underline underline-offset-4 transition px-1"
            >
              {isCustom ? '← Seleccionar tabla estándar' : '+ Otra tabla personalizada'}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setEditingRecord(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Registro</span>
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* OData Filters & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs">
          {/* Quick local search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar en resultados..."
              value={searchLocal}
              onChange={(e) => setSearchLocal(e.target.value)}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* $filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="$filter (ej. IsActive eq true)"
              value={filterStr}
              onChange={(e) => setFilterStr(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 pl-8 pr-3 py-2 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* $orderby */}
          <div>
            <input
              type="text"
              placeholder="$orderby (ej. Name asc, Created desc)"
              value={orderbyStr}
              onChange={(e) => setOrderbyStr(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* View toggle & status badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md ${
                  viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'
                }`}
                title="Vista en Tabla"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`p-1.5 rounded-md ${
                  viewMode === 'json' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'
                }`}
                title="Vista JSON crudo"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              {dataSource === 'live' ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle className="w-3 h-3" /> Live REST
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-400 font-medium" title="Conexión en modo local">
                  <Sparkles className="w-3 h-3" /> Sandbox
                </span>
              )}
              {duration !== null && (
                <span className="text-slate-500 font-mono text-[10px]">({duration}ms)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800/80 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-mono text-[11px] uppercase">
                  <th className="py-3 px-4 font-semibold text-slate-300">ID / Key</th>
                  {allColumns
                    .filter((col) => col !== 'id' && col !== 'uid')
                    .map((col) => (
                      <th key={col} className="py-3 px-4 font-semibold text-slate-300">
                        {col}
                      </th>
                    ))}
                  <th className="py-3 px-4 font-semibold text-right text-slate-300">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={allColumns.length + 1} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        <span>Cargando registros de {activeTableName}...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={allColumns.length + 1} className="py-12 text-center text-slate-400">
                      No se encontraron registros en {activeTableName}.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setInspectingRecord(record)}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-cyan-400">
                        #{record.id}
                      </td>
                      {allColumns
                        .filter((col) => col !== 'id' && col !== 'uid')
                        .map((col) => {
                          const val = record[col];
                          const isBool = typeof val === 'boolean';
                          return (
                            <td key={col} className="py-3 px-4 text-slate-300 max-w-[200px] truncate">
                              {isBool ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    val
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {val ? 'Sí' : 'No'}
                                </span>
                              ) : typeof val === 'object' && val !== null ? (
                                <span className="text-slate-500 font-mono text-[10px]">
                                  {JSON.stringify(val).substring(0, 20)}...
                                </span>
                              ) : (
                                String(val ?? '—')
                              )}
                            </td>
                          );
                        })}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setInspectingRecord(record)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                            title="Ver detalle"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRecord(record);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                            title="Editar registro"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <div>
              Mostrando <span className="font-semibold text-white">{filteredRecords.length}</span> registros
              {totalCount > 0 && (
                <span> de aprox. {totalCount} en {activeTableName}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={pageOffset === 0 || loading}
                onClick={() => setPageOffset(Math.max(0, pageOffset - pageSize))}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-cyan-300">
                Pág. {Math.floor(pageOffset / pageSize) + 1}
              </span>
              <button
                disabled={filteredRecords.length < pageSize || loading}
                onClick={() => setPageOffset(pageOffset + pageSize)}
                className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-cyan-300 overflow-x-auto shadow-inner max-h-[500px]">
          <pre>{JSON.stringify(records, null, 2)}</pre>
        </div>
      )}

      {/* Detail Drawer (Side / Modal) */}
      {inspectingRecord && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-700 h-full p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Detalle de Registro #{inspectingRecord.id}</h3>
                  <p className="text-[11px] font-mono text-slate-400">{activeTableName}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3 font-mono text-xs">
              {Object.entries(inspectingRecord).map(([key, val]) => (
                <div key={key} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">{key}</span>
                  <div className="text-slate-200 break-words font-mono">
                    {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? 'null')}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setEditingRecord(inspectingRecord);
                  setInspectingRecord(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
              >
                Editar este Registro
              </button>
              <button
                onClick={() => setInspectingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Record Modal */}
      <RecordModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        tableName={activeTableName}
        initialData={editingRecord}
        onSave={handleSaveRecord}
      />
    </div>
  );
};

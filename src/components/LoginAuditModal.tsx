import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Trash2,
  Download,
  X,
  Filter,
  User,
  Globe,
  Lock,
  Unlock,
  Sliders,
} from 'lucide-react';
import { LoginAttemptLog, LoginSecurityState } from '../types/idempiere';
import { useToast } from './Toast';

interface LoginAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LoginAttemptLog[];
  security: LoginSecurityState;
  isLocked: boolean;
  secondsRemaining: number;
  onClearLogs: () => void;
  onResetLockout: () => void;
  onUpdateMaxAttempts: (max: number) => void;
}

export const LoginAuditModal: React.FC<LoginAuditModalProps> = ({
  isOpen,
  onClose,
  logs,
  security,
  isLocked,
  secondsRemaining,
  onClearLogs,
  onResetLockout,
  onUpdateMaxAttempts,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SUCCESS' | 'FAILED' | 'BLOCKED'>('ALL');
  const [showSettings, setShowSettings] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterStatus === 'ALL') return true;
    return log.status === filterStatus;
  });

  const totalAttempts = logs.length;
  const successfulCount = logs.filter((l) => l.status === 'SUCCESS').length;
  const failedCount = logs.filter((l) => l.status === 'FAILED' || l.status === 'BLOCKED').length;
  const successRate = totalAttempts > 0 ? Math.round((successfulCount / totalAttempts) * 100) : 0;

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `idempiere_login_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast({
      type: 'info',
      title: 'Exportado',
      message: 'Historial de auditoría descargado en formato JSON.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Log de Ingreso y Auditoría de Seguridad</h3>
                {isLocked && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono animate-pulse">
                    BLOQUEADO ({secondsRemaining}s)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Registro de intentos, antifuerza bruta y control de acceso para iDempiere ERP
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Summary Metrics */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">Total Intentos</span>
            <span className="text-lg font-bold text-white">{totalAttempts}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">Exitosos</span>
            <span className="text-lg font-bold text-emerald-400">{successfulCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">Fallidos / Bloqueados</span>
            <span className="text-lg font-bold text-rose-400">{failedCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">Límite Configurado</span>
            <span className="text-lg font-bold text-cyan-400">
              {security.maxAttempts} intentos <span className="text-xs text-slate-400">({security.lockoutDurationSec}s)</span>
            </span>
          </div>
        </div>

        {/* Lockout Warning Banner if active */}
        {isLocked && (
          <div className="mt-3 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-between gap-3 text-xs text-rose-200">
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="block text-white">Límite de intentos alcanzado</strong>
                <span>
                  El acceso se encuentra restringido temporalmente por seguridad. Restan{' '}
                  <span className="font-mono font-bold text-white">{secondsRemaining} segundos</span>.
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onResetLockout();
                showToast({
                  type: 'info',
                  title: 'Bloqueo Levantado',
                  message: 'Se ha restablecido el contador de intentos manual de forma administrativa.',
                });
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Desbloquear Ahora</span>
            </button>
          </div>
        )}

        {/* Controls Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs">
          {/* Status filters */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            {(['ALL', 'SUCCESS', 'FAILED', 'BLOCKED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  filterStatus === st
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'ALL'
                  ? 'Todos'
                  : st === 'SUCCESS'
                  ? 'Exitosos'
                  : st === 'FAILED'
                  ? 'Fallidos'
                  : 'Bloqueados'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-750 transition"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ajustar Límite</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-750 transition disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>

            <button
              onClick={onClearLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition disabled:opacity-40"
              title="Borrar historial"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Settings Dropdown Area */}
        {showSettings && (
          <div className="mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs animate-in fade-in duration-200">
            <h4 className="font-bold text-white flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Configuración de Máximos Intentos Fallidos</span>
            </h4>
            <div className="flex items-center gap-4">
              <span className="text-slate-400">Intentos permitidos antes de bloqueo:</span>
              <div className="flex items-center gap-2">
                {[3, 5, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      onUpdateMaxAttempts(num);
                      showToast({
                        type: 'info',
                        title: 'Parámetro actualizado',
                        message: `Límite configurado a ${num} intentos fallidos consecutivos.`,
                      });
                    }}
                    className={`px-3 py-1 rounded-lg font-mono font-bold transition ${
                      security.maxAttempts === num
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {num} intentos
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-950/95 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400 z-10">
              <tr>
                <th className="py-2.5 px-3">Fecha y Hora</th>
                <th className="py-2.5 px-3">Usuario</th>
                <th className="py-2.5 px-3">Servidor</th>
                <th className="py-2.5 px-3">Modalidad</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Detalle / Mensaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No hay registros de intentos de acceso en el historial.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white max-w-[150px] truncate">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[10px] max-w-[150px] truncate">
                      {log.baseUrl}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      {log.mode === 'one-step' ? '1 Paso Rápido' : '2 Pasos Cascada'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {log.status === 'SUCCESS' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Exitoso
                        </span>
                      )}
                      {log.status === 'FAILED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                          <X className="w-3 h-3" /> Fallido (Intento #{log.attemptNumber})
                        </span>
                      )}
                      {log.status === 'BLOCKED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                          <AlertOctagon className="w-3 h-3" /> Bloqueado
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 text-[11px] max-w-[220px] truncate">
                      {log.message || (log.durationMs ? `${log.durationMs}ms` : '—')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

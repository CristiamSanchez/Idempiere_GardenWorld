import React, { useState } from 'react';
import { Play, Cog, CheckCircle2, AlertCircle, Clock, Code } from 'lucide-react';
import { ErpSession, ProxyConfig } from '../types/idempiere';
import { runProcess } from '../services/idempiereApi';
import { useToast } from './Toast';

interface ProcessRunnerProps {
  session: ErpSession;
  proxyConfig: ProxyConfig;
}

export const ProcessRunner: React.FC<ProcessRunnerProps> = ({ session, proxyConfig }) => {
  const [processId, setProcessId] = useState<string>('1000000');
  const [paramsJson, setParamsJson] = useState<string>('{\n  "DocAction": "CO",\n  "IsDraft": false\n}');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const { showToast } = useToast();

  const standardProcesses = [
    { id: '104', name: 'Generate Invoices (Generar Facturas)' },
    { id: '109', name: 'Complete Order (Completar Pedido)' },
    { id: '119', name: 'Create Shipments (Generar Albaranes)' },
    { id: '124', name: 'Verify Document Sequence' },
  ];

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsed: any = {};
    try {
      parsed = JSON.parse(paramsJson);
    } catch {
      showToast({
        type: 'error',
        title: 'JSON de Parámetros Inválido',
        message: 'Revisa la sintaxis del JSON antes de ejecutar.',
      });
      return;
    }

    setRunning(true);
    setResult(null);
    setDuration(null);

    try {
      const res = await runProcess(session.baseUrl, session.token, processId, parsed, proxyConfig);
      setResult(res.data);
      setDuration(res.durationMs);
      showToast({
        type: 'success',
        title: 'Proceso Ejecutado',
        message: `Proceso #${processId} completado en ${res.durationMs}ms.`,
      });
    } catch (err: any) {
      setResult({ error: err.message, status: 'FAILED' });
      showToast({
        type: 'warning',
        title: 'Resultado de Proceso',
        message: err.message,
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleRun} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Cog className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Ejecutor de Procesos ERP (iDempiere AD_Process)</h3>
        </div>

        {/* Standard Process selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Seleccionar Proceso Estándar o ID Personalizado:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            {standardProcesses.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProcessId(p.id)}
                className={`text-left p-2.5 rounded-xl border text-xs transition ${
                  processId === p.id
                    ? 'bg-indigo-950/50 border-indigo-500/60 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold text-white">ID {p.id}</div>
                <div className="text-[11px] text-slate-400">{p.name}</div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Process ID / UUID:</span>
            <input
              type="text"
              required
              value={processId}
              onChange={(e) => setProcessId(e.target.value)}
              placeholder="1000000"
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>
        </div>

        {/* Process Parameters */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Parámetros del Proceso (JSON)
          </label>
          <textarea
            rows={5}
            value={paramsJson}
            onChange={(e) => setParamsJson(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button
          type="submit"
          disabled={running}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-950/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {running ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>Ejecutar Proceso en iDempiere</span>
        </button>
      </form>

      {/* Result Display */}
      {result && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Respuesta del Proceso</span>
            </span>
            {duration !== null && (
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> {duration} ms
              </span>
            )}
          </div>
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-indigo-300 overflow-x-auto max-h-80">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Terminal,
  Send,
  Copy,
  Check,
  Code,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ErpSession, ProxyConfig } from '../types/idempiere';
import { executeFetch } from '../services/idempiereApi';
import { useToast } from './Toast';

interface RestConsoleProps {
  session: ErpSession;
  proxyConfig: ProxyConfig;
}

export const RestConsole: React.FC<RestConsoleProps> = ({ session, proxyConfig }) => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [endpoint, setEndpoint] = useState<string>('/api/v1/models/C_BPartner?$top=5');
  const [requestBody, setRequestBody] = useState<string>('{\n  "Name": "Nuevo Socio"\n}');
  const [loading, setLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseBody, setResponseBody] = useState<string>('');
  const [copiedCurl, setCopiedCurl] = useState(false);

  const { showToast } = useToast();

  const presets = [
    { label: 'Terceros (C_BPartner)', method: 'GET', path: '/api/v1/models/C_BPartner?$top=5' },
    { label: 'Productos (M_Product)', method: 'GET', path: '/api/v1/models/M_Product?$top=5' },
    { label: 'Pedidos (C_Order)', method: 'GET', path: '/api/v1/models/C_Order?$top=5' },
    { label: 'Facturas (C_Invoice)', method: 'GET', path: '/api/v1/models/C_Invoice?$top=5' },
    { label: 'Roles Disponibles', method: 'GET', path: '/api/v1/auth/roles' },
    { label: 'Organizaciones', method: 'GET', path: '/api/v1/auth/organizations' },
  ];

  const fullUrl = `${session.baseUrl.replace(/\/+$/, '')}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  const generateCurl = () => {
    let curl = `curl -X ${method} "${fullUrl}" \\\n  -H "Authorization: Bearer ${session.token}" \\\n  -H "Accept: application/json"`;
    if (['POST', 'PUT'].includes(method) && requestBody.trim()) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/'/g, "'\\''")}'`;
    }
    return curl;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    showToast({
      type: 'info',
      title: 'cURL Copiado',
      message: 'Comando de terminal copiado al portapapeles con token de sesión.',
    });
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponseStatus(null);
    setResponseBody('');
    setDuration(null);

    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      },
    };

    if (['POST', 'PUT'].includes(method) && requestBody.trim()) {
      init.body = requestBody;
    }

    try {
      const { response, durationMs } = await executeFetch(fullUrl, proxyConfig, init);
      setDuration(durationMs);
      setResponseStatus(response.status);

      const hdrs: Record<string, string> = {};
      response.headers.forEach((v, k) => {
        hdrs[k] = v;
      });
      setResponseHeaders(hdrs);

      const text = await response.text();
      try {
        const json = JSON.parse(text);
        setResponseBody(JSON.stringify(json, null, 2));
      } catch {
        setResponseBody(text);
      }
    } catch (err: any) {
      setResponseStatus(500);
      setResponseBody(JSON.stringify({ error: err.message }, null, 2));
      showToast({
        type: 'error',
        title: 'Fallo en llamada REST',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Console Input Card */}
      <form onSubmit={handleExecute} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Consola de Peticiones REST iDempiere v1</h3>
          </div>
          <button
            type="button"
            onClick={handleCopyCurl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-mono text-cyan-300 hover:bg-slate-800 transition self-start sm:self-auto"
          >
            {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copiar cURL</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold mr-1">Plantillas rápidas:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setMethod(p.method as any);
                setEndpoint(p.path);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-medium text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* URL / Method Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs sm:text-sm font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-500 shrink-0"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          <div className="flex-1 relative flex items-center">
            <span className="hidden md:inline-block pl-3 text-xs font-mono text-slate-500 select-none">
              {session.baseUrl.replace(/\/+$/, '')}
            </span>
            <input
              type="text"
              required
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/api/v1/models/..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs sm:text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-950/40 flex items-center justify-center gap-1.5 transition shrink-0 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Enviar</span>
          </button>
        </div>

        {/* Request Payload for POST / PUT */}
        {['POST', 'PUT'].includes(method) && (
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Request Payload (JSON)
            </label>
            <textarea
              rows={5}
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        )}
      </form>

      {/* Response Panel */}
      {(responseStatus !== null || responseBody) && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Respuesta HTTP:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-bold ${
                  responseStatus && responseStatus >= 200 && responseStatus < 300
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {responseStatus ?? 'ERROR'}
              </span>
            </div>

            {duration !== null && (
              <div className="flex items-center gap-1 text-slate-400 font-mono text-xs">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{duration} ms</span>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-800/80 p-4 font-mono text-xs text-cyan-300 overflow-x-auto max-h-[450px]">
            <pre>{responseBody || '(Sin cuerpo en respuesta)'}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

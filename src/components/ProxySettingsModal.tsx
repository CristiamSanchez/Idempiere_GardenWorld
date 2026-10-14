import React, { useState } from 'react';
import { Shield, ShieldAlert, Check, X, Server, RefreshCw } from 'lucide-react';
import { ProxyConfig } from '../types/idempiere';
import { useToast } from './Toast';

interface ProxySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  proxyConfig: ProxyConfig;
  onSave: (config: ProxyConfig) => void;
}

export const ProxySettingsModal: React.FC<ProxySettingsModalProps> = ({
  isOpen,
  onClose,
  proxyConfig,
  onSave,
}) => {
  const [enabled, setEnabled] = useState(proxyConfig.enabled);
  const [proxyUrl, setProxyUrl] = useState(proxyConfig.proxyUrl);
  const [testing, setTesting] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const presets = [
    {
      id: 'local',
      name: 'Proxy Local Vite (/local-proxy?url=) (Recomendado)',
      url: '/local-proxy?url=',
      desc: 'Middleware proxy ejecutado directamente en este servidor Vite sin restricciones.',
    },
    {
      id: 'allorigins',
      name: 'allorigins.win (Alternativa pública)',
      url: 'https://api.allorigins.win/raw?url=',
      desc: 'Proxy CORS de respaldo en caso de despliegues estáticos.',
    },
    {
      id: 'corsproxy',
      name: 'corsproxy.io (Requiere suscripción / API Key)',
      url: 'https://corsproxy.io/?',
      desc: 'Nota: corsproxy.io desactivó las URLs anónimas gratuitas.',
    },
  ];

  const handleTestProxy = async () => {
    setTesting(true);
    try {
      const targetTest = 'https://httpbin.org/get';
      const effective = enabled ? `${proxyUrl}${encodeURIComponent(targetTest)}` : targetTest;
      const res = await fetch(effective, { method: 'GET' });
      if (res.ok) {
        showToast({
          type: 'success',
          title: 'Proxy Operativo',
          message: `Conexión exitosa a través de ${enabled ? proxyUrl : 'conexión directa'}.`,
        });
      } else {
        showToast({
          type: 'warning',
          title: 'Respuesta Inesperada',
          message: `Código de estado: ${res.status}`,
        });
      }
    } catch (e: any) {
      showToast({
        type: 'error',
        title: 'Fallo de Conexión Proxy',
        message: e.message || 'No se pudo comunicar a través del proxy seleccionado.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave({
      enabled,
      proxyUrl: proxyUrl.trim(),
    });
    showToast({
      type: 'info',
      title: 'Configuración de CORS guardada',
      message: enabled ? `Proxy activo: ${proxyUrl}` : 'Modo directo (sin proxy) activado.',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${enabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configuración del Proxy CORS</h3>
              <p className="text-xs text-slate-400">Resuelve el bloqueo de origen cruzado de los navegadores</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 space-y-5 overflow-y-auto pr-1 text-sm">
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-slate-700/70">
            <div className="space-y-0.5 pr-4">
              <span className="font-semibold text-white flex items-center gap-2">
                Usar Proxy CORS para Navegador
                {enabled ? (
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-mono font-medium">
                    ACTIVADO
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-mono font-medium">
                    DESACTIVADO (DIRECTO)
                  </span>
                )}
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">
                Desactívalo únicamente si tu servidor iDempiere ya tiene cabeceras CORS habilitadas o si ejecutas en red local/intranet.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {/* Editable URL Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              URL Base del Proxy CORS
            </label>
            <div className="relative">
              <input
                type="text"
                disabled={!enabled}
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="https://corsproxy.io/?"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              La URL final se formará anteponiendo este prefijo a la llamada REST de iDempiere.
            </p>
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Servidores Proxy Preconfigurados
            </label>
            <div className="grid gap-2">
              {presets.map((preset) => {
                const isSelected = proxyUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={!enabled}
                    onClick={() => setProxyUrl(preset.url)}
                    className={`text-left p-3 rounded-xl border text-xs transition flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-100 shadow-sm'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-cyan-400" />
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{preset.desc}</div>
                      <div className="font-mono text-[10px] text-cyan-400/80 mt-1">{preset.url}</div>
                    </div>
                    {isSelected && (
                      <span className="shrink-0 p-1 rounded-full bg-cyan-500/20 text-cyan-400">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Diagnostic Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-xs">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Nota técnica:</strong> Si el servidor de iDempiere se encuentra en una red interna privada o sin certificado SSL válido (HTTP en lugar de HTTPS), se recomienda utilizar el <strong>Proxy Local Vite</strong>.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestProxy}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Comprobando...' : 'Probar Conectividad'}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-950/40 transition"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

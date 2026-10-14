import React, { useState, useEffect } from 'react';
import {
  Key,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Shield,
  Building,
  User,
  X,
  AlertTriangle,
} from 'lucide-react';
import { ErpSession, ProxyConfig } from '../types/idempiere';
import { decodeJwt, refreshAuthToken } from '../services/idempiereApi';
import { useToast } from './Toast';

interface TokenInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ErpSession | null;
  proxyConfig: ProxyConfig;
  onTokenRefreshed: (newToken: string, newRefreshToken?: string) => void;
}

export const TokenInspectorModal: React.FC<TokenInspectorModalProps> = ({
  isOpen,
  onClose,
  session,
  proxyConfig,
  onTokenRefreshed,
}) => {
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const { showToast } = useToast();

  const decoded = session ? decodeJwt(session.token) : null;

  useEffect(() => {
    if (!isOpen || !decoded?.exp) return;

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = decoded.exp! - now;
      if (diff <= 0) {
        setTimeLeft('Expirado');
      } else {
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen, decoded?.exp]);

  if (!isOpen || !session) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(session.token);
    setCopied(true);
    showToast({
      type: 'info',
      title: 'Token Copiado',
      message: 'El Bearer JWT ha sido copiado al portapapeles.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refreshAuthToken(
        session.baseUrl,
        session.token,
        session.refreshToken,
        proxyConfig
      );
      if (res.token) {
        onTokenRefreshed(res.token, res.refreshToken);
        showToast({
          type: 'success',
          title: 'Token Renovado',
          message: 'Se ha obtenido un nuevo token de sesión con validez extendida.',
        });
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error al Renovar Token',
        message: err.message || 'No fue posible refrescar el token actual.',
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Inspector de Token JWT (Sesión ERP)</h3>
              <p className="text-xs text-slate-400 font-mono">iDempiere REST API v1 Authorization Header</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 space-y-5 overflow-y-auto pr-1 text-xs">
          {/* Status summary banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Estado de Sesión</span>
              <span className="font-semibold text-emerald-400 inline-flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Válida
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tiempo Restante</span>
              <span className="font-mono font-semibold text-cyan-300 inline-flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                {timeLeft || '60m'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Modalidad de Login</span>
              <span className="font-mono text-slate-200 mt-0.5 block">
                {session.loginMode === 'one-step' ? '1 Paso Rápido' : '2 Pasos Cascada'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Client / Role ID</span>
              <span className="font-mono text-slate-200 mt-0.5 block">
                {session.parameters.clientId} / {session.parameters.roleId}
              </span>
            </div>
          </div>

          {/* Raw Token string */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Token JWT (Bearer Token)
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar Token'}</span>
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300/90 break-all select-all max-h-24 overflow-y-auto">
              {session.token}
            </div>
          </div>

          {/* Decoded Claims */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Claims y Parámetros Decodificados del JWT
            </label>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-48">
              <pre>{JSON.stringify(decoded?.rawPayload || session.parameters, null, 2)}</pre>
            </div>
          </div>

          {/* Example cURL */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Uso Directo en cURL / Terminal
            </label>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 overflow-x-auto">
              <code>
                curl -X GET "{session.baseUrl}/api/v1/models/C_BPartner" \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer {session.token.substring(0, 20)}..." \<br />
                &nbsp;&nbsp;-H "Accept: application/json"
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Renovando...' : 'Renovar Token (Refresh)'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

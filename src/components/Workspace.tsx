import React, { useState } from 'react';
import {
  Database,
  Terminal,
  Cog,
  ShieldCheck,
  Building2,
  Shield,
  Layers,
  Archive,
  Key,
  RefreshCw,
  LogOut,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ErpSession, ProxyConfig } from '../types/idempiere';
import { ModelExplorer } from './ModelExplorer';
import { RestConsole } from './RestConsole';
import { ProcessRunner } from './ProcessRunner';
import { TokenInspectorModal } from './TokenInspectorModal';

interface WorkspaceProps {
  session: ErpSession;
  proxyConfig: ProxyConfig;
  onLogout: () => void;
  onUpdateSession: (updated: Partial<ErpSession>) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  session,
  proxyConfig,
  onLogout,
  onUpdateSession,
}) => {
  const [activeTab, setActiveTab] = useState<'models' | 'console' | 'processes' | 'session'>('models');
  const [showTokenModal, setShowTokenModal] = useState(false);

  const tabs = [
    { id: 'models', label: 'Explorador de Modelos', icon: Database },
    { id: 'console', label: 'Consola REST & cURL', icon: Terminal },
    { id: 'processes', label: 'Procesos ERP', icon: Cog },
    { id: 'session', label: 'Diagnóstico de Sesión', icon: ShieldCheck },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Session Context Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          {/* User & ERP Context Badges */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Sesión REST Activa
              </span>
              <span className="text-xs font-mono text-cyan-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 truncate max-w-xs">
                {session.baseUrl}
              </span>
              <span className="text-[11px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                Modo: {session.loginMode === 'one-step' ? '1 Paso Rápido' : '2 Pasos Cascada'}
              </span>
            </div>

            {/* Multitenant context cards */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-400">Cliente:</span>
                <span className="font-semibold text-white">
                  {session.clientName || 'ID ' + session.parameters.clientId}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-400">Rol:</span>
                <span className="font-semibold text-white">
                  {session.roleName || 'ID ' + session.parameters.roleId}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-slate-400">Org:</span>
                <span className="font-semibold text-white">
                  {session.orgName || 'ID ' + session.parameters.organizationId}
                </span>
              </div>

              {session.parameters.warehouseId && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Almacén:</span>
                  <span className="font-semibold text-white">
                    {session.warehouseName || 'ID ' + session.parameters.warehouseId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowTokenModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-cyan-500/20 transition shadow-sm"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Token JWT</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 border border-rose-500/30 transition shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-950/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'models' && <ModelExplorer session={session} proxyConfig={proxyConfig} />}

        {activeTab === 'console' && <RestConsole session={session} proxyConfig={proxyConfig} />}

        {activeTab === 'processes' && <ProcessRunner session={session} proxyConfig={proxyConfig} />}

        {activeTab === 'session' && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Diagnóstico Completo de Sesión ERP</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Información de Conexión
                </span>
                <div>
                  <span className="text-slate-500">Servidor Base:</span>{' '}
                  <span className="text-cyan-300">{session.baseUrl}</span>
                </div>
                <div>
                  <span className="text-slate-500">Usuario Autenticado:</span>{' '}
                  <span className="text-white">{session.userName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Proxy CORS Activo:</span>{' '}
                  <span className={proxyConfig.enabled ? 'text-emerald-400' : 'text-slate-400'}>
                    {proxyConfig.enabled ? proxyConfig.proxyUrl : 'Desactivado (Conexión Directa)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Hora de Inicio de Sesión:</span>{' '}
                  <span className="text-slate-300">{new Date(session.loginTime).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Parámetros de Contexto ERP
                </span>
                <pre className="text-cyan-400 overflow-x-auto text-[11px]">
                  {JSON.stringify(session.parameters, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Respuesta Cruda de Autenticación de iDempiere
              </span>
              <div className="font-mono text-[11px] text-slate-300 overflow-x-auto max-h-60">
                <pre>{JSON.stringify(session.rawResponse || {}, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Token Inspector Modal */}
      <TokenInspectorModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        session={session}
        proxyConfig={proxyConfig}
        onTokenRefreshed={(newToken, newRefreshToken) => {
          onUpdateSession({
            token: newToken,
            refreshToken: newRefreshToken || session.refreshToken,
          });
        }}
      />
    </div>
  );
};

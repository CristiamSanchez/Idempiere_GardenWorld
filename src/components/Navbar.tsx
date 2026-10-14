import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Shield,
  ShieldAlert,
  Settings,
  LogOut,
  Key,
  Building2,
  FileText,
  AlertOctagon,
} from 'lucide-react';
import { ErpSession, ProxyConfig } from '../types/idempiere';
import { PWAInstallButton } from './PWAInstallButton';
import { ProxySettingsModal } from './ProxySettingsModal';

interface NavbarProps {
  session: ErpSession | null;
  proxyConfig: ProxyConfig;
  failedAttemptsCount?: number;
  isLocked?: boolean;
  onUpdateProxy: (config: ProxyConfig) => void;
  onLoadGardenWorldDemo: () => void;
  onOpenTokenInspector: () => void;
  onOpenLoginAudit: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  proxyConfig,
  failedAttemptsCount = 0,
  isLocked = false,
  onUpdateProxy,
  onLoadGardenWorldDemo,
  onOpenTokenInspector,
  onOpenLoginAudit,
  onLogout,
}) => {
  const [showProxyModal, setShowProxyModal] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-cyan-950/50">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                iDempiere <span className="text-cyan-400 font-light">PWA</span>
              </span>
              <span className="text-[10px] font-mono uppercase bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded border border-slate-700">
                REST v1
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">Enterprise Web Client</p>
          </div>
        </div>

        {/* Center / Action Toolbar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* GardenWorld Quick Demo Button */}
          {!session && (
            <button
              onClick={onLoadGardenWorldDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold shadow-sm transition transform active:scale-95"
              title="Rellenar campos con el entorno de pruebas oficial de iDempiere (GardenWorld)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">Cargar Demo GardenWorld</span>
              <span className="sm:hidden">Demo</span>
            </button>
          )}

          {/* Audit / Log de Ingreso Button */}
          <button
            onClick={onOpenLoginAudit}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isLocked
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 animate-pulse'
                : failedAttemptsCount > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Ver registro de ingresos, intentos y auditoría de seguridad"
          >
            {isLocked ? (
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="hidden md:inline">Log de Ingreso</span>
            {isLocked ? (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-bold">
                BLOQ
              </span>
            ) : failedAttemptsCount > 0 ? (
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-mono">
                {failedAttemptsCount}
              </span>
            ) : null}
          </button>

          {/* CORS Proxy Toggle & Settings */}
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              onClick={() => onUpdateProxy({ ...proxyConfig, enabled: !proxyConfig.enabled })}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                proxyConfig.enabled
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={
                proxyConfig.enabled
                  ? `Proxy CORS: ${proxyConfig.proxyUrl}`
                  : 'Proxy CORS Desactivado (Conexión Directa)'
              }
            >
              {proxyConfig.enabled ? (
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="hidden md:inline">Proxy CORS:</span>
              <span className="font-semibold">{proxyConfig.enabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setShowProxyModal(true)}
              className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition ml-0.5"
              title="Ajustar configuración y servidor del proxy CORS"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Authenticated User Menu */}
          {session && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <button
                onClick={onOpenTokenInspector}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition"
                title="Inspeccionar Token JWT y tiempo de sesión"
              >
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden lg:inline">Token</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 bg-slate-900/90 border border-slate-800/80 px-2.5 py-1 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <div className="text-left text-[11px]">
                  <div className="font-semibold text-white leading-none truncate max-w-[120px]">
                    {session.userName}
                  </div>
                  <div className="text-slate-400 text-[10px] leading-tight flex items-center gap-1 mt-0.5 truncate max-w-[140px]">
                    <Building2 className="w-2.5 h-2.5 text-cyan-400" />
                    <span>{session.clientName || 'Cliente ' + session.parameters.clientId}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition"
                title="Cerrar Sesión ERP"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Proxy Settings Modal */}
      <ProxySettingsModal
        isOpen={showProxyModal}
        onClose={() => setShowProxyModal(false)}
        proxyConfig={proxyConfig}
        onSave={onUpdateProxy}
      />
    </header>
  );
};

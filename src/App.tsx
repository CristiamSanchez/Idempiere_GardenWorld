import React, { useState } from 'react';
import {
  Zap,
  GitBranch,
  Layers,
  Sparkles,
  Shield,
  Server,
  Globe,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Terminal,
  ShieldAlert,
  FileText,
  Lock,
} from 'lucide-react';
import { ErpSession, ProxyConfig } from './types/idempiere';
import { GARDENWORLD_DEMO, logoutSession } from './services/idempiereApi';
import { ToastProvider, useToast } from './components/Toast';
import { Navbar } from './components/Navbar';
import { LoginFormOneStep } from './components/LoginFormOneStep';
import { LoginFormTwoStep } from './components/LoginFormTwoStep';
import { Workspace } from './components/Workspace';
import { TokenInspectorModal } from './components/TokenInspectorModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { LoginAuditModal } from './components/LoginAuditModal';
import { useLoginSecurity } from './hooks/useLoginSecurity';

const PROXY_STORAGE_KEY = 'idempiere_pwa_proxy_config';
const SESSION_STORAGE_KEY = 'idempiere_pwa_session';

function AppContent() {
  // CORS Proxy Config (Migrate to /local-proxy?url= to prevent corsproxy.io 403 API key block)
  const [proxyConfig, setProxyConfig] = useState<ProxyConfig>(() => {
    try {
      const saved = localStorage.getItem(PROXY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.proxyUrl && parsed.proxyUrl.includes('corsproxy.io')) {
          return { enabled: true, proxyUrl: '/local-proxy?url=' };
        }
        return parsed;
      }
    } catch {}
    return {
      enabled: true,
      proxyUrl: '/local-proxy?url=',
    };
  });

  // ERP Session State
  const [session, setSession] = useState<ErpSession | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // Security & Audit Log Hook
  const {
    logs,
    security,
    isLocked,
    secondsRemaining,
    remainingAttempts,
    recordAttempt,
    clearLogs,
    resetLockout,
    updateMaxAttempts,
  } = useLoginSecurity();

  // Active Login Mode Tab
  const [loginMode, setLoginMode] = useState<'one-step' | 'two-step'>('one-step');

  // Modals state
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // GardenWorld Demo fill trigger
  const [demoTrigger, setDemoTrigger] = useState(0);

  const { showToast } = useToast();

  // Save proxy preferences
  const handleUpdateProxy = (newConfig: ProxyConfig) => {
    setProxyConfig(newConfig);
    try {
      localStorage.setItem(PROXY_STORAGE_KEY, JSON.stringify(newConfig));
    } catch {}
  };

  // Handle Login Success
  const handleLoginSuccess = (sessionData: any) => {
    const fullSession: ErpSession = {
      token: sessionData.token,
      refreshToken: sessionData.refreshToken,
      baseUrl: sessionData.baseUrl,
      userName: sessionData.userName,
      parameters: sessionData.parameters,
      clientName: sessionData.clientName || GARDENWORLD_DEMO.labels.client,
      roleName: sessionData.roleName || GARDENWORLD_DEMO.labels.role,
      orgName: sessionData.orgName || GARDENWORLD_DEMO.labels.org,
      warehouseName: sessionData.warehouseName || GARDENWORLD_DEMO.labels.warehouse,
      userSummary: sessionData.userSummary,
      roleSummary: sessionData.roleSummary,
      loginTime: Date.now(),
      loginMode: sessionData.loginMode,
      rawResponse: sessionData.rawResponse,
    };

    setSession(fullSession);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(fullSession));
    } catch {}
  };

  // Handle Logout
  const handleLogout = async () => {
    if (session) {
      await logoutSession(session.baseUrl, session.token, proxyConfig);
    }
    setSession(null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    showToast({
      type: 'info',
      title: 'Sesión Finalizada',
      message: 'Se ha cerrado la sesión de iDempiere ERP.',
    });
  };

  // GardenWorld Demo pre-fill action
  const handleLoadGardenWorldDemo = () => {
    setDemoTrigger((prev) => prev + 1);
    showToast({
      type: 'info',
      title: 'Demo GardenWorld Activado',
      message: 'Credenciales oficiales test.idempiere.org preparadas en el formulario.',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navbar */}
      <Navbar
        session={session}
        proxyConfig={proxyConfig}
        failedAttemptsCount={security.failedCount}
        isLocked={isLocked}
        onUpdateProxy={handleUpdateProxy}
        onLoadGardenWorldDemo={handleLoadGardenWorldDemo}
        onOpenTokenInspector={() => setIsTokenModalOpen(true)}
        onOpenLoginAudit={() => setIsAuditModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {session ? (
          /* Logged In ERP Workspace */
          <Workspace
            session={session}
            proxyConfig={proxyConfig}
            onLogout={handleLogout}
            onUpdateSession={(updated) => {
              const merged = { ...session, ...updated };
              setSession(merged);
              try {
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(merged));
              } catch {}
            }}
          />
        ) : (
          /* Unauthenticated / Login Portal */
          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
            {/* Hero Card */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cliente PWA para iDempiere REST API v1</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Acceso Empresarial iDempiere ERP
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                Autenticación segura con soporte para multitenancy, selección de contexto en cascada y explorador interactivo de modelos.
              </p>
            </div>

            {/* Quick Security & Log Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Protección Activa: <strong className="text-white">{security.maxAttempts} intentos máx.</strong>
                </span>
                {security.failedCount > 0 && (
                  <span className="text-rose-400 font-mono text-[11px]">
                    ({security.failedCount} fallos)
                  </span>
                )}
              </div>

              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ver Registro de Accesos ({logs.length})</span>
              </button>
            </div>

            {/* Login Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
              <button
                type="button"
                onClick={() => setLoginMode('one-step')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  loginMode === 'one-step'
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>1 Paso (Login Rápido)</span>
              </button>

              <button
                type="button"
                onClick={() => setLoginMode('two-step')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  loginMode === 'two-step'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GitBranch className="w-4 h-4" />
                <span>2 Pasos (Cascada Multitenant)</span>
              </button>
            </div>

            {/* Active Login Form Container */}
            <div className="p-5 sm:p-7 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-xl">
              {loginMode === 'one-step' ? (
                <LoginFormOneStep
                  key={`one-step-${demoTrigger}`}
                  proxyConfig={proxyConfig}
                  isLocked={isLocked}
                  secondsRemaining={secondsRemaining}
                  remainingAttempts={remainingAttempts}
                  maxAttempts={security.maxAttempts}
                  onRecordAttempt={recordAttempt}
                  onSuccess={handleLoginSuccess}
                />
              ) : (
                <LoginFormTwoStep
                  key={`two-step-${demoTrigger}`}
                  proxyConfig={proxyConfig}
                  isLocked={isLocked}
                  secondsRemaining={secondsRemaining}
                  remainingAttempts={remainingAttempts}
                  maxAttempts={security.maxAttempts}
                  onRecordAttempt={recordAttempt}
                  onSuccess={handleLoginSuccess}
                />
              )}
            </div>

            {/* Architecture Info Cards */}
            <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Soporte CORS</span>
                  <span>Proxy local interno para evitar bloqueos del navegador.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Multitenant Real</span>
                  <span>Filtrado de Client, Role, Org y Warehouse según permisos ERP.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Terminal className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block">Auditoría y Límite</span>
                  <span>Registro de intentos y antifuerza bruta con bloqueo automático.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">iDempiere ERP Progressive Web App</span>
            <span>•</span>
            <span>REST API v1 Client</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="hover:text-cyan-400 transition inline-flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              <span>Auditoría de Acceso</span>
            </button>
            <span className="text-slate-700">|</span>
            <a
              href="https://test.idempiere.org"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400 transition inline-flex items-center gap-1"
            >
              <span>Demo test.idempiere.org</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-700">|</span>
            <span className="font-mono text-slate-400">PWA Standalone Ready</span>
          </div>
        </div>
      </footer>

      {/* Global Token Inspector Modal */}
      <TokenInspectorModal
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        session={session}
        proxyConfig={proxyConfig}
        onTokenRefreshed={(newToken, newRefreshToken) => {
          if (session) {
            const updated = {
              ...session,
              token: newToken,
              refreshToken: newRefreshToken || session.refreshToken,
            };
            setSession(updated);
            try {
              localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
            } catch {}
          }
        }}
      />

      {/* Login Audit & Max Attempts Modal */}
      <LoginAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={logs}
        security={security}
        isLocked={isLocked}
        secondsRemaining={secondsRemaining}
        onClearLogs={clearLogs}
        onResetLockout={resetLockout}
        onUpdateMaxAttempts={updateMaxAttempts}
      />

      {/* Network Offline Banner */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

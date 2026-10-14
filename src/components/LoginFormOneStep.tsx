import React, { useState } from 'react';
import {
  Zap,
  Globe,
  User,
  Lock,
  Building,
  Shield,
  Layers,
  Archive,
  Languages,
  Code,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';
import { AuthOneStepPayload, ProxyConfig } from '../types/idempiere';
import { GARDENWORLD_DEMO, loginOneStep } from '../services/idempiereApi';
import { useToast } from './Toast';

interface LoginFormOneStepProps {
  proxyConfig: ProxyConfig;
  onSuccess: (sessionData: any) => void;
  isLocked?: boolean;
  secondsRemaining?: number;
  remainingAttempts?: number;
  maxAttempts?: number;
  onRecordAttempt?: (attempt: {
    userName: string;
    baseUrl: string;
    mode: 'one-step' | 'two-step';
    status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
    message?: string;
    durationMs?: number;
  }) => void;
  initialBaseUrl?: string;
  initialUserName?: string;
  initialPassword?: string;
  initialClientId?: number;
  initialRoleId?: number;
  initialOrgId?: number;
  initialWarehouseId?: number;
  initialLanguage?: string;
}

export const LoginFormOneStep: React.FC<LoginFormOneStepProps> = ({
  proxyConfig,
  onSuccess,
  isLocked = false,
  secondsRemaining = 0,
  remainingAttempts = 3,
  maxAttempts = 3,
  onRecordAttempt,
  initialBaseUrl = GARDENWORLD_DEMO.baseUrl,
  initialUserName = GARDENWORLD_DEMO.userName,
  initialPassword = GARDENWORLD_DEMO.password,
  initialClientId = GARDENWORLD_DEMO.parameters.clientId,
  initialRoleId = GARDENWORLD_DEMO.parameters.roleId,
  initialOrgId = GARDENWORLD_DEMO.parameters.organizationId,
  initialWarehouseId = GARDENWORLD_DEMO.parameters.warehouseId,
  initialLanguage = GARDENWORLD_DEMO.parameters.language,
}) => {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [userName, setUserName] = useState(initialUserName);
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);

  // Parameters
  const [clientId, setClientId] = useState<number>(initialClientId);
  const [roleId, setRoleId] = useState<number>(initialRoleId);
  const [organizationId, setOrganizationId] = useState<number>(initialOrgId);
  const [warehouseId, setWarehouseId] = useState<number>(initialWarehouseId);
  const [language, setLanguage] = useState<string>(initialLanguage);

  const [loading, setLoading] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  const { showToast } = useToast();

  const currentPayload: AuthOneStepPayload = {
    userName: userName.trim(),
    password: password,
    parameters: {
      clientId: Number(clientId),
      roleId: Number(roleId),
      organizationId: Number(organizationId),
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      language: language.trim() || 'en_US',
    },
  };

  const handleFillGardenWorld = () => {
    setBaseUrl(GARDENWORLD_DEMO.baseUrl);
    setUserName(GARDENWORLD_DEMO.userName);
    setPassword(GARDENWORLD_DEMO.password);
    setClientId(GARDENWORLD_DEMO.parameters.clientId);
    setRoleId(GARDENWORLD_DEMO.parameters.roleId);
    setOrganizationId(GARDENWORLD_DEMO.parameters.organizationId);
    setWarehouseId(GARDENWORLD_DEMO.parameters.warehouseId);
    setLanguage(GARDENWORLD_DEMO.parameters.language);
    showToast({
      type: 'info',
      title: 'Datos de GardenWorld cargados',
      message: 'Credenciales y parámetros de prueba rellenados listos para conectar.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      showToast({
        type: 'warning',
        title: 'Acceso Bloqueado',
        message: `Espera ${secondsRemaining}s antes de reintentar el ingreso.`,
      });
      return;
    }

    if (!baseUrl.trim() || !userName.trim() || !password) {
      showToast({
        type: 'warning',
        title: 'Campos requeridos',
        message: 'Por favor completa la URL del servidor, usuario y contraseña.',
      });
      return;
    }

    setLoading(true);
    const start = performance.now();

    try {
      const result = await loginOneStep(baseUrl, currentPayload, proxyConfig);
      const durationMs = Math.round(performance.now() - start);

      onRecordAttempt?.({
        userName: userName.trim(),
        baseUrl: baseUrl.trim(),
        mode: 'one-step',
        status: 'SUCCESS',
        durationMs,
      });

      showToast({
        type: 'success',
        title: 'Autenticación Exitosa',
        message: `Token obtenido en ${durationMs}ms vía iDempiere REST v1.`,
      });

      onSuccess({
        token: result.data.token,
        refreshToken: result.data.refreshToken,
        baseUrl: baseUrl.trim(),
        userName: userName.trim(),
        parameters: currentPayload.parameters,
        userSummary: result.data.userSummary,
        roleSummary: result.data.roleSummary,
        rawResponse: result.data,
        loginMode: 'one-step',
      });
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);

      onRecordAttempt?.({
        userName: userName.trim(),
        baseUrl: baseUrl.trim(),
        mode: 'one-step',
        status: 'FAILED',
        message: err.message,
        durationMs,
      });

      showToast({
        type: 'error',
        title: 'Error de Autenticación',
        message: err.message || 'No se pudo autenticar en el servidor iDempiere.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      {/* Lockout Warning Banner */}
      {isLocked && (
        <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-3 animate-pulse shadow-lg">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong className="block text-white font-bold">Bloqueo de Seguridad Activo</strong>
              <span>
                Límite de {maxAttempts} intentos fallidos alcanzado. Espera{' '}
                <strong className="font-mono text-white text-sm">{secondsRemaining}s</strong> para reintentar.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Banner Notice with Attempts counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">
            Envío a <code className="text-cyan-300 font-mono">POST /api/v1/auth/tokens</code>
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Attempts counter pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border ${
              isLocked
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : remainingAttempts <= 1
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Intentos: {remainingAttempts}/{maxAttempts}</span>
          </div>

          <button
            type="button"
            onClick={handleFillGardenWorld}
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>GardenWorld</span>
          </button>
        </div>
      </div>

      {/* Server & Credentials Section */}
      <div className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Servidor Base iDempiere</span>
          </label>
          <input
            type="text"
            required
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://test.idempiere.org:443"
            className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-3.5 py-2 text-xs sm:text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Usuario (userName)</span>
            </label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="admin @ gardenworld.com"
              className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Contraseña</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-950 border border-slate-700/80 pl-3.5 pr-10 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Context Parameters Section */}
      <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Parámetros de Contexto ERP
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">Contexto Multitenant</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-0.5 flex items-center gap-1">
              <Building className="w-3 h-3 text-cyan-400" />
              <span>Client ID</span>
            </label>
            <input
              type="number"
              required
              value={clientId}
              onChange={(e) => setClientId(Number(e.target.value))}
              placeholder="11"
              className="w-full rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-0.5 flex items-center gap-1">
              <Shield className="w-3 h-3 text-indigo-400" />
              <span>Role ID</span>
            </label>
            <input
              type="number"
              required
              value={roleId}
              onChange={(e) => setRoleId(Number(e.target.value))}
              placeholder="102"
              className="w-full rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 text-xs text-indigo-300 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-0.5 flex items-center gap-1">
              <Layers className="w-3 h-3 text-teal-400" />
              <span>Org ID</span>
            </label>
            <input
              type="number"
              required
              value={organizationId}
              onChange={(e) => setOrganizationId(Number(e.target.value))}
              placeholder="11"
              className="w-full rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 text-xs text-teal-300 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-0.5 flex items-center gap-1">
              <Archive className="w-3 h-3 text-amber-400" />
              <span>Warehouse ID</span>
            </label>
            <input
              type="number"
              value={warehouseId}
              onChange={(e) => setWarehouseId(Number(e.target.value))}
              placeholder="103"
              className="w-full rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="col-span-2 sm:col-span-2">
            <label className="block text-[11px] font-medium text-slate-400 mb-0.5 flex items-center gap-1">
              <Languages className="w-3 h-3 text-pink-400" />
              <span>Idioma</span>
            </label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="en_US"
              className="w-full rounded-lg bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 text-xs text-pink-300 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* JSON Payload Inspection Toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowPayload(!showPayload)}
          className="flex items-center gap-1.5 text-xs font-mono text-cyan-400/90 hover:text-cyan-300 transition"
        >
          <Code className="w-3.5 h-3.5" />
          <span>{showPayload ? 'Ocultar Payload JSON' : 'Ver Payload JSON a enviar'}</span>
        </button>

        {showPayload && (
          <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto shadow-inner">
            <pre>{JSON.stringify(currentPayload, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || isLocked}
        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:via-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            <span>Autenticando en iDempiere REST v1...</span>
          </>
        ) : isLocked ? (
          <>
            <AlertOctagon className="w-4 h-4" />
            <span>Bloqueado por Intentos Excedidos ({secondsRemaining}s)</span>
          </>
        ) : (
          <>
            <span>Iniciar Sesión (1 Paso Rápido)</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};

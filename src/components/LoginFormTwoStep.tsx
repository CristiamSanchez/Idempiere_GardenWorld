import React, { useState } from 'react';
import {
  GitBranch,
  Globe,
  User,
  Lock,
  Building,
  Shield,
  Layers,
  Archive,
  Languages,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Key,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';
import {
  ClientOption,
  OrgOption,
  ProxyConfig,
  RoleOption,
  WarehouseOption,
} from '../types/idempiere';
import {
  GARDENWORLD_DEMO,
  fetchAuthOrganizations,
  fetchAuthRoles,
  fetchAuthWarehouses,
  loginOneStep,
  loginTwoStepFinalize,
  loginTwoStepInit,
} from '../services/idempiereApi';
import { useToast } from './Toast';

interface LoginFormTwoStepProps {
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
}

export const LoginFormTwoStep: React.FC<LoginFormTwoStepProps> = ({
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
}) => {
  // Step 1 State: Credentials
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [userName, setUserName] = useState(initialUserName);
  const [password, setPassword] = useState(initialPassword);

  // Stepper: 1 = Credentials, 2 = Cascade Selection
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Step 1 Result
  const [tempToken, setTempToken] = useState<string>('');
  const [rawInitData, setRawInitData] = useState<any>(null);

  // Cascade Options
  const [clients, setClients] = useState<ClientOption[]>([
    { id: 11, name: 'GardenWorld (ID 11)' },
    { id: 0, name: 'System (ID 0)' },
  ]);
  const [roles, setRoles] = useState<RoleOption[]>([
    { id: 102, name: 'GardenWorld Admin (ID 102)', clientId: 11 },
    { id: 103, name: 'GardenWorld User (ID 103)', clientId: 11 },
    { id: 0, name: 'System Administrator (ID 0)', clientId: 0 },
  ]);
  const [organizations, setOrganizations] = useState<OrgOption[]>([
    { id: 11, name: 'HQ - Oficina Central (ID 11)', clientId: 11 },
    { id: 0, name: '* - Todas las Organizaciones (ID 0)', clientId: 11 },
  ]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([
    { id: 103, name: 'HQ Warehouse (ID 103)', organizationId: 11 },
    { id: 104, name: 'Fertilizer & Seeds Warehouse (ID 104)', organizationId: 11 },
  ]);

  // Selected Cascade Values
  const [selectedClientId, setSelectedClientId] = useState<number>(11);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(102);
  const [selectedOrgId, setSelectedOrgId] = useState<number>(11);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(103);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en_US');

  // Loading States
  const [loadingStep1, setLoadingStep1] = useState(false);
  const [loadingStep2, setLoadingStep2] = useState(false);
  const [loadingCascade, setLoadingCascade] = useState(false);

  const { showToast } = useToast();

  const handleFillGardenWorld = () => {
    setBaseUrl(GARDENWORLD_DEMO.baseUrl);
    setUserName(GARDENWORLD_DEMO.userName);
    setPassword(GARDENWORLD_DEMO.password);
    setSelectedClientId(11);
    setSelectedRoleId(102);
    setSelectedOrgId(11);
    setSelectedWarehouseId(103);
    setSelectedLanguage('en_US');
    showToast({
      type: 'info',
      title: 'Datos de GardenWorld listos',
      message: 'Credenciales de demo rellenadas para el proceso en 2 pasos.',
    });
  };

  // Execute Step 1: Validate User & Password
  const handleValidateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      showToast({
        type: 'warning',
        title: 'Acceso Bloqueado',
        message: `Espera ${secondsRemaining}s antes de reintentar.`,
      });
      return;
    }

    if (!baseUrl.trim() || !userName.trim() || !password) {
      showToast({
        type: 'warning',
        title: 'Faltan credenciales',
        message: 'Por favor ingresa la URL del servidor, usuario y contraseña.',
      });
      return;
    }

    setLoadingStep1(true);
    const start = performance.now();

    try {
      const result = await loginTwoStepInit(
        baseUrl,
        { userName: userName.trim(), password },
        proxyConfig
      );

      setRawInitData(result.data);
      const token = result.data.token || '';
      setTempToken(token);

      if (result.data.clients && Array.isArray(result.data.clients) && result.data.clients.length > 0) {
        setClients(result.data.clients);
        setSelectedClientId(result.data.clients[0].id);
      }
      if (result.data.roles && Array.isArray(result.data.roles) && result.data.roles.length > 0) {
        setRoles(result.data.roles);
        setSelectedRoleId(result.data.roles[0].id);
      }

      showToast({
        type: 'success',
        title: 'Paso 1 Completado',
        message: 'Credenciales validadas. Selecciona el contexto multitenant en cascada.',
      });

      setCurrentStep(2);

      if (token) {
        loadDynamicCascade(token, selectedClientId);
      }
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);

      onRecordAttempt?.({
        userName: userName.trim(),
        baseUrl: baseUrl.trim(),
        mode: 'two-step',
        status: 'FAILED',
        message: err.message,
        durationMs,
      });

      showToast({
        type: 'error',
        title: 'Error en Paso 1 (Credenciales)',
        message: err.message || 'Error al validar credenciales iniciales en iDempiere.',
      });
    } finally {
      setLoadingStep1(false);
    }
  };

  const loadDynamicCascade = async (token: string, clientId: number) => {
    setLoadingCascade(true);
    try {
      const fetchedRoles = await fetchAuthRoles(baseUrl, token, clientId, proxyConfig);
      if (fetchedRoles.length > 0) {
        setRoles(fetchedRoles);
        setSelectedRoleId(fetchedRoles[0].id);
      }

      const fetchedOrgs = await fetchAuthOrganizations(
        baseUrl,
        token,
        clientId,
        selectedRoleId,
        proxyConfig
      );
      if (fetchedOrgs.length > 0) {
        setOrganizations(fetchedOrgs);
        setSelectedOrgId(fetchedOrgs[0].id);
      }

      const fetchedWarehouses = await fetchAuthWarehouses(
        baseUrl,
        token,
        selectedRoleId,
        selectedOrgId,
        proxyConfig
      );
      if (fetchedWarehouses.length > 0) {
        setWarehouses(fetchedWarehouses);
        setSelectedWarehouseId(fetchedWarehouses[0].id);
      }
    } catch (e) {
      console.warn('Cascade dynamic loading note:', e);
    } finally {
      setLoadingCascade(false);
    }
  };

  const handleRoleChange = async (newRoleId: number) => {
    setSelectedRoleId(newRoleId);
    if (tempToken) {
      const fetchedOrgs = await fetchAuthOrganizations(
        baseUrl,
        tempToken,
        selectedClientId,
        newRoleId,
        proxyConfig
      );
      if (fetchedOrgs.length > 0) {
        setOrganizations(fetchedOrgs);
        setSelectedOrgId(fetchedOrgs[0].id);
      }
    }
  };

  const handleOrgChange = async (newOrgId: number) => {
    setSelectedOrgId(newOrgId);
    if (tempToken) {
      const fetchedWarehouses = await fetchAuthWarehouses(
        baseUrl,
        tempToken,
        selectedRoleId,
        newOrgId,
        proxyConfig
      );
      if (fetchedWarehouses.length > 0) {
        setWarehouses(fetchedWarehouses);
        setSelectedWarehouseId(fetchedWarehouses[0].id);
      }
    }
  };

  const handleFinalizeSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingStep2(true);
    const start = performance.now();

    const parameters = {
      clientId: Number(selectedClientId),
      roleId: Number(selectedRoleId),
      organizationId: Number(selectedOrgId),
      warehouseId: selectedWarehouseId ? Number(selectedWarehouseId) : undefined,
      language: selectedLanguage.trim() || 'en_US',
    };

    try {
      let finalResult: any;

      if (tempToken) {
        try {
          finalResult = await loginTwoStepFinalize(
            baseUrl,
            { token: tempToken, parameters },
            proxyConfig
          );
        } catch {
          finalResult = await loginOneStep(
            baseUrl,
            { userName: userName.trim(), password, parameters },
            proxyConfig
          );
        }
      } else {
        finalResult = await loginOneStep(
          baseUrl,
          { userName: userName.trim(), password, parameters },
          proxyConfig
        );
      }

      const durationMs = Math.round(performance.now() - start);

      onRecordAttempt?.({
        userName: userName.trim(),
        baseUrl: baseUrl.trim(),
        mode: 'two-step',
        status: 'SUCCESS',
        durationMs,
      });

      const clientObj = clients.find((c) => c.id === selectedClientId);
      const roleObj = roles.find((r) => r.id === selectedRoleId);
      const orgObj = organizations.find((o) => o.id === selectedOrgId);
      const whObj = warehouses.find((w) => w.id === selectedWarehouseId);

      showToast({
        type: 'success',
        title: '¡Sesión Definitiva Obtenida!',
        message: `Acceso concedido a ${clientObj?.name || 'Cliente'} como ${roleObj?.name || 'Rol'}.`,
      });

      onSuccess({
        token: finalResult.data?.token || tempToken,
        refreshToken: finalResult.data?.refreshToken,
        baseUrl: baseUrl.trim(),
        userName: userName.trim(),
        parameters,
        clientName: clientObj?.name,
        roleName: roleObj?.name,
        orgName: orgObj?.name,
        warehouseName: whObj?.name,
        userSummary: finalResult.data?.userSummary || rawInitData?.userSummary,
        roleSummary: finalResult.data?.roleSummary || rawInitData?.roleSummary,
        rawResponse: finalResult.data || rawInitData,
        loginMode: 'two-step',
      });
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);

      onRecordAttempt?.({
        userName: userName.trim(),
        baseUrl: baseUrl.trim(),
        mode: 'two-step',
        status: 'FAILED',
        message: err.message,
        durationMs,
      });

      showToast({
        type: 'error',
        title: 'Error al finalizar sesión',
        message: err.message || 'No se pudo obtener el token de sesión definitivo.',
      });
    } finally {
      setLoadingStep2(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Lockout Warning Banner */}
      {isLocked && (
        <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center justify-between gap-3 animate-pulse shadow-lg">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong className="block text-white font-bold">Bloqueo de Seguridad Activo</strong>
              <span>
                Límite de {maxAttempts} intentos alcanzado. Espera{' '}
                <strong className="font-mono text-white text-sm">{secondsRemaining}s</strong> para reintentar.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stepper Progress Bar */}
      <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition ${
              currentStep === 1
                ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20'
                : 'bg-emerald-500 text-slate-950'
            }`}
          >
            {currentStep > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
          </div>
          <div>
            <div className="font-semibold text-white leading-none">Paso 1: Credenciales</div>
            <div className="text-[10px] text-slate-400">Usuario y Contraseña</div>
          </div>
        </div>

        <div className="h-0.5 flex-1 mx-3 bg-slate-800 relative">
          <div
            className={`absolute top-0 left-0 h-full bg-cyan-500 transition-all duration-300 ${
              currentStep === 2 ? 'w-full' : 'w-0'
            }`}
          />
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition ${
              currentStep === 2
                ? 'bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/20'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            2
          </div>
          <div>
            <div className={`font-semibold leading-none ${currentStep === 2 ? 'text-white' : 'text-slate-400'}`}>
              Paso 2: Multitenant
            </div>
            <div className="text-[10px] text-slate-500">Cliente &gt; Rol &gt; Org &gt; Almacén</div>
          </div>
        </div>
      </div>

      {/* STEP 1: CREDENTIALS */}
      {currentStep === 1 && (
        <form onSubmit={handleValidateCredentials} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Valida credenciales para descubrir entidades asignadas.</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
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
                <span>Usuario ERP</span>
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
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingStep1 || isLocked}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40"
          >
            {loadingStep1 ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Validando credenciales en iDempiere...</span>
              </>
            ) : isLocked ? (
              <>
                <AlertOctagon className="w-4 h-4" />
                <span>Bloqueado ({secondsRemaining}s)</span>
              </>
            ) : (
              <>
                <span>Validar Credenciales y Continuar (Paso 1)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: CASCADE MULTITENANT SELECTION */}
      {currentStep === 2 && (
        <form onSubmit={handleFinalizeSession} className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Token inicial recibido. Selecciona la jerarquía multitenant.</span>
            </div>
            {loadingCascade && (
              <span className="flex items-center gap-1 text-[11px] text-cyan-300 shrink-0">
                <RefreshCw className="w-3 h-3 animate-spin" /> Consultando...
              </span>
            )}
          </div>

          {/* Cascading selectors */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
            {/* 1. Cliente */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-0.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-cyan-400" />
                  <span>1. Cliente / Empresa (Client)</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-400">ID: {selectedClientId}</span>
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedClientId(val);
                  if (tempToken) loadDynamicCascade(tempToken, val);
                }}
                className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Rol */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-0.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>2. Rol de Acceso (Role)</span>
                </span>
                <span className="text-[10px] font-mono text-indigo-400">ID: {selectedRoleId}</span>
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => handleRoleChange(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                {roles
                  .filter((r) => r.clientId === undefined || r.clientId === selectedClientId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* 3. Organización */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-0.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  <span>3. Organización (Organization)</span>
                </span>
                <span className="text-[10px] font-mono text-teal-400">ID: {selectedOrgId}</span>
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => handleOrgChange(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Almacén */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-0.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  <span>4. Almacén (Warehouse)</span>
                </span>
                <span className="text-[10px] font-mono text-amber-400">ID: {selectedWarehouseId}</span>
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Idioma */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-0.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-pink-400" />
                  <span>5. Idioma (Language)</span>
                </span>
                <span className="text-[10px] font-mono text-pink-400">{selectedLanguage}</span>
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700/80 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="en_US">English (en_US)</option>
                <option value="es_ES">Español (es_ES)</option>
                <option value="de_DE">Deutsch (de_DE)</option>
                <option value="fr_FR">Français (fr_FR)</option>
                <option value="pt_BR">Português (pt_BR)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>

            <button
              type="submit"
              disabled={loadingStep2 || isLocked}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40"
            >
              {loadingStep2 ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Generando Token Definitivo...</span>
                </>
              ) : isLocked ? (
                <>
                  <AlertOctagon className="w-4 h-4" />
                  <span>Bloqueado ({secondsRemaining}s)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Selección y Obtener Token</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

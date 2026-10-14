import {
  AuthOneStepPayload,
  AuthParameters,
  AuthTokensResponse,
  AuthTwoStepFinalPayload,
  AuthTwoStepInitialPayload,
  ClientOption,
  DecodedJWT,
  ModelQueryOptions,
  ModelResponse,
  OrgOption,
  ProxyConfig,
  RoleOption,
  WarehouseOption,
} from '../types/idempiere';

// Default Demo GardenWorld Configuration
export const GARDENWORLD_DEMO = {
  baseUrl: 'https://test.idempiere.org:443',
  userName: 'admin @ gardenworld.com',
  password: 'GardenAdmin',
  parameters: {
    clientId: 11,
    roleId: 102,
    organizationId: 11,
    warehouseId: 103,
    language: 'en_US',
  },
  labels: {
    client: 'GardenWorld',
    role: 'GardenWorld Admin',
    org: 'HQ',
    warehouse: 'HQ Warehouse',
  },
};

// Known Standard Tables in iDempiere ERP
export const STANDARD_TABLES = [
  { name: 'C_BPartner', label: 'Terceros (Business Partners)', category: 'Ventas y Compras' },
  { name: 'M_Product', label: 'Productos (Products)', category: 'Inventario' },
  { name: 'C_Order', label: 'Pedidos de Venta / Compra (Orders)', category: 'Ventas' },
  { name: 'C_Invoice', label: 'Facturas (Invoices)', category: 'Facturación' },
  { name: 'AD_User', label: 'Contactos y Usuarios (Users)', category: 'Seguridad' },
  { name: 'C_Payment', label: 'Pagos y Cobros (Payments)', category: 'Finanzas' },
  { name: 'M_InOut', label: 'Albaranes / Envíos (Shipments)', category: 'Logística' },
  { name: 'M_Warehouse', label: 'Almacenes (Warehouses)', category: 'Inventario' },
  { name: 'C_BPartner_Location', label: 'Direcciones de Terceros', category: 'Ventas' },
  { name: 'M_StorageOnHand', label: 'Stock en Mano (Storage)', category: 'Inventario' },
];

/**
 * Builds the effective target URL applying CORS proxy if active
 */
export function buildProxyUrl(targetUrl: string, proxy: ProxyConfig): string {
  if (!proxy.enabled || !proxy.proxyUrl.trim()) {
    return targetUrl;
  }

  const cleanProxy = proxy.proxyUrl.trim();

  // If proxy uses query param (?url= or ?):
  if (cleanProxy.endsWith('?url=') || cleanProxy.endsWith('?')) {
    // corsproxy.io supports direct concatenation: https://corsproxy.io/?https://...
    if (cleanProxy.includes('corsproxy.io')) {
      return `${cleanProxy}${encodeURIComponent(targetUrl)}`;
    }
    return `${cleanProxy}${encodeURIComponent(targetUrl)}`;
  }

  // If proxy has no trailing delimiter
  if (cleanProxy.includes('?')) {
    return `${cleanProxy}&url=${encodeURIComponent(targetUrl)}`;
  }

  return `${cleanProxy}?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * Decodes a JWT token without requiring external library
 */
export function decodeJwt(token: string): DecodedJWT | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return {
      sub: parsed.sub,
      userName: parsed.userName || parsed.sub,
      userId: parsed.userId || parsed.ad_user_id,
      clientId: parsed.clientId || parsed.ad_client_id,
      roleId: parsed.roleId || parsed.ad_role_id,
      orgId: parsed.orgId || parsed.ad_org_id,
      exp: parsed.exp,
      iat: parsed.iat,
      iss: parsed.iss,
      rawPayload: parsed,
    };
  } catch (e) {
    console.warn('Could not decode JWT:', e);
    return null;
  }
}

/**
 * Generic Fetch with timeout, diagnostic headers and automatic intelligent fallback
 */
export async function executeFetch(
  fullUrl: string,
  proxy: ProxyConfig,
  init: RequestInit = {}
): Promise<{ response: Response; durationMs: number; finalUrl: string }> {
  const effectiveUrl = buildProxyUrl(fullUrl, proxy);
  const startTime = performance.now();

  async function performFetch(url: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(init.headers || {}),
        },
      });
      clearTimeout(timeoutId);
      return res;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  try {
    const response = await performFetch(effectiveUrl);

    // If corsproxy.io returns 403 (due to deprecated keyless anonymous URLs)
    if (!response.ok && (effectiveUrl.includes('corsproxy.io') || response.status === 403)) {
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        if (text.includes('keyless_legacy_url') || text.includes('Anonymous legacy proxy')) {
          console.warn('corsproxy.io bloqueado por política de API key. Reenrutando a Proxy Local...');
          // Try local proxy
          const fallbackLocal = `/local-proxy?url=${encodeURIComponent(fullUrl)}`;
          const fallbackRes = await performFetch(fallbackLocal);
          if (fallbackRes.ok) {
            const durationMs = Math.round(performance.now() - startTime);
            return { response: fallbackRes, durationMs, finalUrl: fallbackLocal };
          }
        }
      } catch {}
    }

    const durationMs = Math.round(performance.now() - startTime);
    return { response, durationMs, finalUrl: effectiveUrl };
  } catch (error: any) {
    // If external proxy failed to connect (CORS / Network)
    if (proxy.enabled) {
      try {
        const fallbackLocal = `/local-proxy?url=${encodeURIComponent(fullUrl)}`;
        const fallbackRes = await performFetch(fallbackLocal);
        const durationMs = Math.round(performance.now() - startTime);
        return { response: fallbackRes, durationMs, finalUrl: fallbackLocal };
      } catch {
        try {
          const directRes = await performFetch(fullUrl);
          const durationMs = Math.round(performance.now() - startTime);
          return { response: directRes, durationMs, finalUrl: fullUrl };
        } catch {}
      }
    }

    const durationMs = Math.round(performance.now() - startTime);
    if (error.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado (20s) conectando a ${fullUrl}`);
    }

    throw new Error(
      `Error de Conexión: El navegador bloqueó la solicitud a ${fullUrl}. ` +
        `Usa el "Proxy Local (/local-proxy?url=)" en la barra superior.`
    );
  }
}

/**
 * 1-Step Fast Authentication
 * POST {baseUrl}/api/v1/auth/tokens
 */
export async function loginOneStep(
  baseUrl: string,
  payload: AuthOneStepPayload,
  proxy: ProxyConfig
): Promise<{ data: AuthTokensResponse; durationMs: number; status: number }> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/auth/tokens`;

  const { response, durationMs } = await executeFetch(endpoint, proxy, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawResponse: text };
  }

  if (!response.ok) {
    const errorMsg =
      json.detail ||
      json.message ||
      json.error ||
      `HTTP ${response.status}: Error al autenticar en iDempiere`;
    throw new Error(errorMsg);
  }

  return { data: json as AuthTokensResponse, durationMs, status: response.status };
}

/**
 * 2-Step Authentication: Step 1 (Validate credentials, get temp token & initial lists)
 * POST {baseUrl}/api/v1/auth/tokens
 */
export async function loginTwoStepInit(
  baseUrl: string,
  payload: AuthTwoStepInitialPayload,
  proxy: ProxyConfig
): Promise<{ data: AuthTokensResponse; durationMs: number; status: number }> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/auth/tokens`;

  const { response, durationMs } = await executeFetch(endpoint, proxy, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawResponse: text };
  }

  if (!response.ok) {
    const errorMsg =
      json.detail ||
      json.message ||
      json.error ||
      `HTTP ${response.status}: Credenciales inválidas o error en iDempiere`;
    throw new Error(errorMsg);
  }

  return { data: json as AuthTokensResponse, durationMs, status: response.status };
}

/**
 * 2-Step Authentication: Fetch roles for client
 * GET {baseUrl}/api/v1/auth/roles
 */
export async function fetchAuthRoles(
  baseUrl: string,
  token: string,
  clientId: number,
  proxy: ProxyConfig
): Promise<RoleOption[]> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/auth/roles?clientId=${clientId}`;

  try {
    const { response } = await executeFetch(endpoint, proxy, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : data.roles || [];
    }
  } catch (e) {
    console.warn('Could not fetch dynamic roles from iDempiere:', e);
  }
  return [];
}

/**
 * 2-Step Authentication: Fetch organizations for client & role
 * GET {baseUrl}/api/v1/auth/organizations
 */
export async function fetchAuthOrganizations(
  baseUrl: string,
  token: string,
  clientId: number,
  roleId: number,
  proxy: ProxyConfig
): Promise<OrgOption[]> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/auth/organizations?clientId=${clientId}&roleId=${roleId}`;

  try {
    const { response } = await executeFetch(endpoint, proxy, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : data.organizations || [];
    }
  } catch (e) {
    console.warn('Could not fetch dynamic organizations from iDempiere:', e);
  }
  return [];
}

/**
 * 2-Step Authentication: Fetch warehouses for org
 * GET {baseUrl}/api/v1/auth/warehouses
 */
export async function fetchAuthWarehouses(
  baseUrl: string,
  token: string,
  roleId: number,
  organizationId: number,
  proxy: ProxyConfig
): Promise<WarehouseOption[]> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/auth/warehouses?roleId=${roleId}&organizationId=${organizationId}`;

  try {
    const { response } = await executeFetch(endpoint, proxy, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return Array.isArray(data) ? data : data.warehouses || [];
    }
  } catch (e) {
    console.warn('Could not fetch dynamic warehouses from iDempiere:', e);
  }
  return [];
}

/**
 * 2-Step Authentication: Step 2 (Finalize session with chosen multitenant parameters)
 * PUT {baseUrl}/api/v1/auth/tokens
 */
export async function loginTwoStepFinalize(
  baseUrl: string,
  payload: AuthTwoStepFinalPayload,
  proxy: ProxyConfig
): Promise<{ data: AuthTokensResponse; durationMs: number; status: number }> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/auth/tokens`;

  // Standard iDempiere REST v1 supports PUT /api/v1/auth/tokens with token & parameters
  const { response, durationMs } = await executeFetch(endpoint, proxy, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${payload.token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawResponse: text };
  }

  if (!response.ok) {
    const errorMsg =
      json.detail ||
      json.message ||
      json.error ||
      `HTTP ${response.status}: Error al confirmar parámetros en iDempiere`;
    throw new Error(errorMsg);
  }

  return { data: json as AuthTokensResponse, durationMs, status: response.status };
}

/**
 * Refresh current session token
 * POST {baseUrl}/api/v1/auth/refresh-tokens
 */
export async function refreshAuthToken(
  baseUrl: string,
  token: string,
  refreshToken?: string,
  proxy: ProxyConfig = { enabled: false, proxyUrl: '' }
): Promise<AuthTokensResponse> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/auth/refresh-tokens`;

  const { response } = await executeFetch(endpoint, proxy, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ token, refreshToken }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: No se pudo refrescar el token`);
  }

  return await response.json();
}

/**
 * Logout
 * POST {baseUrl}/api/v1/auth/logout
 */
export async function logoutSession(
  baseUrl: string,
  token: string,
  proxy: ProxyConfig
): Promise<boolean> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/auth/logout`;

  try {
    await executeFetch(endpoint, proxy, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Query Models / Tables
 * GET {baseUrl}/api/v1/models/{tableName}
 */
export async function queryModels(
  baseUrl: string,
  token: string,
  tableName: string,
  options: ModelQueryOptions = {},
  proxy: ProxyConfig
): Promise<{ data: ModelResponse; durationMs: number; finalUrl: string }> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const queryParams = new URLSearchParams();

  if (options.top) queryParams.set('$top', options.top.toString());
  if (options.skip) queryParams.set('$skip', options.skip.toString());
  if (options.filter) queryParams.set('$filter', options.filter);
  if (options.orderby) queryParams.set('$orderby', options.orderby);
  if (options.select) queryParams.set('$select', options.select);

  const qs = queryParams.toString();
  const endpoint = `${cleanBase}/api/v1/models/${tableName}${qs ? `?${qs}` : ''}`;

  const { response, durationMs, finalUrl } = await executeFetch(endpoint, proxy, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawResponse: text };
  }

  if (!response.ok) {
    throw new Error(
      json.detail || json.message || `HTTP ${response.status}: Error consultando modelo ${tableName}`
    );
  }

  return { data: json, durationMs, finalUrl };
}

/**
 * Create a new record in a Model
 * POST {baseUrl}/api/v1/models/{tableName}
 */
export async function createModelRecord(
  baseUrl: string,
  token: string,
  tableName: string,
  recordData: Record<string, any>,
  proxy: ProxyConfig
): Promise<{ data: any; durationMs: number }> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/models/${tableName}`;

  const { response, durationMs } = await executeFetch(endpoint, proxy, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(recordData),
  });

  const text = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawResponse: text };
  }

  if (!response.ok) {
    throw new Error(
      json.detail || json.message || `HTTP ${response.status}: Fallo al crear registro en ${tableName}`
    );
  }

  return { data: json, durationMs };
}

/**
 * Update an existing record
 * PUT {baseUrl}/api/v1/models/{tableName}/{id}
 */
export async function updateModelRecord(
  baseUrl: string,
  token: string,
  tableName: string,
  id: number | string,
  recordData: Record<string, any>,
  proxy: ProxyConfig
): Promise<{ data: any; durationMs: number }> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/models/${tableName}/${id}`;

  const { response, durationMs } = await executeFetch(endpoint, proxy, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(recordData),
  });

  const text = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawResponse: text };
  }

  if (!response.ok) {
    throw new Error(
      json.detail ||
        json.message ||
        `HTTP ${response.status}: Fallo al actualizar registro #${id} en ${tableName}`
    );
  }

  return { data: json, durationMs };
}

/**
 * Delete a record
 * DELETE {baseUrl}/api/v1/models/{tableName}/{id}
 */
export async function deleteModelRecord(
  baseUrl: string,
  token: string,
  tableName: string,
  id: number | string,
  proxy: ProxyConfig
): Promise<{ success: boolean; durationMs: number }> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/models/${tableName}/${id}`;

  const { response, durationMs } = await executeFetch(endpoint, proxy, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: Fallo al eliminar registro #${id} de ${tableName}`);
  }

  return { success: true, durationMs };
}

/**
 * Run Process
 * POST {baseUrl}/api/v1/processes/{processId}
 */
export async function runProcess(
  baseUrl: string,
  token: string,
  processId: string | number,
  parameters: Record<string, any>,
  proxy: ProxyConfig
): Promise<{ data: any; durationMs: number }> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBase}/api/v1/processes/${processId}`;

  const { response, durationMs } = await executeFetch(endpoint, proxy, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ parameters }),
  });

  const text = await response.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { rawResponse: text };
  }

  if (!response.ok) {
    throw new Error(
      json.detail || json.message || `HTTP ${response.status}: Fallo al ejecutar proceso ${processId}`
    );
  }

  return { data: json, durationMs };
}

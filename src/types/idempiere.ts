/**
 * Tipos e interfaces oficiales para iDempiere ERP REST API v1
 */

export interface AuthParameters {
  clientId: number;
  roleId: number;
  organizationId: number;
  warehouseId?: number;
  language?: string;
}

export interface AuthOneStepPayload {
  userName: string;
  password?: string;
  parameters: AuthParameters;
}

export interface AuthTwoStepInitialPayload {
  userName: string;
  password?: string;
}

export interface AuthTwoStepFinalPayload {
  token: string;
  parameters: AuthParameters;
}

export interface ClientOption {
  id: number;
  name: string;
  value?: string;
  description?: string;
}

export interface RoleOption {
  id: number;
  name: string;
  clientId: number;
  description?: string;
  userLevel?: string;
}

export interface OrgOption {
  id: number;
  name: string;
  clientId: number;
  roleId?: number;
  value?: string;
}

export interface WarehouseOption {
  id: number;
  name: string;
  organizationId: number;
  value?: string;
}

export interface UserSummary {
  id?: number;
  name?: string;
  userName?: string;
  email?: string;
  ad_user_id?: number;
}

export interface RoleSummary {
  id?: number;
  name?: string;
  ad_role_id?: number;
}

export interface AuthTokensResponse {
  token: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  parameters?: AuthParameters;
  userSummary?: UserSummary;
  roleSummary?: RoleSummary;
  clients?: ClientOption[];
  roles?: RoleOption[];
  organizations?: OrgOption[];
  warehouses?: WarehouseOption[];
  [key: string]: any;
}

export interface DecodedJWT {
  sub?: string;
  userName?: string;
  userId?: number;
  clientId?: number;
  roleId?: number;
  orgId?: number;
  exp?: number;
  iat?: number;
  iss?: string;
  rawPayload: Record<string, any>;
}

export interface ErpSession {
  token: string;
  refreshToken?: string;
  baseUrl: string;
  userName: string;
  parameters: AuthParameters;
  clientName?: string;
  roleName?: string;
  orgName?: string;
  warehouseName?: string;
  userSummary?: UserSummary;
  roleSummary?: RoleSummary;
  loginTime: number;
  expiresAt?: number;
  loginMode: 'one-step' | 'two-step';
  rawResponse?: Record<string, any>;
}

export interface ProxyConfig {
  enabled: boolean;
  proxyUrl: string; // e.g. "https://corsproxy.io/?" or "/local-proxy?url="
}

export interface ApiCallLog {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  requestBody?: any;
  responseBody?: any;
  error?: string;
}

export interface ModelQueryOptions {
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  select?: string;
}

export interface ModelRecord {
  id: number | string;
  uid?: string;
  [key: string]: any;
}

export interface ModelResponse {
  records?: ModelRecord[];
  totalRecords?: number;
  rowcount?: number;
  pageInfo?: {
    pageSize?: number;
    pageOffset?: number;
    totalRecords?: number;
  };
  [key: string]: any;
}

export interface ProcessRunPayload {
  processId: string | number;
  parameters?: Record<string, any>;
}

export interface LoginAttemptLog {
  id: string;
  timestamp: number;
  userName: string;
  baseUrl: string;
  mode: 'one-step' | 'two-step';
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  message?: string;
  attemptNumber: number;
  durationMs?: number;
}

export interface LoginSecurityState {
  maxAttempts: number;
  lockoutDurationSec: number;
  failedCount: number;
  lockedUntil: number | null;
}


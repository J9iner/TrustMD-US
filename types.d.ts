// TrustMD API TypeScript Definitions
// Type definitions for the TrustMD API integration layer

// ==================== CORE TYPES ====================

export interface TrustMDConfig {
    baseURL?: string;
    timeout?: number;
    persistence?: Storage | null;
    debug?: boolean;
    autoInit?: boolean;
}

export interface APIResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Headers;
    url: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface ErrorResponse {
    type: string;
    message: string;
    details?: any;
    action?: string;
    recoverable?: boolean;
    context?: any;
    originalError?: any;
    timestamp: string;
}

// ==================== AUTHENTICATION TYPES ====================

export interface LoginCredentials {
    email: string;
    password: string;
    tenantId?: string;
    rememberMe?: boolean;
}

export interface RegisterData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    tenantId?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roles: Role[];
    permissions: string[];
    tenantId?: string;
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    tenant: Tenant | null;
    loading: boolean;
    error: string | null;
}

// ==================== TENANT TYPES ====================

export interface Tenant {
    id: string;
    name: string;
    domain?: string;
    plan: string;
    isActive: boolean;
    settings: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface TenantStats {
    totalUsers: number;
    activeUsers: number;
    totalReports: number;
    storageUsed: number;
    lastActivity: string;
}

// ==================== ROLE TYPES ====================

export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
}

// ==================== COMPLIANCE TYPES ====================

export interface ComplianceTemplate {
    id: string;
    name: string;
    category: string;
    description: string;
    version: string;
    requirements: ComplianceRequirement[];
    isCustom?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ComplianceRequirement {
    id: string;
    name: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    dueDays: number;
    criteria: ComplianceCriterion[];
    evidenceRequired: string[];
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
    notes?: string;
}

export interface ComplianceCriterion {
    description: string;
    type: string;
    required: boolean;
}

export interface ComplianceReport {
    id: string;
    templateId: string;
    templateName: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    score?: number;
    results: ComplianceResult[];
    generatedAt: string;
    completedAt?: string;
    error?: string;
}

export interface ComplianceResult {
    requirementId: string;
    requirementName: string;
    status: 'pass' | 'fail' | 'pending';
    score?: number;
    evidence: Evidence[];
    notes?: string;
}

export interface Evidence {
    id: string;
    requirementId: string;
    filename: string;
    url: string;
    size: number;
    contentType: string;
    uploadedAt: string;
    uploadedBy: string;
    metadata?: Record<string, any>;
}

export interface ComplianceAlert {
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    requirementId?: string;
    reportId?: string;
    acknowledged: boolean;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    createdAt: string;
}

export interface ComplianceState {
    templates: ComplianceTemplate[];
    reports: ComplianceReport[];
    alerts: ComplianceAlert[];
    requirements: ComplianceRequirement[];
    evidence: Evidence[];
    loading: boolean;
    error: string | null;
}

// ==================== REPORT TYPES ====================

export interface ReportJob {
    id: string;
    type: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    parameters: Record<string, any>;
    progress?: number;
    result?: any;
    error?: string;
    createdAt: string;
    completedAt?: string;
}

export interface ReportTemplate {
    id: string;
    name: string;
    type: string;
    description: string;
    parameters: ReportParameter[];
    format: 'pdf' | 'excel' | 'csv' | 'json';
    isCustom: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ReportParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'select';
    label: string;
    required: boolean;
    options?: string[];
    defaultValue?: any;
}

export interface ScheduledReport {
    id: string;
    templateId: string;
    name: string;
    schedule: string;
    parameters: Record<string, any>;
    recipients: string[];
    isActive: boolean;
    lastRun?: string;
    nextRun: string;
    createdAt: string;
    updatedAt: string;
}

export interface ReportsState {
    activeReports: ReportJob[];
    completedReports: ComplianceReport[];
    scheduledReports: ScheduledReport[];
    templates: ReportTemplate[];
    loading: boolean;
    error: string | null;
}

// ==================== ADMIN TYPES ====================

export interface AdminUser extends User {
    lastLogin?: string;
    loginCount: number;
    failedLogins: number;
    isLocked: boolean;
    lockedUntil?: string;
    twoFactorEnabled: boolean;
}

export interface AuditLog {
    id: string;
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details: Record<string, any>;
    ipAddress: string;
    userAgent: string;
    timestamp: string;
}

export interface SecurityAlert {
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    source: string;
    details: Record<string, any>;
    acknowledged: boolean;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    resolved: boolean;
    resolvedAt?: string;
    resolvedBy?: string;
    createdAt: string;
}

export interface SystemStatus {
    status: 'healthy' | 'degraded' | 'down';
    version: string;
    uptime: number;
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    cpu: {
        usage: number;
    };
    database: {
        status: 'connected' | 'disconnected';
        connections: number;
        responseTime: number;
    };
    services: Record<string, {
        status: 'running' | 'stopped' | 'error';
        lastCheck: string;
    }>;
}

export interface AdminState {
    users: AdminUser[];
    tenants: Tenant[];
    roles: Role[];
    auditLogs: AuditLog[];
    securityAlerts: SecurityAlert[];
    systemStatus: SystemStatus | null;
    loading: boolean;
    error: string | null;
}

// ==================== UI STATE TYPES ====================

export interface UIState {
    sidebarOpen: boolean;
    theme: 'light' | 'dark' | 'auto';
    notifications: Notification[];
    modals: Modal[];
    loading: Record<string, boolean>;
    errors: Record<string, ErrorResponse>;
}

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    actions?: NotificationAction[];
    timestamp: string;
}

export interface NotificationAction {
    label: string;
    action: string;
    primary?: boolean;
}

export interface Modal {
    id: string;
    type: string;
    title: string;
    content?: any;
    props?: Record<string, any>;
    isOpen: boolean;
}

// ==================== CACHE TYPES ====================

export interface CacheState {
    templates: Map<string, any>;
    reports: Map<string, any>;
    users: Map<string, any>;
    metadata: {
        lastUpdated: string | null;
        version: string;
    };
}

// ==================== MAIN STATE TYPE ====================

export interface TrustMDState {
    auth: AuthState;
    compliance: ComplianceState;
    reports: ReportsState;
    admin: AdminState;
    ui: UIState;
    cache: CacheState;
}

// ==================== API CLIENT TYPES ====================

export interface HTTPClientConfig {
    baseURL?: string;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
}

export interface RequestInterceptor {
    (request: any): any | Promise<any>;
}

export interface ResponseInterceptor {
    (response: any): any | Promise<any>;
}

export interface RequestConfig {
    headers?: Record<string, string>;
    skipAuth?: boolean;
    cache?: boolean;
    [key: string]: any;
}

// ==================== SERVICE TYPES ====================

export interface ServiceConfig {
    apiClient: any;
    cacheTimeout?: number;
}

export interface FilterOptions {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    search?: string;
    [key: string]: any;
}

// ==================== EVENT TYPES ====================

export interface TrustMDEvent<T = any> {
    type: string;
    data: T;
    timestamp: string;
}

export interface AuthEvents {
    'auth:login': { user: User; tenant?: Tenant };
    'auth:logout': {};
    'auth:session-expired': { error: any };
    'auth:user-updated': { user: User };
    'auth:token-refreshed': { tokens: AuthTokens };
}

export interface StateEvents {
    'state:auth-changed': AuthState;
    'state:ui-changed': UIState;
}

export interface APIEvents {
    'initialized': { config: TrustMDConfig };
    'error': ErrorResponse;
    'notification': Notification;
    'reset': {};
    'destroyed': {};
}

export type TrustMDEvents = AuthEvents & StateEvents & APIEvents;

// ==================== UTILITY TYPES ====================

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ==================== CLASS TYPE DEFINITIONS ====================

export declare class TrustMDHttpClient {
    constructor(config?: HTTPClientConfig);
    
    // Authentication
    setAuthTokens(accessToken: string, refreshToken?: string): void;
    setTenantId(tenantId: string): void;
    clearAuth(): void;
    isAuthenticated(): boolean;
    
    // HTTP methods
    get<T = any>(path: string, options?: RequestConfig): Promise<APIResponse<T>>;
    post<T = any>(path: string, data?: any, options?: RequestConfig): Promise<APIResponse<T>>;
    put<T = any>(path: string, data?: any, options?: RequestConfig): Promise<APIResponse<T>>;
    patch<T = any>(path: string, data?: any, options?: RequestConfig): Promise<APIResponse<T>>;
    delete<T = any>(path: string, options?: RequestConfig): Promise<APIResponse<T>>;
    
    // File operations
    upload(path: string, file: File, metadata?: Record<string, any>): Promise<APIResponse<any>>;
    download(path: string, filename?: string, options?: RequestConfig): Promise<void>;
    
    // Interceptors
    addRequestInterceptor(interceptor: RequestInterceptor): void;
    addResponseInterceptor(interceptor: ResponseInterceptor): void;
    
    // Events
    addEventListener(event: string, listener: (data: any) => void): void;
}

export declare class TrustMDAPIClient {
    constructor(config?: TrustMDConfig);
    
    // Authentication
    login(credentials: LoginCredentials): Promise<APIResponse<{ user: User; tokens: AuthTokens }>>;
    register(userData: RegisterData): Promise<APIResponse<{ user: User }>>;
    logout(): Promise<void>;
    getCurrentUser(): Promise<APIResponse<User>>;
    
    // Compliance
    getComplianceTemplates(filters?: FilterOptions): Promise<APIResponse<ComplianceTemplate[]>>;
    getComplianceTemplate(templateId: string): Promise<APIResponse<ComplianceTemplate>>;
    generateComplianceReport(templateId: string, parameters?: any): Promise<APIResponse<ReportJob>>;
    
    // Admin
    getUsers(filters?: FilterOptions): Promise<PaginatedResponse<AdminUser>>;
    createUser(userData: any): Promise<APIResponse<AdminUser>>;
    getTenants(filters?: FilterOptions): Promise<PaginatedResponse<Tenant>>;
    
    // Events
    addEventListener(event: string, listener: (data: any) => void): void;
}

export declare class AuthService {
    constructor(apiClient: TrustMDAPIClient);
    
    login(credentials: LoginCredentials): Promise<APIResponse<{ user: User; tokens: AuthTokens }>>;
    register(userData: RegisterData): Promise<APIResponse<{ user: User }>>;
    logout(): Promise<void>;
    isAuthenticated(): boolean;
    getCurrentUser(): User | null;
    hasPermission(permission: string): boolean;
    hasRole(role: string): boolean;
    isAdmin(): boolean;
    
    addEventListener(event: string, listener: (data: any) => void): void;
}

export declare class StateManager {
    constructor(config?: { persistence?: Storage; debug?: boolean });
    
    getState(path?: string): any;
    setState(path: string, value: any, action?: string): void;
    updateState(path: string, updates: any, action?: string): void;
    addListener(path: string, callback: (value: any, prevValue: any, action: any) => void): () => void;
    resetState(path?: string): void;
}

export declare class TrustMDAPI {
    constructor(config?: TrustMDConfig);
    
    // Initialization
    initialize(): Promise<void>;
    isInitialized(): boolean;
    
    // Authentication
    login(credentials: LoginCredentials): Promise<void>;
    logout(): Promise<void>;
    register(userData: RegisterData): Promise<APIResponse<{ user: User }>>;
    isAuthenticated(): boolean;
    getCurrentUser(): User | null;
    hasPermission(permission: string): boolean;
    hasRole(role: string): boolean;
    isAdmin(): boolean;
    
    // State management
    getState(path?: string): any;
    setState(path: string, value: any, action?: string): void;
    addStateListener(path: string, callback: (value: any) => void): () => void;
    
    // Services
    readonly compliance: ComplianceService;
    readonly reports: ReportsService;
    readonly admin: AdminService;
    
    // Utilities
    healthCheck(): Promise<any>;
    getStatus(): any;
    reset(): void;
    destroy(): void;
    
    // Events
    addEventListener<K extends keyof TrustMDEvents>(event: K, listener: (data: TrustMDEvents[K]) => void): void;
}

// ==================== SERVICE CLASS DEFINITIONS ====================

export declare class ComplianceService {
    constructor(apiClient: TrustMDAPIClient);
    
    getTemplates(filters?: FilterOptions): Promise<APIResponse<ComplianceTemplate[]>>;
    getTemplate(templateId: string): Promise<APIResponse<ComplianceTemplate>>;
    generateReport(templateId: string, parameters?: any): Promise<APIResponse<ReportJob>>;
    getReport(templateId: string, reportId: string): Promise<APIResponse<ComplianceReport>>;
    getComplianceScore(entityId: string, entityType?: string): Promise<APIResponse<number>>;
}

export declare class ReportsService {
    constructor(apiClient: TrustMDAPIClient);
    
    generateComplianceReport(templateId: string, parameters?: any): Promise<APIResponse<ReportJob>>;
    generateMultiStateReport(parameters: any): Promise<APIResponse<ReportJob>>;
    getReport(reportId: string, format?: string): Promise<APIResponse<any>>;
    downloadReport(reportId: string, filename?: string, format?: string): Promise<void>;
    scheduleReport(scheduleData: any): Promise<APIResponse<ScheduledReport>>;
}

export declare class AdminService {
    constructor(apiClient: TrustMDAPIClient);
    
    getUsers(filters?: FilterOptions): Promise<PaginatedResponse<AdminUser>>;
    getUser(userId: string): Promise<APIResponse<AdminUser>>;
    createUser(userData: any): Promise<APIResponse<AdminUser>>;
    updateUser(userId: string, userData: any): Promise<APIResponse<AdminUser>>;
    deleteUser(userId: string): Promise<void>;
    
    getTenants(filters?: FilterOptions): Promise<PaginatedResponse<Tenant>>;
    getTenant(tenantId: string): Promise<APIResponse<Tenant>>;
    createTenant(tenantData: any): Promise<APIResponse<Tenant>>;
    updateTenant(tenantId: string, tenantData: any): Promise<APIResponse<Tenant>>;
    deleteTenant(tenantId: string): Promise<void>;
    
    getRoles(filters?: FilterOptions): Promise<PaginatedResponse<Role>>;
    getRole(roleId: string): Promise<APIResponse<Role>>;
    createRole(roleData: any): Promise<APIResponse<Role>>;
    updateRole(roleId: string, roleData: any): Promise<APIResponse<Role>>;
    deleteRole(roleId: string): Promise<void>;
}

// ==================== FACTORY FUNCTIONS ====================

export declare function createTrustMDAPI(config?: TrustMDConfig): TrustMDAPI;
export declare function getTrustMDAPI(): TrustMDAPI | null;

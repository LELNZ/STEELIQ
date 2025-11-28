import { payrollPeriods, payrollProviderConfig, payrollSyncLog, teamMembers, timesheets } from '@shared/schema';

export type PayrollProvider = 'quickbooks' | 'xero' | 'adp';

export type SyncStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial' | 'cancelled';

export type AuthType = 'oauth2' | 'apiKey' | 'basic' | 'sftp';

export interface ProviderCredentials {
  authType: AuthType;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  apiKey?: string;
  username?: string;
  password?: string;
  sftpHost?: string;
  sftpPort?: number;
  sftpPath?: string;
  currency?: string;
}

export interface QuickBooksCredentials extends ProviderCredentials {
  authType: 'oauth2';
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  realmId: string;
  accessToken?: string;
  tokenExpiry?: Date;
  tokenExpiresAt?: Date;
}

export interface XeroCredentials extends ProviderCredentials {
  authType: 'oauth2';
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tenantId: string;
  accessToken?: string;
  tokenExpiry?: Date;
  tokenExpiresAt?: Date;
  region?: 'AU' | 'UK' | 'NZ'; // Xero Payroll has regional APIs
}

export interface ADPCredentials extends ProviderCredentials {
  authType: 'sftp' | 'oauth2';
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  tokenExpiry?: Date;
  tokenExpiresAt?: Date;
  sslCertificate?: string;
  sslPrivateKey?: string;
  mode: 'api' | 'sftp';
  sftpHost?: string;
  sftpPort?: number;
  sftpUsername?: string;
  sftpPassword?: string;
  sftpDirectory?: string;
  companyCode?: string;
  payrollGroupCode?: string;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: 'none' | 'date' | 'date_iso' | 'currency' | 'hours' | 'boolean' | 'floor' | 'ceil' | 'round' | 'custom';
  customTransform?: string;
  required: boolean;
  defaultValue?: any;
}

export interface PayrollEmployee {
  employeeId: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  department?: string;
  payRate: number;
  payType: 'hourly' | 'salary';
}

export interface PayrollTimeEntry {
  employeeId: string;
  date: Date;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  ptoHours: number;
  sickHours: number;
  holidayHours: number;
  totalHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
  costCenter?: string;
  jobCode?: string;
  notes?: string;
}

export interface PayrollExportPayload {
  periodId: number;
  periodStart: Date;
  periodEnd: Date;
  employees: PayrollEmployee[];
  timeEntries: PayrollTimeEntry[];
  summary: {
    totalEmployees: number;
    totalHours: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalGrossPay: number;
  };
  metadata: {
    exportedBy: number;
    exportedAt: Date;
    idempotencyKey: string;
    hashChain?: string;
  };
}

export interface ProviderResponse {
  success: boolean;
  statusCode?: number;
  transactionId?: string;
  responseCode?: string;
  message?: string;
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
  data?: any;
  rateLimitRemaining?: number;
  retryAfter?: number;
}

export interface SyncResult {
  status: SyncStatus;
  recordCount: number;
  successCount: number;
  errorCount: number;
  providerTransactionId?: string;
  providerResponseCode?: string;
  providerReference?: string;
  errors?: Array<{
    code: string;
    message: string;
    employeeId?: string;
    field?: string;
    recoverable?: boolean;
  }>;
  duration?: number;
  retryable?: boolean;
}

export interface AdapterConfig {
  providerId: PayrollProvider;
  apiUrl: string;
  credentials: ProviderCredentials;
  fieldMappings: FieldMapping[];
  testMode: boolean;
  timeout: number;
  maxRetries: number;
}

export interface PayrollAdapter {
  readonly providerId: PayrollProvider;
  readonly displayName: string;
  
  initialize(config: AdapterConfig): Promise<void>;
  
  validateCredentials(): Promise<boolean>;
  
  refreshToken?(): Promise<ProviderCredentials>;
  
  preparePayload(data: PayrollExportPayload): Promise<any>;
  
  transmit(payload: any): Promise<ProviderResponse>;
  
  parseResponse(response: any): SyncResult;
  
  getEmployees?(): Promise<PayrollEmployee[]>;
  
  validateMapping(mappings: FieldMapping[]): Promise<{ valid: boolean; errors: string[] }>;
  
  testConnection(): Promise<{ connected: boolean; message: string }>;
}

export interface WebhookPayload {
  providerId: PayrollProvider;
  eventType: string;
  eventId: string;
  signature: string;
  timestamp: Date;
  data: any;
}

export interface WebhookHandler {
  validateSignature(payload: WebhookPayload, secret: string): boolean;
  processEvent(payload: WebhookPayload): Promise<void>;
}

export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type PayrollProviderConfigType = typeof payrollProviderConfig.$inferSelect;
export type PayrollSyncLogType = typeof payrollSyncLog.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type Timesheet = typeof timesheets.$inferSelect;

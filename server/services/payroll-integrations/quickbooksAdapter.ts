import { BasePayrollAdapter } from './baseAdapter';
import {
  PayrollProvider,
  PayrollExportPayload,
  ProviderResponse,
  SyncResult,
  QuickBooksCredentials,
  FieldMapping,
  PayrollEmployee
} from './types';

const QBO_SANDBOX_API = 'https://sandbox-quickbooks.api.intuit.com';
const QBO_PRODUCTION_API = 'https://quickbooks.api.intuit.com';
const QBO_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QBO_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QBO_MINOR_VERSION = '65';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}

interface QBOEmployee {
  Id: string;
  GivenName: string;
  FamilyName: string;
  DisplayName: string;
  PrimaryEmailAddr?: { Address: string };
  Active: boolean;
  BillRate?: number;
}

interface QBOTimeActivity {
  Id?: string;
  TxnDate: string;
  EmployeeRef: { value: string; name?: string };
  Hours: number;
  Minutes: number;
  HourlyRate?: { value: number; CurrencyRef?: { value: string } };
  Description?: string;
  BillableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled';
  Taxable?: boolean;
  CustomerRef?: { value: string; name?: string };
  ItemRef?: { value: string; name?: string };
  ClassRef?: { value: string; name?: string };
}

export class QuickBooksAdapter extends BasePayrollAdapter {
  readonly providerId: PayrollProvider = 'quickbooks';
  readonly displayName = 'QuickBooks Online';

  private accessToken: string | null = null;
  private accessTokenExpiry: Date | null = null;
  private realmId: string | null = null;

  protected override async validateConfig(): Promise<void> {
    await super.validateConfig();
    
    const creds = this.config!.credentials as QuickBooksCredentials;
    
    if (!creds.clientId) {
      throw new Error('QuickBooks Client ID is required');
    }
    if (!creds.clientSecret) {
      throw new Error('QuickBooks Client Secret is required');
    }

    if (creds.realmId) {
      this.realmId = creds.realmId;
    }
    
    if (creds.accessToken && creds.tokenExpiry) {
      const expiry = new Date(creds.tokenExpiry);
      if (expiry > new Date()) {
        this.accessToken = creds.accessToken;
        this.accessTokenExpiry = expiry;
      }
    }
  }

  isReadyForSync(): boolean {
    const creds = this.config?.credentials as QuickBooksCredentials;
    return !!(creds?.refreshToken && creds?.realmId);
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const creds = this.config?.credentials as QuickBooksCredentials;
    const scopes = ['com.intuit.quickbooks.accounting'];
    
    const params = new URLSearchParams({
      client_id: creds.clientId,
      response_type: 'code',
      scope: scopes.join(' '),
      redirect_uri: redirectUri,
      state: state
    });

    return `${QBO_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string, realmIdFromCallback: string): Promise<{
    accessToken: string;
    refreshToken: string;
    realmId: string;
    expiresIn: number;
    tokenExpiry: Date;
  }> {
    this.ensureInitialized();
    const creds = this.config!.credentials as QuickBooksCredentials;
    const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');

    console.log('[QuickBooks] Exchanging authorization code for tokens...');

    const response = await fetch(QBO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }).toString()
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[QuickBooks] Token exchange failed:', error);
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const tokens: TokenResponse = await response.json();
    
    this.accessToken = tokens.access_token;
    this.accessTokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);
    this.realmId = realmIdFromCallback;

    const configCreds = this.config!.credentials as QuickBooksCredentials;
    configCreds.accessToken = tokens.access_token;
    configCreds.refreshToken = tokens.refresh_token;
    configCreds.tokenExpiry = this.accessTokenExpiry;
    configCreds.tokenExpiresAt = this.accessTokenExpiry;
    configCreds.realmId = realmIdFromCallback;

    console.log('[QuickBooks] OAuth tokens stored successfully');

    if (this.tokenRefreshCallback) {
      await this.tokenRefreshCallback(this.getUpdatedCredentials());
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      realmId: realmIdFromCallback,
      expiresIn: tokens.expires_in,
      tokenExpiry: this.accessTokenExpiry
    };
  }

  getUpdatedCredentials(): QuickBooksCredentials {
    return this.config?.credentials as QuickBooksCredentials;
  }

  async refreshToken(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenExpiry: Date;
  }> {
    this.ensureInitialized();
    const creds = this.config!.credentials as QuickBooksCredentials;

    if (!creds.refreshToken) {
      throw new Error('QuickBooks Refresh Token is required - complete OAuth flow first');
    }

    const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');

    console.log('[QuickBooks] Refreshing access token...');

    const response = await fetch(QBO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: creds.refreshToken
      }).toString()
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[QuickBooks] Token refresh failed:', error);
      throw new Error(`Token refresh failed: ${response.status} - Re-authenticate with QuickBooks`);
    }

    const tokens: TokenResponse = await response.json();
    
    this.accessToken = tokens.access_token;
    this.accessTokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    const updatedCreds = this.config!.credentials as QuickBooksCredentials;
    updatedCreds.accessToken = tokens.access_token;
    updatedCreds.tokenExpiry = this.accessTokenExpiry;
    updatedCreds.tokenExpiresAt = this.accessTokenExpiry;
    
    if (tokens.refresh_token && tokens.refresh_token !== creds.refreshToken) {
      updatedCreds.refreshToken = tokens.refresh_token;
      console.log('[QuickBooks] New refresh token issued and stored');
    }

    console.log('[QuickBooks] Token refreshed successfully');

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      tokenExpiry: this.accessTokenExpiry
    };
  }

  private tokenRefreshCallback: ((credentials: QuickBooksCredentials) => Promise<void>) | null = null;

  setTokenRefreshCallback(callback: (credentials: QuickBooksCredentials) => Promise<void>): void {
    this.tokenRefreshCallback = callback;
  }

  private async ensureValidToken(): Promise<string> {
    if (!this.accessToken || !this.accessTokenExpiry) {
      const tokens = await this.refreshToken();
      if (this.tokenRefreshCallback) {
        await this.tokenRefreshCallback(this.getUpdatedCredentials());
      }
      return tokens.accessToken;
    }

    const bufferTime = 5 * 60 * 1000;
    if (this.accessTokenExpiry.getTime() - Date.now() < bufferTime) {
      const tokens = await this.refreshToken();
      if (this.tokenRefreshCallback) {
        await this.tokenRefreshCallback(this.getUpdatedCredentials());
      }
      return tokens.accessToken;
    }

    return this.accessToken;
  }

  private getApiBaseUrl(): string {
    return this.config?.testMode ? QBO_SANDBOX_API : QBO_PRODUCTION_API;
  }

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const token = await this.ensureValidToken();
      const baseUrl = this.getApiBaseUrl();
      
      const response = await fetch(
        `${baseUrl}/v3/company/${this.realmId}/companyinfo/${this.realmId}?minorversion=${QBO_MINOR_VERSION}`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const companyName = data.CompanyInfo?.CompanyName || 'Unknown Company';
        return { 
          connected: true, 
          message: `Connected to QuickBooks company: ${companyName}` 
        };
      }

      return { 
        connected: false, 
        message: `Connection failed: ${response.status} ${response.statusText}` 
      };
    } catch (error) {
      return { 
        connected: false, 
        message: `Connection error: ${(error as Error).message}` 
      };
    }
  }

  async getEmployees(): Promise<PayrollEmployee[]> {
    this.ensureInitialized();
    const token = await this.ensureValidToken();
    const baseUrl = this.getApiBaseUrl();

    const query = encodeURIComponent("SELECT * FROM Employee WHERE Active = true");
    const response = await fetch(
      `${baseUrl}/v3/company/${this.realmId}/query?query=${query}&minorversion=${QBO_MINOR_VERSION}`,
      {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch employees: ${response.status}`);
    }

    const data = await response.json();
    const employees: QBOEmployee[] = data.QueryResponse?.Employee || [];

    return employees.map(emp => ({
      employeeId: emp.Id,
      firstName: emp.GivenName,
      lastName: emp.FamilyName,
      email: emp.PrimaryEmailAddr?.Address,
      payRate: emp.BillRate || 0,
      payType: 'hourly' as const
    }));
  }

  async preparePayload(data: PayrollExportPayload): Promise<QBOTimeActivity[]> {
    this.ensureInitialized();

    const timeActivities: QBOTimeActivity[] = [];

    for (const entry of data.timeEntries) {
      const employee = data.employees.find(e => e.employeeId === entry.employeeId);
      
      const totalHours = entry.regularHours + entry.overtimeHours + 
                        (entry.doubleTimeHours || 0) + (entry.ptoHours || 0) +
                        (entry.sickHours || 0) + (entry.holidayHours || 0);

      const hours = Math.floor(totalHours);
      const minutes = Math.round((totalHours - hours) * 60);

      const activity: QBOTimeActivity = {
        TxnDate: this.formatDate(entry.date),
        EmployeeRef: {
          value: entry.employeeId,
          name: employee ? `${employee.firstName} ${employee.lastName}` : undefined
        },
        Hours: hours,
        Minutes: minutes,
        Description: `Week ending ${this.formatDate(data.periodEnd)} - Regular: ${entry.regularHours}h, OT: ${entry.overtimeHours}h`,
        BillableStatus: 'NotBillable'
      };

      if (employee?.payRate) {
        const currency = this.config?.credentials?.currency || 'NZD';
        activity.HourlyRate = {
          value: employee.payRate,
          CurrencyRef: { value: currency }
        };
      }

      if (entry.jobCode) {
        activity.ClassRef = {
          value: entry.jobCode
        };
      }

      timeActivities.push(activity);
    }

    console.log(`[QuickBooks] Prepared ${timeActivities.length} time activities for sync`);
    return timeActivities;
  }

  async transmit(payload: QBOTimeActivity[]): Promise<ProviderResponse> {
    this.ensureInitialized();
    const token = await this.ensureValidToken();
    const baseUrl = this.getApiBaseUrl();

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const activity of payload) {
      try {
        const response = await fetch(
          `${baseUrl}/v3/company/${this.realmId}/timeactivity?minorversion=${QBO_MINOR_VERSION}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(activity)
          }
        );

        const data = await response.json();

        if (response.ok) {
          results.push({
            id: data.TimeActivity?.Id || 'unknown',
            success: true
          });
        } else {
          const errorMsg = data.Fault?.Error?.[0]?.Message || 
                          data.Fault?.Error?.[0]?.Detail || 
                          'Unknown error';
          results.push({
            id: activity.EmployeeRef.value,
            success: false,
            error: errorMsg
          });
        }
      } catch (error) {
        results.push({
          id: activity.EmployeeRef.value,
          success: false,
          error: (error as Error).message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[QuickBooks] Sync completed: ${successCount} success, ${failureCount} failures`);

    return {
      success: failureCount === 0,
      statusCode: failureCount === 0 ? 200 : 207,
      message: `Synced ${successCount}/${payload.length} time activities`,
      data: {
        results,
        successCount,
        failureCount,
        totalCount: payload.length
      }
    };
  }

  parseResponse(response: ProviderResponse): SyncResult {
    const data = response.data as {
      results: Array<{ id: string; success: boolean; error?: string }>;
      successCount: number;
      failureCount: number;
      totalCount: number;
    };

    const errors = data.results
      .filter(r => !r.success)
      .map(r => ({
        code: 'QBO_SYNC_ERROR',
        message: r.error || 'Unknown error',
        field: r.id,
        recoverable: true
      }));

    return {
      status: data.failureCount === 0 ? 'completed' : 
              data.successCount > 0 ? 'partial' : 'failed',
      recordCount: data.totalCount,
      successCount: data.successCount,
      errorCount: data.failureCount,
      errors: errors.length > 0 ? errors : undefined,
      providerReference: data.results
        .filter(r => r.success)
        .map(r => r.id)
        .join(',')
    };
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  override async validateMapping(mappings: FieldMapping[]): Promise<{ valid: boolean; errors: string[] }> {
    const baseResult = await super.validateMapping(mappings);
    const errors = [...baseResult.errors];

    const qboRequiredFields = ['EmployeeRef', 'TxnDate', 'Hours'];
    for (const required of qboRequiredFields) {
      const hasMapping = mappings.some(m => m.targetField === required);
      if (!hasMapping) {
        errors.push(`QuickBooks required field '${required}' is not mapped`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  getDefaultFieldMappings(): FieldMapping[] {
    return [
      {
        sourceField: 'employeeId',
        targetField: 'EmployeeRef.value',
        transform: 'none',
        required: true
      },
      {
        sourceField: 'date',
        targetField: 'TxnDate',
        transform: 'date_iso',
        required: true
      },
      {
        sourceField: 'regularHours',
        targetField: 'Hours',
        transform: 'floor',
        required: true
      },
      {
        sourceField: 'overtimeHours',
        targetField: 'OvertimeHours',
        transform: 'floor',
        required: false
      },
      {
        sourceField: 'totalPay',
        targetField: 'HourlyRate.value',
        transform: 'none',
        required: false
      },
      {
        sourceField: 'jobCode',
        targetField: 'ClassRef.value',
        transform: 'none',
        required: false
      }
    ];
  }
}

export const quickbooksAdapter = new QuickBooksAdapter();

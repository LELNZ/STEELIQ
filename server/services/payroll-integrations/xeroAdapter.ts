import { BasePayrollAdapter } from './baseAdapter';
import {
  PayrollProvider,
  PayrollExportPayload,
  ProviderResponse,
  SyncResult,
  XeroCredentials,
  FieldMapping,
  PayrollEmployee
} from './types';

const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const XERO_API_BASE = 'https://api.xero.com';
const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface XeroTenant {
  id: string;
  authEventId: string;
  tenantId: string;
  tenantType: string;
  tenantName?: string;
  createdDateUtc: string;
  updatedDateUtc: string;
}

interface XeroEmployee {
  EmployeeID: string;
  FirstName: string;
  LastName: string;
  Email?: string;
  Status: 'ACTIVE' | 'TERMINATED';
  PayrollCalendarID?: string;
  OrdinaryEarningsRateID?: string;
}

interface XeroTimesheetLine {
  EarningsRateID: string;
  TrackingItemID?: string;
  NumberOfUnits: number[];
}

interface XeroTimesheet {
  EmployeeID: string;
  StartDate: string;
  EndDate: string;
  Status?: 'DRAFT' | 'PROCESSED' | 'APPROVED' | 'REQUESTED';
  TimesheetLines: XeroTimesheetLine[];
}

export class XeroAdapter extends BasePayrollAdapter {
  readonly providerId: PayrollProvider = 'xero';
  readonly displayName = 'Xero Payroll';

  private accessToken: string | null = null;
  private accessTokenExpiry: Date | null = null;
  private tenantId: string | null = null;
  private region: 'AU' | 'UK' | 'NZ' = 'NZ';

  protected override async validateConfig(): Promise<void> {
    await super.validateConfig();
    
    const creds = this.config!.credentials as XeroCredentials;
    
    if (!creds.clientId) {
      throw new Error('Xero Client ID is required');
    }
    if (!creds.clientSecret) {
      throw new Error('Xero Client Secret is required');
    }

    if (creds.tenantId) {
      this.tenantId = creds.tenantId;
    }

    if (creds.region) {
      this.region = creds.region;
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
    const creds = this.config?.credentials as XeroCredentials;
    return !!(creds?.refreshToken && creds?.tenantId);
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const creds = this.config?.credentials as XeroCredentials;
    const scopes = [
      'openid',
      'profile',
      'email',
      'payroll.employees',
      'payroll.employees.read',
      'payroll.payruns',
      'payroll.payruns.read',
      'payroll.timesheets',
      'payroll.timesheets.read',
      'payroll.settings',
      'payroll.settings.read'
    ];
    
    const params = new URLSearchParams({
      client_id: creds.clientId,
      response_type: 'code',
      scope: scopes.join(' '),
      redirect_uri: redirectUri,
      state: state
    });

    return `${XERO_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenExpiry: Date;
    tenants: XeroTenant[];
  }> {
    this.ensureInitialized();
    const creds = this.config!.credentials as XeroCredentials;
    const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');

    console.log('[Xero] Exchanging authorization code for tokens...');

    const response = await fetch(XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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
      console.error('[Xero] Token exchange failed:', error);
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const tokens: TokenResponse = await response.json();
    
    this.accessToken = tokens.access_token;
    this.accessTokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    const tenants = await this.getConnectedTenants(tokens.access_token);
    
    if (tenants.length > 0) {
      this.tenantId = tenants[0].tenantId;
      
      const detectedRegion = await this.detectTenantRegionInternal(tokens.access_token, this.tenantId);
      if (detectedRegion) {
        this.region = detectedRegion;
        console.log(`[Xero] Auto-detected region: ${detectedRegion}`);
      }
    }

    const configCreds = this.config!.credentials as XeroCredentials;
    configCreds.accessToken = tokens.access_token;
    configCreds.refreshToken = tokens.refresh_token;
    configCreds.tokenExpiry = this.accessTokenExpiry;
    configCreds.tokenExpiresAt = this.accessTokenExpiry;
    if (this.tenantId) {
      configCreds.tenantId = this.tenantId;
    }
    configCreds.region = this.region;

    console.log('[Xero] OAuth tokens stored successfully');

    if (this.tokenRefreshCallback) {
      await this.tokenRefreshCallback(this.getUpdatedCredentials());
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      tokenExpiry: this.accessTokenExpiry,
      tenants
    };
  }

  private async detectTenantRegionInternal(accessToken: string, tenantId: string): Promise<'AU' | 'UK' | 'NZ' | undefined> {
    try {
      const response = await fetch(`${XERO_API_BASE}/api.xro/2.0/Organisation`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Xero-Tenant-Id': tenantId
        }
      });

      if (response.ok) {
        const data = await response.json();
        const countryCode = data.Organisations?.[0]?.CountryCode;
        
        switch (countryCode) {
          case 'AU':
            return 'AU';
          case 'GB':
          case 'UK':
            return 'UK';
          case 'NZ':
            return 'NZ';
          default:
            console.log(`[Xero] Unknown country code: ${countryCode}, defaulting to NZ`);
            return 'NZ';
        }
      }
    } catch (error) {
      console.error('[Xero] Failed to detect tenant region:', error);
    }
    return undefined;
  }

  private async getConnectedTenants(accessToken: string): Promise<XeroTenant[]> {
    const response = await fetch(XERO_CONNECTIONS_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('[Xero] Failed to fetch connected tenants');
      return [];
    }

    return await response.json();
  }

  async setTenant(tenantId: string, region?: 'AU' | 'UK' | 'NZ'): Promise<void> {
    this.tenantId = tenantId;
    
    if (region) {
      this.region = region;
    } else {
      const detectedRegion = await this.detectTenantRegion(tenantId);
      if (detectedRegion) {
        this.region = detectedRegion;
        console.log(`[Xero] Auto-detected region for tenant ${tenantId}: ${detectedRegion}`);
      }
    }
    
    const creds = this.config?.credentials as XeroCredentials;
    if (creds) {
      creds.tenantId = tenantId;
      creds.region = this.region;
    }
    
    if (this.tokenRefreshCallback) {
      await this.tokenRefreshCallback(this.getUpdatedCredentials());
    }
    
    console.log(`[Xero] Tenant set: ${tenantId}, Region: ${this.region}`);
  }

  async detectTenantRegion(tenantId: string): Promise<'AU' | 'UK' | 'NZ' | undefined> {
    try {
      this.ensureInitialized();
      const token = await this.ensureValidToken();
      
      const response = await fetch(`${XERO_API_BASE}/api.xro/2.0/Organisation`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Xero-Tenant-Id': tenantId
        }
      });

      if (response.ok) {
        const data = await response.json();
        const countryCode = data.Organisations?.[0]?.CountryCode;
        
        switch (countryCode) {
          case 'AU':
            return 'AU';
          case 'GB':
          case 'UK':
            return 'UK';
          case 'NZ':
            return 'NZ';
          default:
            console.log(`[Xero] Unknown country code: ${countryCode}, defaulting to NZ`);
            return 'NZ';
        }
      }
    } catch (error) {
      console.error('[Xero] Failed to detect tenant region:', error);
    }
    return undefined;
  }

  getUpdatedCredentials(): XeroCredentials {
    return this.config?.credentials as XeroCredentials;
  }

  async refreshToken(): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenExpiry: Date;
  }> {
    this.ensureInitialized();
    const creds = this.config!.credentials as XeroCredentials;

    if (!creds.refreshToken) {
      throw new Error('Xero Refresh Token is required - complete OAuth flow first');
    }

    const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');

    console.log('[Xero] Refreshing access token...');

    const response = await fetch(XERO_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: creds.refreshToken
      }).toString()
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Xero] Token refresh failed:', error);
      throw new Error(`Token refresh failed: ${response.status} - Re-authenticate with Xero`);
    }

    const tokens: TokenResponse = await response.json();
    
    this.accessToken = tokens.access_token;
    this.accessTokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    const updatedCreds = this.config!.credentials as XeroCredentials;
    updatedCreds.accessToken = tokens.access_token;
    updatedCreds.tokenExpiry = this.accessTokenExpiry;
    updatedCreds.tokenExpiresAt = this.accessTokenExpiry;
    
    if (tokens.refresh_token && tokens.refresh_token !== creds.refreshToken) {
      updatedCreds.refreshToken = tokens.refresh_token;
      console.log('[Xero] New refresh token issued and stored');
    }

    console.log('[Xero] Token refreshed successfully');

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      tokenExpiry: this.accessTokenExpiry
    };
  }

  private tokenRefreshCallback: ((credentials: XeroCredentials) => Promise<void>) | null = null;

  setTokenRefreshCallback(callback: (credentials: XeroCredentials) => Promise<void>): void {
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

  private getPayrollApiUrl(): string {
    switch (this.region) {
      case 'AU':
        return `${XERO_API_BASE}/payroll.xro/1.0`;
      case 'UK':
        return `${XERO_API_BASE}/payroll.xro/2.0`;
      case 'NZ':
      default:
        return `${XERO_API_BASE}/payroll.xro/1.0`;
    }
  }

  private isUKPayroll(): boolean {
    return this.region === 'UK';
  }

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const token = await this.ensureValidToken();
      
      const response = await fetch(XERO_CONNECTIONS_URL, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const tenants: XeroTenant[] = await response.json();
        const tenant = tenants.find(t => t.tenantId === this.tenantId);
        const tenantName = tenant?.tenantName || 'Unknown Organization';
        return { 
          connected: true, 
          message: `Connected to Xero organization: ${tenantName}` 
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
    const baseUrl = this.getPayrollApiUrl();

    const response = await fetch(`${baseUrl}/Employees`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Xero-Tenant-Id': this.tenantId!
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch employees: ${response.status}`);
    }

    const data = await response.json();
    const employees: XeroEmployee[] = data.Employees || [];

    return employees
      .filter(emp => emp.Status === 'ACTIVE')
      .map(emp => ({
        employeeId: emp.EmployeeID,
        firstName: emp.FirstName,
        lastName: emp.LastName,
        email: emp.Email,
        payRate: 0,
        payType: 'hourly' as const
      }));
  }

  async getPayItems(): Promise<Array<{ id: string; name: string; type: string }>> {
    this.ensureInitialized();
    const token = await this.ensureValidToken();
    const baseUrl = this.getPayrollApiUrl();

    const response = await fetch(`${baseUrl}/PayItems`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Xero-Tenant-Id': this.tenantId!
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pay items: ${response.status}`);
    }

    const data = await response.json();
    const payItems = data.PayItems || {};
    
    const earningsRates = (payItems.EarningsRates || []).map((rate: any) => ({
      id: rate.EarningsRateID,
      name: rate.Name,
      type: 'earnings'
    }));

    return earningsRates;
  }

  async preparePayload(data: PayrollExportPayload): Promise<XeroTimesheet[]> {
    this.ensureInitialized();

    const payItems = await this.getPayItems();
    
    const findEarningsRate = (keywords: string[]): { id: string; name: string; type: string } | undefined => {
      return payItems.find(p => 
        keywords.some(kw => p.name.toLowerCase().includes(kw.toLowerCase()))
      );
    };

    const ordinaryRate = findEarningsRate(['ordinary', 'regular', 'normal']);
    const overtimeRate = findEarningsRate(['overtime', 'ot', 'time and a half']);
    const doubleTimeRate = findEarningsRate(['double time', 'dt', 'penalty']);
    const leaveRate = findEarningsRate(['leave', 'pto', 'annual', 'sick', 'holiday']);

    if (!ordinaryRate) {
      throw new Error('No ordinary earnings rate found in Xero. Please configure pay items in Xero Payroll settings.');
    }

    const hasOvertimeHours = data.timeEntries.some(e => e.overtimeHours > 0);
    const hasDoubleTimeHours = data.timeEntries.some(e => (e.doubleTimeHours || 0) > 0);
    const hasLeaveHours = data.timeEntries.some(e => 
      (e.ptoHours || 0) > 0 || (e.sickHours || 0) > 0 || (e.holidayHours || 0) > 0
    );

    if (hasOvertimeHours && !overtimeRate) {
      throw new Error('Overtime hours present but no overtime earnings rate configured in Xero. Please add an overtime rate in Xero Payroll settings (e.g., "Overtime", "Time and a Half").');
    }

    if (hasDoubleTimeHours && !doubleTimeRate) {
      throw new Error('Double-time hours present but no double-time earnings rate configured in Xero. Please add a double-time rate in Xero Payroll settings (e.g., "Double Time", "Penalty Rate").');
    }

    if (hasLeaveHours && !leaveRate) {
      console.log('[Xero] Warning: Leave hours present but no leave earnings rate configured. Leave hours will not be synced.');
    }

    console.log(`[Xero] Found pay items - Ordinary: ${ordinaryRate?.name}, OT: ${overtimeRate?.name || 'none'}, DT: ${doubleTimeRate?.name || 'none'}, Leave: ${leaveRate?.name || 'none'}`);

    const employeeTimesheets = new Map<string, XeroTimesheet>();

    for (const entry of data.timeEntries) {
      let timesheet = employeeTimesheets.get(entry.employeeId);
      
      if (!timesheet) {
        const timesheetLines: XeroTimesheetLine[] = [];
        
        timesheetLines.push({
          EarningsRateID: ordinaryRate.id,
          NumberOfUnits: new Array(7).fill(0)
        });
        
        if (overtimeRate) {
          timesheetLines.push({
            EarningsRateID: overtimeRate.id,
            NumberOfUnits: new Array(7).fill(0)
          });
        }
        
        if (doubleTimeRate) {
          timesheetLines.push({
            EarningsRateID: doubleTimeRate.id,
            NumberOfUnits: new Array(7).fill(0)
          });
        }
        
        if (leaveRate) {
          timesheetLines.push({
            EarningsRateID: leaveRate.id,
            NumberOfUnits: new Array(7).fill(0)
          });
        }

        timesheet = {
          EmployeeID: entry.employeeId,
          StartDate: this.formatDate(data.periodStart),
          EndDate: this.formatDate(data.periodEnd),
          Status: 'DRAFT',
          TimesheetLines: timesheetLines
        };
        employeeTimesheets.set(entry.employeeId, timesheet);
      }

      const dayOfWeek = new Date(entry.date).getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      const findLineByRate = (rateId: string): XeroTimesheetLine | undefined => {
        return timesheet!.TimesheetLines.find(line => line.EarningsRateID === rateId);
      };
      
      const ordinaryLine = findLineByRate(ordinaryRate.id);
      if (ordinaryLine && entry.regularHours > 0) {
        ordinaryLine.NumberOfUnits[dayIndex] += entry.regularHours;
      }
      
      if (overtimeRate) {
        const otLine = findLineByRate(overtimeRate.id);
        if (otLine && entry.overtimeHours > 0) {
          otLine.NumberOfUnits[dayIndex] += entry.overtimeHours;
        }
      } else if (entry.overtimeHours > 0 && ordinaryLine) {
        ordinaryLine.NumberOfUnits[dayIndex] += entry.overtimeHours;
        console.log(`[Xero] Warning: No overtime rate configured, adding ${entry.overtimeHours}h OT as ordinary hours`);
      }
      
      if (doubleTimeRate) {
        const dtLine = findLineByRate(doubleTimeRate.id);
        if (dtLine && (entry.doubleTimeHours || 0) > 0) {
          dtLine.NumberOfUnits[dayIndex] += entry.doubleTimeHours || 0;
        }
      } else if ((entry.doubleTimeHours || 0) > 0 && ordinaryLine) {
        ordinaryLine.NumberOfUnits[dayIndex] += entry.doubleTimeHours || 0;
        console.log(`[Xero] Warning: No double-time rate configured, adding ${entry.doubleTimeHours}h DT as ordinary hours`);
      }
      
      const leaveHours = (entry.ptoHours || 0) + (entry.sickHours || 0) + (entry.holidayHours || 0);
      if (leaveRate && leaveHours > 0) {
        const leaveLine = findLineByRate(leaveRate.id);
        if (leaveLine) {
          leaveLine.NumberOfUnits[dayIndex] += leaveHours;
        }
      }
    }

    const timesheets = Array.from(employeeTimesheets.values())
      .map(ts => ({
        ...ts,
        TimesheetLines: ts.TimesheetLines.filter(line => 
          line.NumberOfUnits.some(units => units > 0)
        )
      }))
      .filter(ts => ts.TimesheetLines.length > 0);

    console.log(`[Xero] Prepared ${timesheets.length} timesheets for sync`);
    return timesheets;
  }

  async transmit(payload: XeroTimesheet[]): Promise<ProviderResponse> {
    this.ensureInitialized();
    const token = await this.ensureValidToken();
    const baseUrl = this.getPayrollApiUrl();

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const timesheet of payload) {
      try {
        const response = await fetch(`${baseUrl}/Timesheets`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Xero-Tenant-Id': this.tenantId!
          },
          body: JSON.stringify({ Timesheets: [timesheet] })
        });

        const data = await response.json();

        if (response.ok) {
          const createdTimesheet = data.Timesheets?.[0];
          results.push({
            id: createdTimesheet?.TimesheetID || timesheet.EmployeeID,
            success: true
          });
        } else {
          const errorMsg = data.Message || 
                          data.Elements?.[0]?.ValidationErrors?.[0]?.Message ||
                          'Unknown error';
          results.push({
            id: timesheet.EmployeeID,
            success: false,
            error: errorMsg
          });
        }
      } catch (error) {
        results.push({
          id: timesheet.EmployeeID,
          success: false,
          error: (error as Error).message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[Xero] Sync completed: ${successCount} success, ${failureCount} failures`);

    return {
      success: failureCount === 0,
      statusCode: failureCount === 0 ? 200 : 207,
      message: `Synced ${successCount}/${payload.length} timesheets`,
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
        code: 'XERO_SYNC_ERROR',
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

    const xeroRequiredFields = ['EmployeeID', 'StartDate', 'EndDate'];
    for (const required of xeroRequiredFields) {
      const hasMapping = mappings.some(m => m.targetField === required);
      if (!hasMapping) {
        errors.push(`Xero required field '${required}' is not mapped`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  getDefaultFieldMappings(): FieldMapping[] {
    return [
      {
        sourceField: 'employeeId',
        targetField: 'EmployeeID',
        transform: 'none',
        required: true
      },
      {
        sourceField: 'periodStart',
        targetField: 'StartDate',
        transform: 'date_iso',
        required: true
      },
      {
        sourceField: 'periodEnd',
        targetField: 'EndDate',
        transform: 'date_iso',
        required: true
      },
      {
        sourceField: 'regularHours',
        targetField: 'NumberOfUnits',
        transform: 'none',
        required: true
      },
      {
        sourceField: 'overtimeHours',
        targetField: 'OvertimeUnits',
        transform: 'none',
        required: false
      }
    ];
  }
}

export const xeroAdapter = new XeroAdapter();

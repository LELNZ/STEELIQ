import { BasePayrollAdapter } from './baseAdapter';
import { 
  AdapterConfig, 
  PayrollExportPayload, 
  ProviderResponse, 
  SyncResult, 
  PayrollProvider, 
  PayrollEmployee,
  ADPCredentials 
} from './types';

const ADP_AUTH_URL = 'https://accounts.adp.com/auth/oauth/v2/token';
const ADP_API_BASE = 'https://api.adp.com';

interface ADPTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface ADPWorker {
  associateOID: string;
  workerID?: {
    idValue: string;
  };
  person: {
    legalName: {
      givenName: string;
      familyName1: string;
    };
  };
  businessCommunication?: {
    emails?: Array<{
      emailUri: string;
    }>;
  };
  workerStatus?: {
    statusCode?: {
      codeValue: string;
    };
  };
}

interface ADPTimeCard {
  associateOID: string;
  itemID?: string;
  timePeriod: {
    startDate: string;
    endDate: string;
  };
  homeOrganizationalUnit?: {
    nameCode?: {
      codeValue: string;
    };
  };
  dailyTotals: Array<{
    entryDate: string;
    timeDuration: string;
    typeCode: {
      codeValue: string;
    };
    payCode?: {
      codeValue: string;
    };
  }>;
}

export class ADPAdapter extends BasePayrollAdapter {
  readonly providerId: PayrollProvider = 'adp';
  readonly displayName = 'ADP Workforce Now';
  
  private accessToken: string | null = null;
  private accessTokenExpiry: Date | null = null;
  private tokenRefreshCallback: ((credentials: ADPCredentials) => Promise<void>) | null = null;

  setTokenRefreshCallback(callback: (credentials: ADPCredentials) => Promise<void>): void {
    this.tokenRefreshCallback = callback;
  }

  protected async validateConfig(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration is required');
    }
    if (!this.config.credentials) {
      throw new Error('Credentials are required');
    }
    
    const creds = this.config.credentials as ADPCredentials;
    
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error('ADP Client ID and Client Secret are required');
    }

    if (!creds.mode) {
      throw new Error('ADP mode (api/sftp) must be specified');
    }

    if (creds.mode === 'sftp' && (!creds.sftpHost || !creds.sftpUsername)) {
      throw new Error('SFTP host and username required for SFTP mode');
    }

    if (creds.accessToken) {
      this.accessToken = creds.accessToken;
    }
    
    if (creds.tokenExpiresAt) {
      this.accessTokenExpiry = new Date(creds.tokenExpiresAt);
    }

    console.log(`[ADP] Adapter validated in ${creds.mode.toUpperCase()} mode`);
  }

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      this.ensureInitialized();
      const creds = this.config!.credentials as ADPCredentials;

      if (creds.mode === 'api') {
        const token = await this.ensureValidToken();
        
        const response = await fetch(`${ADP_API_BASE}/hr/v2/workers?$top=1`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            'ADP-USERCONTEXT': 'organizationOID=default'
          }
        });

        if (response.ok || response.status === 200) {
          console.log('[ADP] API connection test successful');
          return {
            connected: true,
            message: 'Successfully connected to ADP Workforce Now API'
          };
        } else {
          const error = await response.text();
          throw new Error(`API test failed: ${response.status} - ${error}`);
        }
      } else {
        console.warn('[ADP] SFTP transport not yet implemented - requires ssh2-sftp-client');
        return {
          connected: false,
          message: `SFTP mode configured for ${creds.sftpHost}:${creds.sftpPort || 22} but transport not implemented. Use API mode or contact administrator to enable SFTP.`
        };
      }
    } catch (error: any) {
      console.error('[ADP] Connection test failed:', error);
      return {
        connected: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  async preparePayload(data: PayrollExportPayload): Promise<any> {
    this.ensureInitialized();
    const creds = this.config!.credentials as ADPCredentials;

    if (creds.mode === 'api') {
      return this.prepareAPIPayload(data);
    } else {
      return this.prepareCSVPayload(data);
    }
  }

  private prepareAPIPayload(data: PayrollExportPayload): { timeCards: ADPTimeCard[] } {
    const timeCardsByEmployee = new Map<string, ADPTimeCard>();

    for (const entry of data.timeEntries) {
      const externalId = (entry as any).externalEmployeeId;
      if (!externalId) {
        console.warn(`[ADP] Skipping entry - no external employee mapping for employee ${(entry as any).employeeId}`);
        continue;
      }

      let timeCard = timeCardsByEmployee.get(externalId);
      if (!timeCard) {
        timeCard = {
          associateOID: externalId,
          timePeriod: {
            startDate: data.periodStart.toISOString().split('T')[0],
            endDate: data.periodEnd.toISOString().split('T')[0]
          },
          dailyTotals: []
        };
        timeCardsByEmployee.set(externalId, timeCard);
      }

      const entryDate = entry.date instanceof Date 
        ? entry.date.toISOString().split('T')[0] 
        : String(entry.date);

      if (entry.regularHours > 0) {
        timeCard.dailyTotals.push({
          entryDate,
          timeDuration: this.hoursToISO8601Duration(entry.regularHours),
          typeCode: { codeValue: 'REG' },
          payCode: { codeValue: 'REG' }
        });
      }

      if (entry.overtimeHours > 0) {
        timeCard.dailyTotals.push({
          entryDate,
          timeDuration: this.hoursToISO8601Duration(entry.overtimeHours),
          typeCode: { codeValue: 'OT' },
          payCode: { codeValue: 'OT' }
        });
      }

      if (entry.doubleTimeHours > 0) {
        timeCard.dailyTotals.push({
          entryDate,
          timeDuration: this.hoursToISO8601Duration(entry.doubleTimeHours),
          typeCode: { codeValue: 'DT' },
          payCode: { codeValue: 'DT' }
        });
      }

      if (entry.ptoHours > 0) {
        timeCard.dailyTotals.push({
          entryDate,
          timeDuration: this.hoursToISO8601Duration(entry.ptoHours),
          typeCode: { codeValue: 'PTO' },
          payCode: { codeValue: 'VAC' }
        });
      }

      if (entry.sickHours > 0) {
        timeCard.dailyTotals.push({
          entryDate,
          timeDuration: this.hoursToISO8601Duration(entry.sickHours),
          typeCode: { codeValue: 'SICK' },
          payCode: { codeValue: 'SICK' }
        });
      }

      if (entry.holidayHours > 0) {
        timeCard.dailyTotals.push({
          entryDate,
          timeDuration: this.hoursToISO8601Duration(entry.holidayHours),
          typeCode: { codeValue: 'HOL' },
          payCode: { codeValue: 'HOL' }
        });
      }
    }

    const timeCards = Array.from(timeCardsByEmployee.values());
    console.log(`[ADP] Prepared ${timeCards.length} time cards for API submission`);
    
    return { timeCards };
  }

  private prepareCSVPayload(data: PayrollExportPayload): { csv: string; filename: string } {
    const creds = this.config!.credentials as ADPCredentials;
    const companyCode = creds.companyCode || 'STEELIQ';
    const payrollGroup = creds.payrollGroupCode || 'DEFAULT';
    
    const headers = [
      'CompanyCode',
      'EmployeeID',
      'PayrollGroupCode',
      'PayDate',
      'EarningsCode',
      'Hours',
      'Rate',
      'Amount',
      'CostCenter',
      'Department',
      'BatchID',
      'IdempotencyKey'
    ];

    const rows: string[] = [headers.join(',')];
    const batchId = `STEELIQ-${Date.now()}`;

    for (const entry of data.timeEntries) {
      const externalId = (entry as any).externalEmployeeId || (entry as any).employeeId?.toString() || '';
      const entryDate = entry.date instanceof Date 
        ? entry.date.toISOString().split('T')[0] 
        : String(entry.date);

      const addRow = (earningsCode: string, hours: number, rate?: number) => {
        if (hours <= 0) return;
        rows.push([
          this.escapeCSV(companyCode),
          this.escapeCSV(externalId),
          this.escapeCSV(payrollGroup),
          this.escapeCSV(entryDate),
          this.escapeCSV(earningsCode),
          hours.toFixed(2),
          rate ? rate.toFixed(2) : '',
          '',
          this.escapeCSV(entry.costCenter || ''),
          this.escapeCSV((entry as any).department || ''),
          this.escapeCSV(batchId),
          this.escapeCSV(data.metadata.idempotencyKey)
        ].join(','));
      };

      addRow('REG', entry.regularHours, entry.regularPay > 0 ? entry.regularPay / entry.regularHours : undefined);
      addRow('OT', entry.overtimeHours, entry.overtimePay > 0 ? entry.overtimePay / entry.overtimeHours : undefined);
      addRow('DT', entry.doubleTimeHours);
      addRow('PTO', entry.ptoHours);
      addRow('SICK', entry.sickHours);
      addRow('HOL', entry.holidayHours);
    }

    const periodStart = data.periodStart.toISOString().split('T')[0].replace(/-/g, '');
    const periodEnd = data.periodEnd.toISOString().split('T')[0].replace(/-/g, '');
    const filename = `steeliq_timesheet_${periodStart}_${periodEnd}.csv`;

    console.log(`[ADP] Prepared CSV with ${rows.length - 1} data rows`);
    
    return { 
      csv: rows.join('\n'), 
      filename 
    };
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  async transmit(payload: any): Promise<ProviderResponse> {
    this.ensureInitialized();
    const creds = this.config!.credentials as ADPCredentials;

    if (creds.mode === 'api') {
      return this.transmitViaAPI(payload);
    } else {
      return this.transmitViaSFTP(payload);
    }
  }

  private async transmitViaAPI(payload: { timeCards: ADPTimeCard[] }): Promise<ProviderResponse> {
    const token = await this.ensureValidToken();
    const creds = this.config!.credentials as ADPCredentials;
    
    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ code: string; message: string; field?: string }> = [];
    const transactionIds: string[] = [];

    for (const timeCard of payload.timeCards) {
      try {
        const response = await this.withRetry(async () => {
          const res = await fetch(`${ADP_API_BASE}/time/v2/workers/${timeCard.associateOID}/time-cards`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`,
              'ADP-USERCONTEXT': 'organizationOID=default',
              'If-Match': '*'
            },
            body: JSON.stringify({ timeCards: [timeCard] })
          });
          
          if (res.status === 202) {
            const location = res.headers.get('location');
            if (location) transactionIds.push(location);
            return { ok: true, status: 202, data: null };
          }
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.confirmMessage?.message || `HTTP ${res.status}`);
          }
          
          return { ok: true, status: res.status, data: await res.json() };
        }, 2);

        if (response.ok) {
          successCount++;
        }
      } catch (error: any) {
        failCount++;
        errors.push({
          code: 'TRANSMISSION_ERROR',
          message: error.message,
          field: `associateOID:${timeCard.associateOID}`
        });
      }
    }

    const allSuccessful = failCount === 0 && successCount > 0;
    
    return {
      success: allSuccessful,
      statusCode: allSuccessful ? 200 : (successCount > 0 ? 207 : 500),
      transactionId: transactionIds.length > 0 ? transactionIds[0] : `adp-api-${Date.now()}`,
      message: allSuccessful 
        ? `Successfully transmitted ${successCount} time cards` 
        : `Transmitted ${successCount} time cards with ${failCount} failures`,
      errors: errors.length > 0 ? errors : undefined,
      data: {
        successCount,
        failCount,
        transactionIds
      }
    };
  }

  private async transmitViaSFTP(payload: { csv: string; filename: string }): Promise<ProviderResponse> {
    const creds = this.config!.credentials as ADPCredentials;
    
    console.error(`[ADP] SFTP transport not implemented - cannot upload to ${creds.sftpHost}:${creds.sftpPort || 22}`);
    console.log(`[ADP] File prepared but not transmitted: ${payload.filename} (${payload.csv.length} bytes)`);
    
    return {
      success: false,
      statusCode: 501,
      transactionId: `adp-sftp-${Date.now()}`,
      message: `SFTP transport not implemented. File ${payload.filename} prepared but not uploaded. Install ssh2-sftp-client and implement SFTP upload to enable this feature.`,
      errors: [{
        code: 'SFTP_NOT_IMPLEMENTED',
        message: 'SFTP file upload requires ssh2-sftp-client implementation'
      }],
      data: {
        filename: payload.filename,
        host: creds.sftpHost,
        directory: creds.sftpDirectory || '/incoming',
        bytes: payload.csv.length,
        csvContent: payload.csv
      }
    };
  }

  parseResponse(response: ProviderResponse): SyncResult {
    const data = response.data || {};
    
    return {
      status: response.success ? 'completed' : (data.successCount > 0 ? 'partial' : 'failed'),
      recordCount: (data.successCount || 0) + (data.failCount || 0),
      successCount: data.successCount || (response.success ? 1 : 0),
      errorCount: data.failCount || (response.success ? 0 : 1),
      providerTransactionId: response.transactionId,
      providerResponseCode: String(response.statusCode),
      errors: response.errors?.map(e => ({
        code: e.code,
        message: e.message,
        field: e.field,
        recoverable: false
      })),
      retryable: !response.success && (response.statusCode === 429 || response.statusCode === 503)
    };
  }

  async getEmployees(): Promise<PayrollEmployee[]> {
    this.ensureInitialized();
    const creds = this.config!.credentials as ADPCredentials;

    if (creds.mode !== 'api') {
      console.log('[ADP] SFTP mode does not support employee listing');
      return [];
    }

    const token = await this.ensureValidToken();
    const employees: PayrollEmployee[] = [];
    let nextUrl: string | null = `${ADP_API_BASE}/hr/v2/workers`;

    console.log('[ADP] Fetching employees from ADP...');

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ADP-USERCONTEXT': 'organizationOID=default'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch ADP workers: ${error}`);
      }

      const data = await response.json();
      const workers: ADPWorker[] = data.workers || [];

      for (const worker of workers) {
        employees.push({
          employeeId: worker.associateOID,
          externalId: worker.associateOID,
          firstName: worker.person.legalName.givenName,
          lastName: worker.person.legalName.familyName1,
          email: worker.businessCommunication?.emails?.[0]?.emailUri,
          payRate: 0,
          payType: 'hourly'
        });
      }

      const links = data._links;
      nextUrl = links?.next?.href || null;
    }

    console.log(`[ADP] Retrieved ${employees.length} employees`);
    return employees;
  }

  async refreshToken(): Promise<ADPCredentials> {
    return this.authenticateWithCredentials();
  }

  private async authenticateWithCredentials(): Promise<ADPCredentials> {
    this.ensureInitialized();
    const creds = this.config!.credentials as ADPCredentials;

    console.log('[ADP] Authenticating with client credentials...');

    const basicAuth = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64');

    const response = await fetch(ADP_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
      }).toString()
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[ADP] Authentication failed:', error);
      throw new Error(`ADP authentication failed: ${response.status}`);
    }

    const tokens: ADPTokenResponse = await response.json();
    
    this.accessToken = tokens.access_token;
    this.accessTokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    creds.accessToken = tokens.access_token;
    creds.tokenExpiresAt = this.accessTokenExpiry;

    console.log('[ADP] Authentication successful');

    if (this.tokenRefreshCallback) {
      await this.tokenRefreshCallback(creds);
    }

    return creds;
  }

  private async ensureValidToken(): Promise<string> {
    if (!this.accessToken || !this.accessTokenExpiry) {
      await this.authenticateWithCredentials();
    }

    const bufferMinutes = 5;
    const expiryWithBuffer = new Date(this.accessTokenExpiry!.getTime() - bufferMinutes * 60 * 1000);
    
    if (new Date() >= expiryWithBuffer) {
      console.log('[ADP] Token expired or expiring soon, re-authenticating...');
      await this.authenticateWithCredentials();
    }

    return this.accessToken!;
  }

  private hoursToISO8601Duration(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    let duration = 'PT';
    if (wholeHours > 0) duration += `${wholeHours}H`;
    if (minutes > 0) duration += `${minutes}M`;
    if (duration === 'PT') duration = 'PT0H';
    
    return duration;
  }

  getMode(): 'api' | 'sftp' {
    const creds = this.config?.credentials as ADPCredentials;
    return creds?.mode || 'api';
  }

  getUpdatedCredentials(): ADPCredentials {
    return this.config?.credentials as ADPCredentials;
  }
}

export const adpAdapter = new ADPAdapter();

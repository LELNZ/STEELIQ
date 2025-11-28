import * as crypto from 'crypto';
import { 
  PayrollAdapter, 
  AdapterConfig, 
  PayrollExportPayload, 
  ProviderResponse, 
  SyncResult,
  PayrollProvider,
  FieldMapping,
  PayrollEmployee
} from './types';

export abstract class BasePayrollAdapter implements PayrollAdapter {
  abstract readonly providerId: PayrollProvider;
  abstract readonly displayName: string;
  
  protected config: AdapterConfig | null = null;
  protected isInitialized = false;

  async initialize(config: AdapterConfig): Promise<void> {
    this.config = config;
    await this.validateConfig();
    this.isInitialized = true;
    console.log(`[${this.displayName}] Adapter initialized (testMode: ${config.testMode})`);
  }

  protected async validateConfig(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration is required');
    }
    if (!this.config.apiUrl) {
      throw new Error('API URL is required');
    }
    if (!this.config.credentials) {
      throw new Error('Credentials are required');
    }
  }

  async validateCredentials(): Promise<boolean> {
    this.ensureInitialized();
    const result = await this.testConnection();
    return result.connected;
  }

  abstract preparePayload(data: PayrollExportPayload): Promise<any>;
  
  abstract transmit(payload: any): Promise<ProviderResponse>;
  
  abstract parseResponse(response: any): SyncResult;
  
  abstract testConnection(): Promise<{ connected: boolean; message: string }>;

  async validateMapping(mappings: FieldMapping[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const requiredSourceFields = ['employeeId', 'regularHours', 'totalPay'];
    
    for (const required of requiredSourceFields) {
      const hasMapping = mappings.some(m => m.sourceField === required);
      if (!hasMapping) {
        errors.push(`Required field '${required}' is not mapped`);
      }
    }

    const targetFields = mappings.map(m => m.targetField);
    const duplicates = targetFields.filter((item, index) => targetFields.indexOf(item) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate target field mappings: ${duplicates.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  }

  async getEmployees?(): Promise<PayrollEmployee[]> {
    throw new Error('getEmployees not implemented for this provider');
  }

  async refreshToken?(): Promise<any> {
    throw new Error('refreshToken not implemented for this provider');
  }

  protected ensureInitialized(): void {
    if (!this.isInitialized || !this.config) {
      throw new Error(`${this.displayName} adapter not initialized`);
    }
  }

  protected applyFieldMappings(data: any, mappings: FieldMapping[]): any {
    const result: any = {};
    
    for (const mapping of mappings) {
      const sourceValue = this.getNestedValue(data, mapping.sourceField);
      let transformedValue = sourceValue;

      if (sourceValue === undefined || sourceValue === null) {
        if (mapping.required && mapping.defaultValue === undefined) {
          throw new Error(`Required field '${mapping.sourceField}' is missing`);
        }
        transformedValue = mapping.defaultValue;
      } else if (mapping.transform && mapping.transform !== 'none') {
        transformedValue = this.transformValue(sourceValue, mapping.transform);
      }

      this.setNestedValue(result, mapping.targetField, transformedValue);
    }

    return result;
  }

  protected transformValue(value: any, transform: string): any {
    switch (transform) {
      case 'date':
        return value instanceof Date ? value.toISOString().split('T')[0] : value;
      case 'currency':
        return typeof value === 'number' ? Math.round(value * 100) / 100 : value;
      case 'hours':
        return typeof value === 'number' ? Math.round(value * 100) / 100 : value;
      case 'boolean':
        return Boolean(value);
      default:
        return value;
    }
  }

  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  protected setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  protected generateIdempotencyKey(periodId: number, providerId: string): string {
    const data = `${periodId}-${providerId}-${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  protected calculatePayloadHash(payload: any): string {
    const json = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`[${this.displayName}] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }
}

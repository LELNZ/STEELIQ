/**
 * STEELIQ NO MOCK DATA POLICY
 * 
 * This module enforces Fortune 50 data integrity standards.
 * ALL data must come from:
 * 1. Real user inputs
 * 2. Actual database records  
 * 3. Real API responses
 * 4. Actual file processing
 * 
 * NEVER generate, simulate, or fabricate data.
 */

export class NoMockDataViolationError extends Error {
  constructor(source: string, context: string) {
    super(`⛔ NO MOCK DATA POLICY VIOLATION in ${source}: ${context}`);
    this.name = 'NoMockDataViolationError';
  }
}

/**
 * Validate that data is real and not mock/demo
 */
export function validateRealData(data: any, source: string): void {
  // Check for common mock data patterns
  const mockPatterns = [
    'demo',
    'test',
    'sample',
    'example',
    'mock',
    'fake',
    'dummy',
    'placeholder'
  ];
  
  const dataStr = JSON.stringify(data).toLowerCase();
  
  for (const pattern of mockPatterns) {
    if (dataStr.includes(pattern)) {
      console.warn(`⚠️ Potential mock data detected in ${source}: contains "${pattern}"`);
    }
  }
  
  // Check for suspiciously perfect/round numbers
  if (typeof data === 'object' && data !== null) {
    checkForSuspiciousData(data, source);
  }
}

/**
 * Check for suspiciously perfect data that might be mock
 */
function checkForSuspiciousData(obj: any, source: string): void {
  const suspiciousValues = [
    'Lorem ipsum',
    'John Doe',
    'Jane Doe', 
    'test@example.com',
    '123 Main St',
    '555-0123',
    'TODO',
    'FIXME'
  ];
  
  const objStr = JSON.stringify(obj);
  
  for (const suspicious of suspiciousValues) {
    if (objStr.includes(suspicious)) {
      throw new NoMockDataViolationError(source, `Contains suspicious value: "${suspicious}"`);
    }
  }
  
  // Check for too many round numbers (potential mock data indicator)
  const numbers = objStr.match(/\d+/g) || [];
  const roundNumbers = numbers.filter(n => {
    const num = parseInt(n);
    return num > 100 && num % 100 === 0;
  });
  
  if (roundNumbers.length > 5) {
    console.warn(`⚠️ Suspicious: Many round numbers in ${source} (${roundNumbers.length} found)`);
  }
}

/**
 * Audit trail for data sources
 */
export function auditDataSource(
  data: any,
  source: string,
  metadata: {
    userId?: number;
    timestamp?: Date;
    apiSource?: string;
    fileSource?: string;
  }
): void {
  const audit = {
    source,
    timestamp: metadata.timestamp || new Date(),
    userId: metadata.userId,
    apiSource: metadata.apiSource,
    fileSource: metadata.fileSource,
    dataHash: generateDataHash(data)
  };
  
  // In production, this would write to audit_events table
  console.log(`[DATA AUDIT] ${JSON.stringify(audit)}`);
}

/**
 * Generate hash for data integrity checking
 */
function generateDataHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

export default {
  validateRealData,
  auditDataSource,
  NoMockDataViolationError
};
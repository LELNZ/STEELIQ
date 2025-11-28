import * as crypto from 'crypto';
import { db } from '../db';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { 
  payrollPeriods, 
  timesheets, 
  users,
  teamMembers,
  auditLog,
  hashChainBlocks 
} from '@shared/schema';
import { hashChain } from '@shared/security';

interface EncryptedPayload {
  encryptedData: string;
  iv: string;
  authTag: string;
  algorithm: string;
  keyVersion: number;
  timestamp: string;
}

interface PayrollExportData {
  periodId: number;
  employeeData: Array<{
    employeeId: number;
    name: string;
    hoursWorked: number;
    regularPay: number;
    overtimePay: number;
    totalPay: number;
    deductions: number;
    netPay: number;
  }>;
  periodSummary: {
    totalEmployees: number;
    totalHours: number;
    totalGrossPay: number;
    totalNetPay: number;
  };
  metadata: {
    exportedBy: number;
    exportedAt: Date;
    periodStart: Date;
    periodEnd: Date;
  };
}

export class PayrollExportService {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY_VERSION = 1;
  private encryptionKey: Buffer;

  constructor() {
    // Fortune 50 compliance: Require persistent encryption key from secure storage
    const keyHex = process.env.PAYROLL_ENCRYPTION_KEY;
    
    if (!keyHex) {
      const errorMsg = '[PayrollExportService] CRITICAL: PAYROLL_ENCRYPTION_KEY environment variable is required for Fortune 50 compliance';
      console.error(errorMsg);
      throw new Error('PAYROLL_ENCRYPTION_KEY must be configured for payroll export functionality. Generate with: openssl rand -hex 32');
    }
    
    // Validate key format and length
    try {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
      if (this.encryptionKey.length !== 32) {
        throw new Error(`Invalid key length: ${this.encryptionKey.length} bytes (expected 32 bytes for AES-256)`);
      }
    } catch (error) {
      const errorMsg = `[PayrollExportService] CRITICAL: Invalid PAYROLL_ENCRYPTION_KEY format: ${error.message}`;
      console.error(errorMsg);
      throw new Error('PAYROLL_ENCRYPTION_KEY must be a valid 64-character hex string (32 bytes)');
    }
    
    // Log successful initialization (without exposing key)
    console.log('[PayrollExportService] Initialized with AES-256-GCM encryption (key loaded from secure storage)');
  }

  /**
   * Generate a cryptographically secure 256-bit key
   */
  private generateSecureKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    console.warn('[PayrollExportService] Generated new encryption key - store this securely!');
    return key;
  }

  /**
   * Export payroll data with AES-256-GCM encryption
   * Fortune 50 compliant with audit trail
   */
  async exportPayrollPeriod(
    periodId: number,
    exportedBy: number,
    dualAuthRequestId?: string
  ): Promise<EncryptedPayload> {
    try {
      // 1. Fetch payroll data
      const payrollData = await this.gatherPayrollData(periodId, exportedBy);
      
      // 2. Create audit entry (before encryption)
      await this.createAuditEntry(periodId, exportedBy, dualAuthRequestId);
      
      // 3. Encrypt the data
      const encrypted = await this.encryptPayrollData(payrollData);
      
      // 4. Update period status to exported
      await this.markPeriodAsExported(periodId);
      
      // 5. Add to hash chain for immutability
      await this.addToHashChain(periodId, encrypted, exportedBy);
      
      console.log(`[PayrollExportService] Successfully exported period ${periodId} with AES-256-GCM encryption`);
      
      return encrypted;
    } catch (error) {
      console.error('[PayrollExportService] Export failed:', error);
      throw new Error('Failed to export payroll data securely');
    }
  }

  /**
   * Gather all payroll data for the period
   */
  private async gatherPayrollData(periodId: number, exportedBy: number): Promise<PayrollExportData> {
    // Get period details
    const [period] = await db.select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, periodId))
      .limit(1);
      
    if (!period) {
      throw new Error('Payroll period not found');
    }
    
    // Get all timesheets for the period with team member data for hourly rate
    const timesheetsData = await db.select({
      userId: timesheets.userId,
      userName: users.name,
      hoursWorked: timesheets.hoursWorked,
      overtimeHours: timesheets.overtimeHours,
      userHourlyRate: teamMembers.hourlyRate
    })
      .from(timesheets)
      .leftJoin(users, eq(timesheets.userId, users.id))
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(
        and(
          gte(timesheets.date, period.payPeriodStart),
          lte(timesheets.date, period.payPeriodEnd)
        )
      );
    
    // Calculate pay for each employee
    const employeeData = timesheetsData.map(ts => {
      const regularHours = Number(ts.hoursWorked || 0) - Number(ts.overtimeHours || 0);
      const hourlyRate = Number(ts.userHourlyRate || 0);
      const regularPay = regularHours * hourlyRate;
      const overtimePay = Number(ts.overtimeHours || 0) * hourlyRate * 1.5;
      const totalPay = regularPay + overtimePay;
      const deductions = totalPay * 0.2; // Simplified - in production, use actual deduction rules
      const netPay = totalPay - deductions;
      
      return {
        employeeId: ts.userId,
        name: ts.userName || 'Unknown',
        hoursWorked: Number(ts.hoursWorked || 0),
        regularPay,
        overtimePay,
        totalPay,
        deductions,
        netPay
      };
    });
    
    // Calculate period summary
    const periodSummary = {
      totalEmployees: employeeData.length,
      totalHours: employeeData.reduce((sum, e) => sum + e.hoursWorked, 0),
      totalGrossPay: employeeData.reduce((sum, e) => sum + e.totalPay, 0),
      totalNetPay: employeeData.reduce((sum, e) => sum + e.netPay, 0)
    };
    
    return {
      periodId,
      employeeData,
      periodSummary,
      metadata: {
        exportedBy,
        exportedAt: new Date(),
        periodStart: period.payPeriodStart,
        periodEnd: period.payPeriodEnd
      }
    };
  }

  /**
   * Encrypt payroll data using AES-256-GCM
   * Provides confidentiality, integrity, and authenticity
   */
  private async encryptPayrollData(data: PayrollExportData): Promise<EncryptedPayload> {
    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.encryptionKey, iv);
    
    // Convert data to JSON string
    const plaintext = JSON.stringify(data);
    
    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    
    // Get the authentication tag (ensures integrity)
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      algorithm: this.ALGORITHM,
      keyVersion: this.KEY_VERSION,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Decrypt payroll data (for authorized viewing)
   */
  async decryptPayrollData(encryptedPayload: EncryptedPayload): Promise<PayrollExportData> {
    try {
      // Convert from base64
      const encryptedData = Buffer.from(encryptedPayload.encryptedData, 'base64');
      const iv = Buffer.from(encryptedPayload.iv, 'base64');
      const authTag = Buffer.from(encryptedPayload.authTag, 'base64');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
      
      // Parse JSON
      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      console.error('[PayrollExportService] Decryption failed:', error);
      throw new Error('Failed to decrypt payroll data - possible tampering detected');
    }
  }

  /**
   * Create immutable audit log entry
   */
  private async createAuditEntry(
    periodId: number,
    exportedBy: number,
    dualAuthRequestId?: string
  ): Promise<void> {
    await db.insert(auditLog).values({
      userId: exportedBy,
      action: 'PAYROLL_EXPORT',
      entityType: 'payroll_period',
      entityId: periodId,
      metadata: {
        periodId,
        dualAuthRequestId,
        encryptionAlgorithm: this.ALGORITHM,
        keyVersion: this.KEY_VERSION,
        timestamp: new Date().toISOString()
      },
      ipAddress: '127.0.0.1', // In production, get from request
      userAgent: 'PayrollExportService',
      createdAt: new Date()
    });
  }

  /**
   * Add to hash chain for tamper-evidence
   */
  private async addToHashChain(
    periodId: number,
    encryptedPayload: EncryptedPayload,
    exportedBy: number
  ): Promise<void> {
    // Get the last block in the chain
    const [lastBlock] = await db.select()
      .from(hashChainBlocks)
      .orderBy(hashChainBlocks.blockIndex)
      .limit(1);
    
    const previousHash = lastBlock?.blockHash || '0'.repeat(64);
    const blockIndex = (lastBlock?.blockIndex || 0) + 1;
    
    // Create block data
    const blockData = {
      periodId,
      exportedBy,
      encryptedChecksum: crypto
        .createHash('sha256')
        .update(encryptedPayload.encryptedData)
        .digest('hex'),
      timestamp: new Date().toISOString()
    };
    
    // Calculate block hash
    const blockHash = crypto
      .createHash('sha256')
      .update(previousHash + JSON.stringify(blockData))
      .digest('hex');
    
    // Insert new block
    await db.insert(hashChainBlocks).values({
      chainId: 'payroll_exports',
      blockIndex,
      previousHash,
      blockHash,
      blockType: 'PAYROLL_EXPORT',
      payload: blockData,
      createdAt: new Date()
    });
  }

  /**
   * Mark period as exported in database
   */
  private async markPeriodAsExported(periodId: number): Promise<void> {
    await db.update(payrollPeriods)
      .set({
        status: 'exported',
        updatedAt: new Date()
      })
      .where(eq(payrollPeriods.id, periodId));
  }

  /**
   * Verify the integrity of an encrypted payload
   */
  async verifyIntegrity(encryptedPayload: EncryptedPayload): Promise<boolean> {
    try {
      // Attempt to decrypt - if auth tag verification fails, data was tampered
      await this.decryptPayrollData(encryptedPayload);
      return true;
    } catch (error) {
      console.error('[PayrollExportService] Integrity check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const payrollExportService = new PayrollExportService();
import { db } from '../../db';
import { eq, and, lt, desc, or, sql, inArray } from 'drizzle-orm';
import { 
  payrollSyncLog, 
  payrollProviderConfig, 
  payrollPeriods 
} from '@shared/schema';
import { payrollOrchestrator } from './orchestrator';
import { PayrollProvider, SyncStatus } from './types';

interface ScheduledSync {
  id: string;
  providerId: PayrollProvider;
  periodId: number;
  scheduledAt: Date;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 30000,
  maxDelayMs: 3600000,
  backoffMultiplier: 2
};

export class PayrollSyncScheduler {
  private static instance: PayrollSyncScheduler;
  private scheduledSyncs: Map<string, NodeJS.Timeout> = new Map();
  private runningJobs: Set<string> = new Set();
  private retryConfigs: Map<PayrollProvider, RetryConfig> = new Map();
  private isProcessing = false;

  private constructor() {
    this.retryConfigs.set('quickbooks', DEFAULT_RETRY_CONFIG);
    this.retryConfigs.set('xero', DEFAULT_RETRY_CONFIG);
    this.retryConfigs.set('adp', {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: 3,
      baseDelayMs: 60000
    });

    console.log('[SyncScheduler] Initialized');
  }

  static getInstance(): PayrollSyncScheduler {
    if (!PayrollSyncScheduler.instance) {
      PayrollSyncScheduler.instance = new PayrollSyncScheduler();
    }
    return PayrollSyncScheduler.instance;
  }

  async scheduleSyncForPeriod(
    providerId: PayrollProvider,
    periodId: number,
    scheduledAt: Date,
    userId: number
  ): Promise<string> {
    const jobId = `${providerId}-${periodId}-${Date.now()}`;
    
    console.log(`[SyncScheduler] Scheduling sync job ${jobId} for ${scheduledAt.toISOString()}`);

    const delay = scheduledAt.getTime() - Date.now();
    
    if (delay <= 0) {
      console.log(`[SyncScheduler] Executing immediately (scheduled time in past)`);
      this.executeSync(providerId, periodId, userId, 0);
    } else {
      const timeout = setTimeout(() => {
        this.executeSync(providerId, periodId, userId, 0);
        this.scheduledSyncs.delete(jobId);
      }, delay);
      
      this.scheduledSyncs.set(jobId, timeout);
    }

    return jobId;
  }

  async cancelScheduledSync(jobId: string): Promise<boolean> {
    const timeout = this.scheduledSyncs.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledSyncs.delete(jobId);
      console.log(`[SyncScheduler] Cancelled scheduled sync: ${jobId}`);
      return true;
    }
    return false;
  }

  private async executeSync(
    providerId: PayrollProvider,
    periodId: number,
    userId: number,
    retryCount: number,
    syncLogId?: number
  ): Promise<void> {
    const jobKey = syncLogId ? `${providerId}-${periodId}-${syncLogId}` : `${providerId}-${periodId}`;
    
    if (this.runningJobs.has(jobKey)) {
      console.log(`[SyncScheduler] Job ${jobKey} already running, skipping`);
      return;
    }

    this.runningJobs.add(jobKey);

    try {
      console.log(`[SyncScheduler] Executing sync for ${providerId} period ${periodId} (attempt ${retryCount + 1})`);

      const result = await payrollOrchestrator.syncPayrollPeriod(periodId, providerId, userId);

      if (result.status === 'completed') {
        console.log(`[SyncScheduler] Sync completed successfully for ${providerId} period ${periodId}`);
        
        if (syncLogId) {
          await db.update(payrollSyncLog)
            .set({
              status: 'completed',
              nextRetryAt: null,
              updatedAt: new Date()
            })
            .where(eq(payrollSyncLog.id, syncLogId));
        }
      } else if (result.status === 'failed' || result.status === 'partial') {
        await this.handleSyncFailure(providerId, periodId, userId, retryCount, result, syncLogId);
      }
    } catch (error: any) {
      console.error(`[SyncScheduler] Sync error for ${providerId} period ${periodId}:`, error);
      await this.handleSyncFailure(providerId, periodId, userId, retryCount, {
        status: 'failed',
        recordCount: 0,
        successCount: 0,
        errorCount: 1,
        errors: [{ code: 'SYNC_ERROR', message: error.message }],
        retryable: true
      }, syncLogId);
    } finally {
      this.runningJobs.delete(jobKey);
    }
  }

  private async handleSyncFailure(
    providerId: PayrollProvider,
    periodId: number,
    userId: number,
    retryCount: number,
    result: any,
    syncLogId?: number
  ): Promise<void> {
    const config = this.retryConfigs.get(providerId) || DEFAULT_RETRY_CONFIG;
    const newRetryCount = retryCount + 1;
    
    if (!result.retryable) {
      console.log(`[SyncScheduler] Sync failure is not retryable for ${providerId} period ${periodId}`);
      
      if (syncLogId) {
        await db.update(payrollSyncLog)
          .set({
            status: 'failed',
            retryCount: newRetryCount,
            nextRetryAt: null,
            errorMessage: `Non-retryable error: ${result.errors?.[0]?.message || 'Unknown error'}`,
            updatedAt: new Date()
          })
          .where(eq(payrollSyncLog.id, syncLogId));
      }
      return;
    }

    if (newRetryCount > config.maxRetries) {
      console.log(`[SyncScheduler] Max retries (${config.maxRetries}) exceeded for ${providerId} period ${periodId}`);
      
      if (syncLogId) {
        await db.update(payrollSyncLog)
          .set({
            status: 'failed',
            retryCount: newRetryCount,
            nextRetryAt: null,
            errorMessage: `Max retries exceeded after ${newRetryCount} attempts. Last error: ${result.errors?.[0]?.message || 'Unknown error'}`,
            updatedAt: new Date()
          })
          .where(eq(payrollSyncLog.id, syncLogId));
      }
      
      return;
    }

    const delay = Math.min(
      config.baseDelayMs * Math.pow(config.backoffMultiplier, retryCount),
      config.maxDelayMs
    );

    const nextRetryAt = new Date(Date.now() + delay);

    console.log(`[SyncScheduler] Scheduling retry ${newRetryCount}/${config.maxRetries} at ${nextRetryAt.toISOString()} for ${providerId} period ${periodId}`);

    if (syncLogId) {
      await db.update(payrollSyncLog)
        .set({
          status: 'failed',
          retryCount: newRetryCount,
          nextRetryAt: nextRetryAt,
          errorMessage: result.errors?.[0]?.message || 'Retrying...',
          updatedAt: new Date()
        })
        .where(eq(payrollSyncLog.id, syncLogId));
    }

    setTimeout(() => {
      this.executeSync(providerId, periodId, userId, newRetryCount, syncLogId);
    }, delay);
  }

  async processFailedSyncs(): Promise<void> {
    if (this.isProcessing) {
      console.log('[SyncScheduler] Already processing failed syncs, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('[SyncScheduler] Processing failed syncs for retry...');

      const failedSyncs = await db.select()
        .from(payrollSyncLog)
        .where(
          and(
            or(
              eq(payrollSyncLog.status, 'failed'),
              eq(payrollSyncLog.status, 'partial')
            ),
            sql`${payrollSyncLog.nextRetryAt} IS NOT NULL`,
            sql`${payrollSyncLog.nextRetryAt} <= NOW()`
          )
        )
        .orderBy(desc(payrollSyncLog.createdAt))
        .limit(10);

      const eligibleSyncs = failedSyncs.filter(sync => {
        const config = this.retryConfigs.get(sync.providerId as PayrollProvider) || DEFAULT_RETRY_CONFIG;
        const currentRetries = sync.retryCount || 0;
        return currentRetries < config.maxRetries;
      });

      console.log(`[SyncScheduler] Found ${failedSyncs.length} syncs with due nextRetryAt, ${eligibleSyncs.length} eligible after retry limit check`);

      for (const sync of eligibleSyncs) {
        const currentRetryCount = sync.retryCount || 0;
        
        await db.update(payrollSyncLog)
          .set({
            status: 'processing',
            nextRetryAt: null,
            updatedAt: new Date()
          })
          .where(eq(payrollSyncLog.id, sync.id));

        await this.executeSync(
          sync.providerId as PayrollProvider,
          sync.periodId,
          sync.initiatedBy,
          currentRetryCount,
          sync.id
        );
      }
    } catch (error) {
      console.error('[SyncScheduler] Error processing failed syncs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async getScheduledSyncs(): Promise<Array<{
    jobId: string;
    providerId: PayrollProvider;
    status: string;
  }>> {
    const syncs: Array<{
      jobId: string;
      providerId: PayrollProvider;
      status: string;
    }> = [];

    for (const [jobId] of this.scheduledSyncs) {
      const [providerId] = jobId.split('-');
      syncs.push({
        jobId,
        providerId: providerId as PayrollProvider,
        status: 'pending'
      });
    }

    for (const jobKey of this.runningJobs) {
      const [providerId] = jobKey.split('-');
      syncs.push({
        jobId: jobKey,
        providerId: providerId as PayrollProvider,
        status: 'running'
      });
    }

    return syncs;
  }

  setRetryConfig(providerId: PayrollProvider, config: Partial<RetryConfig>): void {
    const existing = this.retryConfigs.get(providerId) || DEFAULT_RETRY_CONFIG;
    this.retryConfigs.set(providerId, { ...existing, ...config });
    console.log(`[SyncScheduler] Updated retry config for ${providerId}:`, this.retryConfigs.get(providerId));
  }

  getRetryConfig(providerId: PayrollProvider): RetryConfig {
    return this.retryConfigs.get(providerId) || DEFAULT_RETRY_CONFIG;
  }

  async getSyncHistory(providerId?: PayrollProvider, limit: number = 50): Promise<any[]> {
    const conditions = [];
    if (providerId) {
      conditions.push(eq(payrollSyncLog.providerId, providerId));
    }

    const history = await db.select()
      .from(payrollSyncLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payrollSyncLog.createdAt))
      .limit(limit);

    return history.map(sync => ({
      id: sync.id,
      providerId: sync.providerId,
      periodId: sync.periodId,
      status: sync.status,
      recordCount: sync.recordCount,
      successCount: sync.successCount,
      errorCount: sync.errorCount,
      retryCount: sync.retryCount,
      createdAt: sync.createdAt,
      completedAt: sync.completedAt,
      errorMessage: sync.errorMessage
    }));
  }

  async getProviderStats(providerId: PayrollProvider): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    partialSyncs: number;
    averageRetries: number;
    lastSyncAt: Date | null;
  }> {
    const stats = await db.select({
      total: sql<number>`count(*)`,
      successful: sql<number>`count(*) filter (where status = 'completed')`,
      failed: sql<number>`count(*) filter (where status = 'failed')`,
      partial: sql<number>`count(*) filter (where status = 'partial')`,
      avgRetries: sql<number>`avg(retry_count)`,
      lastSync: sql<Date>`max(created_at)`
    })
      .from(payrollSyncLog)
      .where(eq(payrollSyncLog.providerId, providerId));

    const stat = stats[0];
    
    return {
      totalSyncs: Number(stat?.total || 0),
      successfulSyncs: Number(stat?.successful || 0),
      failedSyncs: Number(stat?.failed || 0),
      partialSyncs: Number(stat?.partial || 0),
      averageRetries: Number(stat?.avgRetries || 0),
      lastSyncAt: stat?.lastSync || null
    };
  }

  async bulkScheduleSyncs(
    providerId: PayrollProvider,
    periodIds: number[],
    scheduledAt: Date,
    userId: number
  ): Promise<string[]> {
    const jobIds: string[] = [];
    
    for (const periodId of periodIds) {
      const jobId = await this.scheduleSyncForPeriod(providerId, periodId, scheduledAt, userId);
      jobIds.push(jobId);
    }

    console.log(`[SyncScheduler] Bulk scheduled ${jobIds.length} syncs for ${providerId}`);
    return jobIds;
  }

  cancelAllScheduledSyncs(): number {
    let count = 0;
    for (const [jobId, timeout] of this.scheduledSyncs) {
      clearTimeout(timeout);
      count++;
    }
    this.scheduledSyncs.clear();
    console.log(`[SyncScheduler] Cancelled ${count} scheduled syncs`);
    return count;
  }

  startPeriodicRetryProcessor(intervalMs: number = 300000): NodeJS.Timeout {
    console.log(`[SyncScheduler] Starting periodic retry processor (interval: ${intervalMs}ms)`);
    
    return setInterval(() => {
      this.processFailedSyncs().catch(err => {
        console.error('[SyncScheduler] Periodic retry processor error:', err);
      });
    }, intervalMs);
  }

  async manualRetry(syncLogId: number, userId: number): Promise<{ success: boolean; message: string }> {
    const [syncLog] = await db.select()
      .from(payrollSyncLog)
      .where(eq(payrollSyncLog.id, syncLogId))
      .limit(1);

    if (!syncLog) {
      return { success: false, message: 'Sync log not found' };
    }

    if (syncLog.status !== 'failed' && syncLog.status !== 'partial') {
      return { success: false, message: `Cannot retry sync with status: ${syncLog.status}` };
    }

    console.log(`[SyncScheduler] Manual retry initiated for sync ${syncLogId}`);
    
    await db.update(payrollSyncLog)
      .set({ 
        retryCount: 0, 
        status: 'processing',
        nextRetryAt: null,
        updatedAt: new Date() 
      })
      .where(eq(payrollSyncLog.id, syncLogId));

    this.executeSync(
      syncLog.providerId as PayrollProvider,
      syncLog.periodId,
      userId,
      0,
      syncLogId
    );

    return { success: true, message: `Retry initiated for sync ${syncLogId}` };
  }
}

export const syncScheduler = PayrollSyncScheduler.getInstance();

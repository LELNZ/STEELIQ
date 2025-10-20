/**
 * Worker Queue Service for Fortune 50 Batch Processing
 * Handles 1000+ drawings/day with concurrency control and retry logic
 * Implements job prioritization and resource management
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { eq, and, or, lte, isNull, sql } from 'drizzle-orm';
import { aiMonitoringService } from './aiMonitoringService';

interface Job {
  id: string;
  type: 'AI_EXTRACTION' | 'DXF_PROCESSING' | 'EXPORT' | 'BATCH_ANALYSIS';
  payload: any;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  organizationKey: string;
  userId?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  metadata?: Record<string, any>;
}

interface WorkerOptions {
  maxConcurrent?: number;
  pollIntervalMs?: number;
  retryDelayMs?: number;
  staleJobTimeoutMs?: number;
  enableMetrics?: boolean;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  throughput: number;
  avgProcessingTime: number;
  successRate: number;
}

type JobProcessor = (job: Job) => Promise<any>;

class WorkerQueueService extends EventEmitter {
  private workers = new Map<string, NodeJS.Timeout>();
  private processors = new Map<string, JobProcessor>();
  private activeJobs = new Map<string, Job>();
  private isRunning = false;
  private stats: QueueStats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    throughput: 0,
    avgProcessingTime: 0,
    successRate: 0
  };
  
  private options: Required<WorkerOptions> = {
    maxConcurrent: 10,
    pollIntervalMs: 5000,
    retryDelayMs: 30000,
    staleJobTimeoutMs: 600000, // 10 minutes
    enableMetrics: true
  };

  constructor(options: WorkerOptions = {}) {
    super();
    this.options = { ...this.options, ...options };
    this.initializeProcessors();
    this.startMonitoring();
  }

  /**
   * Initialize job processors
   */
  private initializeProcessors() {
    // AI Extraction processor
    this.registerProcessor('AI_EXTRACTION', async (job: Job) => {
      const { pdfBuffer, annotations, projectId } = job.payload;
      
      // Import AI service dynamically to avoid circular dependencies
      const { default: aiService } = await import('./aiEstimationService');
      
      const startTime = Date.now();
      const result = await aiService.analyzeDrawingForMTO(
        Buffer.from(pdfBuffer),
        annotations,
        `Job ${job.id}`
      );
      
      const processingTime = Date.now() - startTime;
      
      // Log metrics
      if (this.options.enableMetrics) {
        aiMonitoringService.recordMetric({
          name: 'job_processing_time',
          value: processingTime,
          unit: 'ms',
          tags: { jobType: 'AI_EXTRACTION', jobId: job.id }
        });
      }
      
      return result;
    });

    // DXF Processing processor
    this.registerProcessor('DXF_PROCESSING', async (job: Job) => {
      const { dxfContent, projectId } = job.payload;
      
      const { default: dxfParser } = await import('./dxfParserService');
      
      const result = await dxfParser.parseDXF(dxfContent);
      if (!result.success) {
        throw new Error(result.error || 'DXF parsing failed');
      }
      
      const steelElements = await dxfParser.extractSteelElements(result.data);
      
      return { 
        parsed: result.data,
        steelElements,
        summary: {
          layers: result.layers?.length || 0,
          entities: result.entities?.length || 0,
          steelCount: steelElements.length
        }
      };
    });

    // Export processor
    this.registerProcessor('EXPORT', async (job: Job) => {
      const { resultId, format, options } = job.payload;
      
      const { mtoExportService } = await import('./mtoExportService');
      const { secureStorageService } = await import('./secureStorageService');
      
      // Get data from database
      const estimationResult = await this.getEstimationResult(resultId);
      const mtoItems = await this.getMtoItems(resultId);
      
      // Generate export
      const exportResult = await mtoExportService.exportMTO(
        estimationResult,
        mtoItems,
        options
      );
      
      if (!exportResult.success) {
        throw new Error(exportResult.error);
      }
      
      // Store securely instead of local filesystem
      const fileBuffer = await this.readFileBuffer(exportResult.filePath!);
      const storedFile = await secureStorageService.storeFile(
        fileBuffer,
        path.basename(exportResult.filePath!),
        format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv',
        { ttlSeconds: 86400 * 7 } // 7 days
      );
      
      // Generate signed URL for download
      const downloadUrl = await secureStorageService.generateSignedUrl(
        storedFile.id,
        3600 // 1 hour expiration
      );
      
      return {
        success: true,
        fileId: storedFile.id,
        downloadUrl,
        expiresAt: storedFile.expiresAt
      };
    });

    // Batch Analysis processor
    this.registerProcessor('BATCH_ANALYSIS', async (job: Job) => {
      const { drawings, projectId, options } = job.payload;
      const results = [];
      
      for (const drawing of drawings) {
        try {
          // Create sub-job for each drawing
          const subJob = await this.enqueueJob({
            type: 'AI_EXTRACTION',
            payload: drawing,
            priority: job.priority,
            organizationKey: job.organizationKey,
            userId: job.userId
          });
          
          // Wait for sub-job completion (with timeout)
          const result = await this.waitForJob(subJob.id, 300000); // 5 minute timeout
          results.push({ success: true, drawingId: drawing.id, result });
        } catch (error) {
          results.push({ 
            success: false, 
            drawingId: drawing.id, 
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return {
        totalDrawings: drawings.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    });
  }

  /**
   * Register a custom job processor
   */
  registerProcessor(type: string, processor: JobProcessor): void {
    this.processors.set(type, processor);
  }

  /**
   * Enqueue a new job
   */
  async enqueueJob(jobData: Partial<Job>): Promise<Job> {
    const job: Job = {
      id: this.generateJobId(),
      type: jobData.type!,
      payload: jobData.payload || {},
      priority: jobData.priority || 5,
      status: 'pending',
      retryCount: 0,
      maxRetries: jobData.maxRetries || 3,
      organizationKey: jobData.organizationKey || 'default',
      userId: jobData.userId,
      createdAt: new Date(),
      metadata: jobData.metadata || {}
    };

    // Store in database
    await db.execute(sql`
      INSERT INTO worker_queue_jobs (
        id, type, payload, priority, status, retry_count, max_retries,
        organization_key, user_id, created_at, metadata
      ) VALUES (
        ${job.id}, ${job.type}, ${JSON.stringify(job.payload)}, ${job.priority},
        ${job.status}, ${job.retryCount}, ${job.maxRetries},
        ${job.organizationKey}, ${job.userId}, ${job.createdAt},
        ${JSON.stringify(job.metadata)}
      )
    `);

    this.emit('job:enqueued', job);
    this.stats.pending++;

    // Log event
    aiMonitoringService.log({
      level: 'INFO',
      service: 'WORKER_QUEUE',
      operation: 'enqueue',
      message: `Job ${job.id} enqueued`,
      metadata: { jobType: job.type, priority: job.priority },
      correlationId: job.id
    });

    return job;
  }

  /**
   * Start worker processing
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Worker Queue] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[Worker Queue] Starting with', this.options.maxConcurrent, 'concurrent workers');

    // Start worker loops
    for (let i = 0; i < this.options.maxConcurrent; i++) {
      this.startWorker(`worker_${i}`);
    }

    // Start stale job cleanup
    this.startStaleJobCleanup();

    this.emit('queue:started');
  }

  /**
   * Stop worker processing
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Stop all workers
    for (const [workerId, timeout] of this.workers) {
      clearTimeout(timeout);
    }
    this.workers.clear();

    // Wait for active jobs to complete
    const activeJobCount = this.activeJobs.size;
    if (activeJobCount > 0) {
      console.log(`[Worker Queue] Waiting for ${activeJobCount} active jobs to complete...`);
      
      // Wait maximum 30 seconds for jobs to complete
      const maxWaitTime = 30000;
      const startTime = Date.now();
      
      while (this.activeJobs.size > 0 && Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('[Worker Queue] Stopped');
    this.emit('queue:stopped');
  }

  /**
   * Start individual worker
   */
  private startWorker(workerId: string): void {
    const processNext = async () => {
      if (!this.isRunning) return;

      try {
        // Get next job from queue
        const job = await this.getNextJob();
        
        if (job) {
          this.activeJobs.set(job.id, job);
          this.stats.processing++;
          this.stats.pending--;

          try {
            // Process job
            const processor = this.processors.get(job.type);
            if (!processor) {
              throw new Error(`No processor registered for job type: ${job.type}`);
            }

            const startTime = Date.now();
            job.startedAt = new Date();
            
            // Update job status in database
            await this.updateJobStatus(job.id, 'processing', { startedAt: job.startedAt });

            // Execute processor
            const result = await processor(job);
            
            // Mark job as completed
            job.completedAt = new Date();
            job.status = 'completed';
            job.result = result;
            
            const processingTime = Date.now() - startTime;
            
            await this.updateJobStatus(job.id, 'completed', {
              completedAt: job.completedAt,
              result,
              processingTime
            });

            this.stats.completed++;
            this.stats.processing--;
            
            // Update metrics
            this.updateMetrics(processingTime, true);
            
            this.emit('job:completed', job);
            
            aiMonitoringService.log({
              level: 'INFO',
              service: 'WORKER_QUEUE',
              operation: 'process',
              message: `Job ${job.id} completed`,
              duration: processingTime,
              correlationId: job.id
            });
          } catch (error) {
            await this.handleJobError(job, error);
          } finally {
            this.activeJobs.delete(job.id);
          }
        }
      } catch (error) {
        console.error(`[Worker ${workerId}] Error:`, error);
      }

      // Schedule next iteration
      const timeout = setTimeout(processNext, this.options.pollIntervalMs);
      this.workers.set(workerId, timeout);
    };

    // Start processing
    processNext();
  }

  /**
   * Get next job from queue
   */
  private async getNextJob(): Promise<Job | null> {
    try {
      // Get highest priority pending job
      const result = await db.execute(sql`
        SELECT * FROM worker_queue_jobs
        WHERE status = 'pending'
        AND (scheduled_at IS NULL OR scheduled_at <= NOW())
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `);

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      return {
        id: row.id as string,
        type: row.type as Job['type'],
        payload: JSON.parse(row.payload as string),
        priority: row.priority as number,
        status: row.status as Job['status'],
        retryCount: row.retry_count as number,
        maxRetries: row.max_retries as number,
        organizationKey: row.organization_key as string,
        userId: row.user_id as number | undefined,
        createdAt: row.created_at as Date,
        metadata: JSON.parse(row.metadata as string || '{}')
      };
    } catch (error) {
      console.error('[Worker Queue] Error getting next job:', error);
      return null;
    }
  }

  /**
   * Handle job error
   */
  private async handleJobError(job: Job, error: any): Promise<void> {
    job.retryCount++;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[Worker Queue] Job ${job.id} failed:`, errorMessage);
    
    if (job.retryCount < job.maxRetries) {
      // Schedule retry
      const retryDelay = this.options.retryDelayMs * Math.pow(2, job.retryCount - 1); // Exponential backoff
      const scheduledAt = new Date(Date.now() + retryDelay);
      
      await this.updateJobStatus(job.id, 'pending', {
        retryCount: job.retryCount,
        lastError: errorMessage,
        scheduledAt
      });
      
      this.emit('job:retry', job);
      
      aiMonitoringService.log({
        level: 'WARN',
        service: 'WORKER_QUEUE',
        operation: 'retry',
        message: `Job ${job.id} scheduled for retry ${job.retryCount}/${job.maxRetries}`,
        error: { message: errorMessage },
        correlationId: job.id
      });
    } else {
      // Mark as failed
      job.status = 'failed';
      job.error = errorMessage;
      
      await this.updateJobStatus(job.id, 'failed', {
        error: errorMessage,
        failedAt: new Date()
      });
      
      this.stats.failed++;
      this.stats.processing--;
      
      this.updateMetrics(0, false);
      
      this.emit('job:failed', job);
      
      aiMonitoringService.log({
        level: 'ERROR',
        service: 'WORKER_QUEUE',
        operation: 'failed',
        message: `Job ${job.id} failed after ${job.maxRetries} retries`,
        error: { message: errorMessage },
        correlationId: job.id
      });
    }
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string,
    status: Job['status'],
    updates: Record<string, any> = {}
  ): Promise<void> {
    await db.execute(sql`
      UPDATE worker_queue_jobs
      SET 
        status = ${status},
        updated_at = NOW(),
        ${sql.raw(
          Object.entries(updates)
            .map(([key, value]) => `${key} = ${sql.value(value)}`)
            .join(', ')
        )}
      WHERE id = ${jobId}
    `);
  }

  /**
   * Wait for job completion
   */
  private async waitForJob(jobId: string, timeoutMs: number): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const result = await db.execute(sql`
        SELECT status, result, error FROM worker_queue_jobs
        WHERE id = ${jobId}
      `);
      
      if (result.rows && result.rows.length > 0) {
        const job = result.rows[0];
        
        if (job.status === 'completed') {
          return JSON.parse(job.result as string);
        } else if (job.status === 'failed') {
          throw new Error(job.error as string || 'Job failed');
        }
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
  }

  /**
   * Clean up stale jobs
   */
  private startStaleJobCleanup(): void {
    setInterval(async () => {
      try {
        // Find jobs that have been processing for too long
        const staleThreshold = new Date(Date.now() - this.options.staleJobTimeoutMs);
        
        await db.execute(sql`
          UPDATE worker_queue_jobs
          SET 
            status = 'failed',
            error = 'Job timed out',
            updated_at = NOW()
          WHERE 
            status = 'processing'
            AND started_at < ${staleThreshold}
        `);
      } catch (error) {
        console.error('[Worker Queue] Stale job cleanup error:', error);
      }
    }, 60000); // Run every minute
  }

  /**
   * Update metrics
   */
  private updateMetrics(processingTime: number, success: boolean): void {
    // Update throughput (jobs per minute)
    const completedCount = this.stats.completed + this.stats.failed;
    const uptimeMinutes = process.uptime() / 60;
    this.stats.throughput = completedCount / uptimeMinutes;
    
    // Update average processing time
    if (success && processingTime > 0) {
      const alpha = 0.1; // Exponential moving average factor
      this.stats.avgProcessingTime = 
        alpha * processingTime + (1 - alpha) * this.stats.avgProcessingTime;
    }
    
    // Update success rate
    this.stats.successRate = 
      completedCount > 0 ? this.stats.completed / completedCount : 0;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    // Get real-time counts from database
    const result = await db.execute(sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM worker_queue_jobs
      WHERE created_at > NOW() - INTERVAL '24 HOURS'
      GROUP BY status
    `);
    
    if (result.rows) {
      for (const row of result.rows) {
        const status = row.status as string;
        const count = parseInt(row.count as string);
        
        switch (status) {
          case 'pending':
            this.stats.pending = count;
            break;
          case 'processing':
            this.stats.processing = count;
            break;
          case 'completed':
            this.stats.completed = count;
            break;
          case 'failed':
            this.stats.failed = count;
            break;
        }
      }
    }
    
    return { ...this.stats };
  }

  /**
   * Get active jobs for monitoring
   */
  async getActiveJobs(): Promise<Job[]> {
    try {
      // Get active jobs from database
      const result = await db.execute<{
        id: number;
        type: string;
        status: string;
        payload: any;
        priority: number;
        created_at: Date;
        started_at: Date | null;
        retry_count: number;
      }>(sql`
        SELECT id, type, status, payload, priority, created_at, started_at, retry_count
        FROM worker_queue_jobs
        WHERE status IN ('pending', 'processing')
        ORDER BY priority ASC, created_at DESC
        LIMIT 50
      `);
      
      const activeJobs: Job[] = result.rows.map((row: any) => ({
        id: Number(row.id),
        type: row.type,
        status: row.status,
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
        priority: row.priority || 0,
        createdAt: row.created_at,
        startedAt: row.started_at || undefined,
        retryCount: row.retry_count || 0,
        data: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
      }));
      
      return activeJobs;
    } catch (error) {
      console.error('[WorkerQueue] Error getting active jobs:', error);
      return [];
    }
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Report metrics periodically
    setInterval(async () => {
      if (this.options.enableMetrics) {
        const stats = await this.getQueueStats();
        
        aiMonitoringService.recordMetric({
          name: 'queue_pending',
          value: stats.pending,
          unit: 'count',
          tags: { queue: 'worker' }
        });
        
        aiMonitoringService.recordMetric({
          name: 'queue_throughput',
          value: stats.throughput,
          unit: 'jobs/min',
          tags: { queue: 'worker' }
        });
        
        aiMonitoringService.recordMetric({
          name: 'queue_success_rate',
          value: stats.successRate,
          unit: 'ratio',
          tags: { queue: 'worker' }
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Helper methods
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async getEstimationResult(resultId: number): Promise<any> {
    // Implementation would fetch from database
    return {};
  }

  private async getMtoItems(resultId: number): Promise<any[]> {
    // Implementation would fetch from database
    return [];
  }

  private async readFileBuffer(filePath: string): Promise<Buffer> {
    const fs = await import('fs/promises');
    return fs.readFile(filePath);
  }
}

// Import path for file operations
import path from 'path';

// Create singleton instance
export const workerQueueService = new WorkerQueueService({
  maxConcurrent: parseInt(process.env.WORKER_MAX_CONCURRENT || '10'),
  pollIntervalMs: 5000,
  retryDelayMs: 30000,
  staleJobTimeoutMs: 600000,
  enableMetrics: true
});

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  workerQueueService.start().catch(console.error);
}
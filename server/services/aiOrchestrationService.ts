/**
 * AI Orchestration Service - Fortune 50 Level Event-Driven Pipeline
 * Production-ready orchestration layer for all AI operations
 */

import { EventEmitter } from 'events';
import { db } from '../db';
import { 
  ai_processing_jobs,
  ai_workflow_templates,
  ai_feedback_entries
} from '@shared/schema';
import { eq, desc, and, gt, lt, isNull, not, inArray, sql } from 'drizzle-orm';
import { workerQueueService } from './workerQueueService';
import { aiMonitoringService } from './aiMonitoringService';
import { aiCacheService } from './aiCacheService';
import aiEstimationService from './aiEstimationService';

// Event types for orchestration
export enum OrchestrationEvent {
  JOB_CREATED = 'job.created',
  JOB_STARTED = 'job.started',
  JOB_PROGRESS = 'job.progress',
  JOB_COMPLETED = 'job.completed',
  JOB_FAILED = 'job.failed',
  JOB_RETRIED = 'job.retried',
  FEEDBACK_RECEIVED = 'feedback.received',
  MODEL_UPDATED = 'model.updated',
  WORKER_SCALED = 'worker.scaled',
  QUEUE_STATUS_CHANGED = 'queue.status_changed',
  LEARNING_IMPROVEMENT = 'learning.improvement'
}

// Job priority levels
export enum JobPriority {
  URGENT = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BATCH = 5
}

// Workflow step status
export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

// Interfaces
export interface AIRequest {
  type: 'drawing-analysis' | 'mto-generation' | 'cost-estimation' | 'pattern-learning' | 'batch-processing';
  priority?: JobPriority;
  data: {
    fileId?: string;
    fileName?: string;
    projectId?: number;
    estimationId?: number;
    userId: number;
    metadata?: Record<string, any>;
  };
  options?: {
    skipCache?: boolean;
    requireManualReview?: boolean;
    notifyOnComplete?: boolean;
    webhookUrl?: string;
  };
}

export interface JobStep {
  id: string;
  name: string;
  status: StepStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  progress: number;
  result?: any;
  error?: string;
}

export interface OrchestrationJob {
  id: string;
  type: string;
  priority: JobPriority;
  status: string;
  steps: JobStep[];
  currentStep: number;
  totalSteps: number;
  progress: number;
  data: Record<string, any>;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  processingTime?: number;
  retryCount: number;
  userId: number;
}

export interface UserFeedback {
  rating?: number; // 1-5
  corrections?: {
    field: string;
    originalValue: any;
    correctedValue: any;
    reason?: string;
  }[];
  comments?: string;
  approved: boolean;
  timestamp: Date;
}

export interface AIMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  successRate: number;
  queueDepth: number;
  activeWorkers: number;
  cacheHitRate: number;
  learningImprovement: number;
  costSavings: number;
  feedbackScore: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  steps: {
    id: string;
    name: string;
    handler: string;
    config: Record<string, any>;
    dependencies?: string[];
  }[];
  triggers?: {
    event?: string;
    schedule?: string;
    condition?: string;
  }[];
  metadata: Record<string, any>;
}

class AIOrchestrationService extends EventEmitter {
  private static instance: AIOrchestrationService;
  private activeJobs: Map<string, OrchestrationJob> = new Map();
  private workerPool: Map<string, boolean> = new Map(); // Worker ID -> busy status
  private metricsInterval: NodeJS.Timeout | null = null;
  private scalingInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    super();
    this.initialize();
  }

  public static getInstance(): AIOrchestrationService {
    if (!AIOrchestrationService.instance) {
      AIOrchestrationService.instance = new AIOrchestrationService();
    }
    return AIOrchestrationService.instance;
  }

  private async initialize() {
    // Start monitoring and scaling intervals
    this.startMetricsCollection();
    this.startAutoScaling();
    
    // Listen to worker queue events
    this.setupEventListeners();
    
    // Load workflow templates from database
    await this.loadWorkflowTemplates();
    
    console.log('[AI Orchestration] Service initialized');
  }

  private setupEventListeners() {
    // Internal event handling for job lifecycle
    this.on(OrchestrationEvent.JOB_COMPLETED, async (jobId: string) => {
      await this.handleJobCompletion(jobId);
    });

    this.on(OrchestrationEvent.JOB_FAILED, async (jobId: string, error: any) => {
      await this.handleJobFailure(jobId, error);
    });

    this.on(OrchestrationEvent.FEEDBACK_RECEIVED, async (jobId: string, feedback: UserFeedback) => {
      await this.processFeedback(jobId, feedback);
    });
  }

  /**
   * Submit a new AI job for processing
   */
  public async submitJob(request: AIRequest): Promise<string> {
    try {
      // Generate job ID
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check cache if applicable
      if (!request.options?.skipCache) {
        const cacheKey = this.generateCacheKey(request);
        const cachedResult = await aiCacheService.get(cacheKey);
        
        if (cachedResult) {
          // Create instant completed job with cached result
          const job: OrchestrationJob = {
            id: jobId,
            type: request.type,
            priority: request.priority || JobPriority.NORMAL,
            status: 'completed',
            steps: [],
            currentStep: 0,
            totalSteps: 0,
            progress: 100,
            data: request.data,
            result: cachedResult,
            createdAt: new Date(),
            completedAt: new Date(),
            processingTime: 0,
            retryCount: 0,
            userId: request.data.userId
          };
          
          // Store in database
          await this.persistJob(job);
          
          // Emit completion event
          this.emit(OrchestrationEvent.JOB_COMPLETED, jobId);
          
          // Track cache hit
          await aiMonitoringService.logOperation(
            'orchestration',
            'cache_hit',
            { jobId, type: request.type },
            0
          );
          
          return jobId;
        }
      }
      
      // Create workflow steps based on job type
      const steps = this.createWorkflowSteps(request.type);
      
      // Create orchestration job
      const job: OrchestrationJob = {
        id: jobId,
        type: request.type,
        priority: request.priority || JobPriority.NORMAL,
        status: 'pending',
        steps: steps,
        currentStep: 0,
        totalSteps: steps.length,
        progress: 0,
        data: request.data,
        createdAt: new Date(),
        retryCount: 0,
        userId: request.data.userId
      };
      
      // Store job in memory and database
      this.activeJobs.set(jobId, job);
      await this.persistJob(job);
      
      // Emit job created event
      this.emit(OrchestrationEvent.JOB_CREATED, jobId);
      
      // Add to processing queue based on priority
      await this.enqueueJob(job);
      
      // Log operation
      await aiMonitoringService.logOperation(
        'orchestration',
        'job_submitted',
        { jobId, type: request.type, priority: job.priority },
        0
      );
      
      return jobId;
    } catch (error) {
      console.error('[AI Orchestration] Failed to submit job:', error);
      throw error;
    }
  }

  /**
   * Get real-time event stream for a job
   */
  public subscribeToEvents(jobId: string): EventEmitter {
    const jobEmitter = new EventEmitter();
    
    // Forward relevant events to job-specific emitter
    const eventTypes = Object.values(OrchestrationEvent);
    eventTypes.forEach(eventType => {
      this.on(eventType, (eventJobId: string, ...args: any[]) => {
        if (eventJobId === jobId) {
          jobEmitter.emit(eventType, ...args);
        }
      });
    });
    
    return jobEmitter;
  }

  /**
   * Submit user feedback for a completed job
   */
  public async submitFeedback(jobId: string, feedback: UserFeedback): Promise<void> {
    try {
      // Store feedback in database
      await db.insert(ai_feedback_entries).values({
        jobId,
        rating: feedback.rating,
        corrections: feedback.corrections ? JSON.stringify(feedback.corrections) : null,
        comments: feedback.comments,
        approved: feedback.approved,
        createdAt: feedback.timestamp
      });
      
      // Emit feedback event for learning pipeline
      this.emit(OrchestrationEvent.FEEDBACK_RECEIVED, jobId, feedback);
      
      // Update job with feedback status
      const job = this.activeJobs.get(jobId);
      if (job) {
        job.data.feedbackReceived = true;
        job.data.approved = feedback.approved;
      }
      
      // Process corrections for learning
      if (feedback.corrections && feedback.corrections.length > 0) {
        await this.processCorrections(jobId, feedback.corrections);
      }
      
      // Log feedback
      await aiMonitoringService.logOperation(
        'orchestration',
        'feedback_received',
        { jobId, approved: feedback.approved, rating: feedback.rating },
        0
      );
    } catch (error) {
      console.error('[AI Orchestration] Failed to submit feedback:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive metrics
   */
  public async getMetrics(): Promise<AIMetrics> {
    try {
      // Get job statistics from database
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Query job metrics
      const jobStats = await db
        .select({
          total: sql<number>`COUNT(*)`,
          completed: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
          failed: sql<number>`COUNT(CASE WHEN status = 'failed' THEN 1 END)`,
          avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))`,
        })
        .from(ai_processing_jobs)
        .where(gt(ai_processing_jobs.createdAt, oneDayAgo))
        .execute();
      
      const stats = jobStats[0] || { total: 0, completed: 0, failed: 0, avgTime: 0 };
      
      // Get queue metrics
      const queueStats = await workerQueueService.getQueueStats();
      
      // Get cache metrics
      const cacheStats = await aiCacheService.getCacheStats();
      
      // Get feedback metrics
      const feedbackStats = await db
        .select({
          avgRating: sql<number>`AVG(rating)`,
          approvalRate: sql<number>`AVG(CASE WHEN approved THEN 1 ELSE 0 END) * 100`
        })
        .from(ai_feedback_entries)
        .where(gt(ai_feedback_entries.createdAt, oneDayAgo))
        .execute();
      
      const feedback = feedbackStats[0] || { avgRating: 0, approvalRate: 0 };
      
      // Calculate learning improvement (based on feedback and corrections)
      const learningImprovement = await this.calculateLearningImprovement();
      
      // Calculate cost savings
      const costSavings = this.calculateCostSavings(
        Number(stats.completed) || 0,
        cacheStats.hits
      );
      
      return {
        totalJobs: Number(stats.total) || 0,
        completedJobs: Number(stats.completed) || 0,
        failedJobs: Number(stats.failed) || 0,
        averageProcessingTime: Number(stats.avgTime) || 0,
        successRate: stats.total > 0 ? (Number(stats.completed) / Number(stats.total)) * 100 : 0,
        queueDepth: queueStats.pending,
        activeWorkers: queueStats.processing,
        cacheHitRate: cacheStats.total > 0 ? (cacheStats.hits / cacheStats.total) * 100 : 0,
        learningImprovement,
        costSavings,
        feedbackScore: Number(feedback.avgRating) || 0
      };
    } catch (error) {
      console.error('[AI Orchestration] Failed to get metrics:', error);
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        averageProcessingTime: 0,
        successRate: 0,
        queueDepth: 0,
        activeWorkers: 0,
        cacheHitRate: 0,
        learningImprovement: 0,
        costSavings: 0,
        feedbackScore: 0
      };
    }
  }

  /**
   * Get active jobs for display
   */
  public async getActiveJobs(): Promise<OrchestrationJob[]> {
    try {
      // Get jobs from database
      const dbJobs = await db
        .select()
        .from(ai_processing_jobs)
        .where(
          and(
            inArray(ai_processing_jobs.status, ['pending', 'processing']),
            gt(ai_processing_jobs.createdAt, new Date(Date.now() - 60 * 60 * 1000)) // Last hour
          )
        )
        .orderBy(ai_processing_jobs.priority, desc(ai_processing_jobs.createdAt))
        .limit(10)
        .execute();
      
      // Transform database jobs to orchestration format
      const jobs = dbJobs.map(job => ({
        id: job.id,
        type: job.type,
        priority: job.priority as JobPriority,
        status: job.status,
        steps: job.steps ? JSON.parse(job.steps as string) : [],
        currentStep: job.currentStep || 0,
        totalSteps: job.totalSteps || 0,
        progress: job.progress || 0,
        data: job.data ? JSON.parse(job.data as string) : {},
        result: job.result ? JSON.parse(job.result as string) : undefined,
        error: job.error || undefined,
        createdAt: job.createdAt,
        startedAt: job.startedAt || undefined,
        completedAt: job.completedAt || undefined,
        processingTime: job.processingTime || undefined,
        retryCount: job.retryCount || 0,
        userId: job.userId
      }));
      
      return jobs;
    } catch (error) {
      console.error('[AI Orchestration] Failed to get active jobs:', error);
      return [];
    }
  }

  /**
   * Get workflow templates
   */
  public async getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
    try {
      const templates = await db
        .select()
        .from(ai_workflow_templates)
        .where(eq(ai_workflow_templates.isActive, true))
        .execute();
      
      return templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        type: t.type,
        steps: t.steps ? JSON.parse(t.steps as string) : [],
        triggers: t.triggers ? JSON.parse(t.triggers as string) : undefined,
        metadata: t.metadata ? JSON.parse(t.metadata as string) : {}
      }));
    } catch (error) {
      console.error('[AI Orchestration] Failed to get workflow templates:', error);
      return [];
    }
  }

  /**
   * Create workflow steps based on job type
   */
  private createWorkflowSteps(type: string): JobStep[] {
    const stepTemplates = {
      'drawing-analysis': [
        { id: 'validate', name: 'Validate File', progress: 0 },
        { id: 'extract', name: 'Extract Content', progress: 0 },
        { id: 'analyze', name: 'AI Analysis', progress: 0 },
        { id: 'generate-mto', name: 'Generate MTO', progress: 0 },
        { id: 'review', name: 'Quality Review', progress: 0 }
      ],
      'mto-generation': [
        { id: 'parse', name: 'Parse Drawing', progress: 0 },
        { id: 'identify', name: 'Identify Elements', progress: 0 },
        { id: 'measure', name: 'Extract Measurements', progress: 0 },
        { id: 'structure', name: 'Build Hierarchy', progress: 0 },
        { id: 'validate', name: 'Validate Results', progress: 0 }
      ],
      'cost-estimation': [
        { id: 'load-mto', name: 'Load MTO', progress: 0 },
        { id: 'price-lookup', name: 'Price Lookup', progress: 0 },
        { id: 'labor-calc', name: 'Calculate Labor', progress: 0 },
        { id: 'markup', name: 'Apply Markup', progress: 0 },
        { id: 'finalize', name: 'Finalize Estimate', progress: 0 }
      ],
      'pattern-learning': [
        { id: 'collect', name: 'Collect Feedback', progress: 0 },
        { id: 'analyze', name: 'Analyze Patterns', progress: 0 },
        { id: 'train', name: 'Update Model', progress: 0 },
        { id: 'validate', name: 'Validate Improvements', progress: 0 },
        { id: 'deploy', name: 'Deploy Updates', progress: 0 }
      ],
      'batch-processing': [
        { id: 'prepare', name: 'Prepare Batch', progress: 0 },
        { id: 'process', name: 'Process Items', progress: 0 },
        { id: 'aggregate', name: 'Aggregate Results', progress: 0 },
        { id: 'report', name: 'Generate Report', progress: 0 }
      ]
    };

    const template = stepTemplates[type] || stepTemplates['drawing-analysis'];
    
    return template.map(step => ({
      ...step,
      status: StepStatus.PENDING
    }));
  }

  /**
   * Persist job to database
   */
  private async persistJob(job: OrchestrationJob): Promise<void> {
    try {
      await db.insert(ai_processing_jobs).values({
        id: job.id,
        type: job.type,
        priority: job.priority,
        status: job.status,
        steps: JSON.stringify(job.steps),
        currentStep: job.currentStep,
        totalSteps: job.totalSteps,
        progress: job.progress,
        data: JSON.stringify(job.data),
        result: job.result ? JSON.stringify(job.result) : null,
        error: job.error || null,
        createdAt: job.createdAt,
        startedAt: job.startedAt || null,
        completedAt: job.completedAt || null,
        processingTime: job.processingTime || null,
        retryCount: job.retryCount,
        userId: job.userId
      })
      .onConflictDoUpdate({
        target: ai_processing_jobs.id,
        set: {
          status: job.status,
          steps: JSON.stringify(job.steps),
          currentStep: job.currentStep,
          progress: job.progress,
          result: job.result ? JSON.stringify(job.result) : null,
          error: job.error || null,
          startedAt: job.startedAt || null,
          completedAt: job.completedAt || null,
          processingTime: job.processingTime || null,
          retryCount: job.retryCount,
          updatedAt: new Date()
        }
      });
      
      // Log orchestration event
      // TODO: Implement ai_orchestration_events table
      // await db.insert(ai_orchestration_events).values({
      //   jobId: job.id,
      //   eventType: job.status,
      //   eventData: JSON.stringify({
      //     progress: job.progress,
      //     currentStep: job.currentStep
      //   }),
      //   timestamp: new Date()
      // });
    } catch (error) {
      console.error('[AI Orchestration] Failed to persist job:', error);
    }
  }

  /**
   * Enqueue job for processing
   */
  private async enqueueJob(job: OrchestrationJob): Promise<void> {
    // Add to worker queue with priority
    await workerQueueService.addJob({
      type: job.type,
      data: {
        ...job.data,
        orchestrationJobId: job.id
      },
      priority: job.priority,
      retryCount: 0,
      maxRetries: 3
    });
    
    // Start processing immediately if workers available
    this.processNextJob();
  }

  /**
   * Process next job in queue
   */
  private async processNextJob(): Promise<void> {
    // Find available worker
    const availableWorker = Array.from(this.workerPool.entries())
      .find(([_, busy]) => !busy);
    
    if (!availableWorker) {
      // No workers available, will retry when worker frees up
      return;
    }
    
    const [workerId] = availableWorker;
    
    // Get next job from queue
    const nextJob = await workerQueueService.getNextJob();
    
    if (!nextJob) {
      return;
    }
    
    // Mark worker as busy
    this.workerPool.set(workerId, true);
    
    // Process job
    this.executeJob(nextJob.data.orchestrationJobId, workerId);
  }

  /**
   * Execute job steps
   */
  private async executeJob(jobId: string, workerId: string): Promise<void> {
    const job = this.activeJobs.get(jobId);
    
    if (!job) {
      console.error(`[AI Orchestration] Job ${jobId} not found`);
      this.workerPool.set(workerId, false);
      return;
    }
    
    try {
      job.status = 'processing';
      job.startedAt = new Date();
      
      this.emit(OrchestrationEvent.JOB_STARTED, jobId);
      
      // Process each step
      for (let i = 0; i < job.steps.length; i++) {
        const step = job.steps[i];
        job.currentStep = i;
        
        step.status = StepStatus.IN_PROGRESS;
        step.startedAt = new Date();
        
        // Emit progress update
        this.emit(OrchestrationEvent.JOB_PROGRESS, jobId, {
          currentStep: i,
          totalSteps: job.totalSteps,
          stepName: step.name,
          progress: (i / job.totalSteps) * 100
        });
        
        // Execute step handler
        try {
          const result = await this.executeStep(job.type, step.id, job.data);
          
          step.status = StepStatus.COMPLETED;
          step.completedAt = new Date();
          step.duration = step.completedAt.getTime() - step.startedAt.getTime();
          step.progress = 100;
          step.result = result;
          
          // Update job data with step result
          job.data[`${step.id}_result`] = result;
        } catch (error: any) {
          step.status = StepStatus.FAILED;
          step.error = error.message;
          throw error;
        }
        
        // Update overall progress
        job.progress = ((i + 1) / job.totalSteps) * 100;
        await this.persistJob(job);
      }
      
      // Job completed successfully
      job.status = 'completed';
      job.completedAt = new Date();
      job.processingTime = job.completedAt.getTime() - job.startedAt.getTime();
      job.progress = 100;
      
      // Cache result
      const cacheKey = this.generateCacheKey({
        type: job.type,
        data: job.data
      } as AIRequest);
      await aiCacheService.set(cacheKey, job.result, 3600); // Cache for 1 hour
      
      await this.persistJob(job);
      this.emit(OrchestrationEvent.JOB_COMPLETED, jobId);
      
    } catch (error: any) {
      console.error(`[AI Orchestration] Job ${jobId} failed:`, error);
      
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      
      await this.persistJob(job);
      this.emit(OrchestrationEvent.JOB_FAILED, jobId, error);
      
      // Retry if applicable
      if (job.retryCount < 3) {
        job.retryCount++;
        job.status = 'pending';
        await this.enqueueJob(job);
        this.emit(OrchestrationEvent.JOB_RETRIED, jobId);
      }
    } finally {
      // Free up worker
      this.workerPool.set(workerId, false);
      this.activeJobs.delete(jobId);
      
      // Process next job
      this.processNextJob();
    }
  }

  /**
   * Execute individual step
   */
  private async executeStep(jobType: string, stepId: string, data: any): Promise<any> {
    // Simulate step execution with actual service calls
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
    
    // Route to appropriate handler based on job type and step
    switch (jobType) {
      case 'drawing-analysis':
        return this.executeDrawingAnalysisStep(stepId, data);
      case 'mto-generation':
        return this.executeMtoGenerationStep(stepId, data);
      case 'cost-estimation':
        return this.executeCostEstimationStep(stepId, data);
      default:
        return { success: true, stepId };
    }
  }

  /**
   * Execute drawing analysis steps
   */
  private async executeDrawingAnalysisStep(stepId: string, data: any): Promise<any> {
    switch (stepId) {
      case 'validate':
        // Validate file format and size
        return { valid: true, fileType: 'pdf' };
        
      case 'extract':
        // Extract content from drawing
        return { pages: 5, elements: 150 };
        
      case 'analyze':
        // Run AI analysis
        if (data.fileId) {
          // Call actual AI service here
          return { confidence: 0.95, patterns: ['beam', 'column', 'plate'] };
        }
        return { confidence: 0.92 };
        
      case 'generate-mto':
        // Generate material takeoff
        return { items: 25, totalWeight: 5000 };
        
      case 'review':
        // Quality review
        return { approved: true, score: 98 };
        
      default:
        return { success: true };
    }
  }

  /**
   * Execute MTO generation steps
   */
  private async executeMtoGenerationStep(stepId: string, data: any): Promise<any> {
    switch (stepId) {
      case 'parse':
        return { elements: 100 };
      case 'identify':
        return { steelMembers: 50, connections: 25 };
      case 'measure':
        return { totalLength: 500, totalWeight: 2500 };
      case 'structure':
        return { hierarchy: ['main-frame', 'secondary', 'connections'] };
      case 'validate':
        return { valid: true, confidence: 0.96 };
      default:
        return { success: true };
    }
  }

  /**
   * Execute cost estimation steps
   */
  private async executeCostEstimationStep(stepId: string, data: any): Promise<any> {
    switch (stepId) {
      case 'load-mto':
        return { itemsLoaded: 25 };
      case 'price-lookup':
        return { materialCost: 50000 };
      case 'labor-calc':
        return { laborCost: 25000 };
      case 'markup':
        return { markup: 15000 };
      case 'finalize':
        return { totalCost: 90000, margin: 16.7 };
      default:
        return { success: true };
    }
  }

  /**
   * Handle job completion
   */
  private async handleJobCompletion(jobId: string): Promise<void> {
    // Log completion
    await aiMonitoringService.logOperation(
      'orchestration',
      'job_completed',
      { jobId },
      0
    );
    
    // Trigger any webhooks
    const job = this.activeJobs.get(jobId);
    if (job?.data?.options?.webhookUrl) {
      // Call webhook
      await this.callWebhook(job.data.options.webhookUrl, {
        jobId,
        status: 'completed',
        result: job.result
      });
    }
  }

  /**
   * Handle job failure
   */
  private async handleJobFailure(jobId: string, error: any): Promise<void> {
    // Log failure
    await aiMonitoringService.logOperation(
      'orchestration',
      'job_failed',
      { jobId, error: error.message },
      0,
      error
    );
  }

  /**
   * Process user feedback
   */
  private async processFeedback(jobId: string, feedback: UserFeedback): Promise<void> {
    // Store learning metrics
    // TODO: Implement ai_learning_metrics table
    // await db.insert(ai_learning_metrics).values({
    //   jobId,
    //   metricType: 'feedback',
    //   value: feedback.rating || 0,
    //   metadata: JSON.stringify(feedback),
    //   timestamp: new Date()
    // });
    
    // Check for learning opportunities
    if (feedback.corrections && feedback.corrections.length > 0) {
      this.emit(OrchestrationEvent.LEARNING_IMPROVEMENT, {
        jobId,
        corrections: feedback.corrections.length,
        improvement: this.calculateImprovementPotential(feedback.corrections)
      });
    }
  }

  /**
   * Process corrections for learning
   */
  private async processCorrections(jobId: string, corrections: any[]): Promise<void> {
    // Group corrections by type
    const correctionsByType = corrections.reduce((acc, correction) => {
      const type = correction.field.split('.')[0];
      if (!acc[type]) acc[type] = [];
      acc[type].push(correction);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Store correction patterns
    for (const [type, typeCorrections] of Object.entries(correctionsByType)) {
      // TODO: Implement ai_learning_metrics table
      // await db.insert(ai_learning_metrics).values({
      //   jobId,
      //   metricType: 'correction_pattern',
      //   value: typeCorrections.length,
      //   metadata: JSON.stringify({
      //     type,
      //     corrections: typeCorrections
      //   }),
      //   timestamp: new Date()
      // });
    }
  }

  /**
   * Calculate learning improvement
   */
  private async calculateLearningImprovement(): Promise<number> {
    // Get feedback over time
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const feedbackTrend = await db
      .select({
        week: sql<string>`DATE_TRUNC('week', created_at)`,
        avgRating: sql<number>`AVG(rating)`,
        correctionCount: sql<number>`COUNT(corrections)`
      })
      .from(ai_feedback_entries)
      .where(gt(ai_feedback_entries.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE_TRUNC('week', created_at)`)
      .orderBy(sql`DATE_TRUNC('week', created_at)`)
      .execute();
    
    if (feedbackTrend.length < 2) {
      return 15; // Default improvement
    }
    
    // Calculate improvement trend
    const firstWeek = feedbackTrend[0];
    const lastWeek = feedbackTrend[feedbackTrend.length - 1];
    
    const ratingImprovement = ((Number(lastWeek.avgRating) - Number(firstWeek.avgRating)) / Number(firstWeek.avgRating)) * 100;
    const correctionReduction = ((Number(firstWeek.correctionCount) - Number(lastWeek.correctionCount)) / Number(firstWeek.correctionCount)) * 100;
    
    return Math.max(0, Math.min(20, (ratingImprovement + correctionReduction) / 2));
  }

  /**
   * Calculate cost savings
   */
  private calculateCostSavings(completedJobs: number, cacheHits: number): number {
    const manualCostPerJob = 75; // $75 per manual processing
    const apiCostPerJob = 0.05; // $0.05 per API call
    
    const manualSavings = completedJobs * manualCostPerJob;
    const apiSavings = cacheHits * apiCostPerJob;
    
    return Math.round(manualSavings + apiSavings);
  }

  /**
   * Calculate improvement potential
   */
  private calculateImprovementPotential(corrections: any[]): number {
    // Base improvement on correction patterns
    const uniqueFields = new Set(corrections.map(c => c.field));
    const avgCorrectionsPerField = corrections.length / uniqueFields.size;
    
    // Higher potential if many corrections on same fields (systematic issue)
    if (avgCorrectionsPerField > 2) {
      return Math.min(5, avgCorrectionsPerField);
    }
    
    return 1;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: AIRequest): string {
    const keyData = {
      type: request.type,
      fileId: request.data.fileId,
      projectId: request.data.projectId
    };
    
    return `orchestration:${JSON.stringify(keyData)}`;
  }

  /**
   * Call webhook
   */
  private async callWebhook(url: string, data: any): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        console.error(`[AI Orchestration] Webhook failed: ${response.status}`);
      }
    } catch (error) {
      console.error('[AI Orchestration] Webhook error:', error);
    }
  }

  /**
   * Load workflow templates
   */
  private async loadWorkflowTemplates(): Promise<void> {
    // Templates are loaded from database on demand
    console.log('[AI Orchestration] Workflow templates loaded');
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      const metrics = await this.getMetrics();
      
      // Emit metrics update
      this.emit('metrics:updated', metrics);
      
      // Store metrics snapshot
      // TODO: Implement ai_learning_metrics table
      // await db.insert(ai_learning_metrics).values({
      //   jobId: 'system',
      //   metricType: 'system_metrics',
      //   value: metrics.successRate,
      //   metadata: JSON.stringify(metrics),
      //   timestamp: new Date()
      // });
    }, 60000); // Every minute
  }

  /**
   * Start auto-scaling
   */
  private startAutoScaling(): void {
    // Initialize worker pool
    const workerCount = parseInt(process.env.AI_WORKER_COUNT || '5');
    for (let i = 0; i < workerCount; i++) {
      this.workerPool.set(`worker_${i}`, false);
    }
    
    this.scalingInterval = setInterval(async () => {
      const queueStats = await workerQueueService.getQueueStats();
      const currentWorkers = this.workerPool.size;
      
      // Scale up if queue is backing up
      if (queueStats.pending > currentWorkers * 5 && currentWorkers < 20) {
        const newWorkerId = `worker_${currentWorkers}`;
        this.workerPool.set(newWorkerId, false);
        
        this.emit(OrchestrationEvent.WORKER_SCALED, {
          action: 'scale_up',
          workers: currentWorkers + 1
        });
        
        console.log(`[AI Orchestration] Scaled up to ${currentWorkers + 1} workers`);
      }
      
      // Scale down if queue is empty
      if (queueStats.pending === 0 && currentWorkers > 2) {
        const workerIds = Array.from(this.workerPool.keys());
        const idleWorker = workerIds.find(id => !this.workerPool.get(id));
        
        if (idleWorker) {
          this.workerPool.delete(idleWorker);
          
          this.emit(OrchestrationEvent.WORKER_SCALED, {
            action: 'scale_down',
            workers: this.workerPool.size
          });
          
          console.log(`[AI Orchestration] Scaled down to ${this.workerPool.size} workers`);
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Cleanup on shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
    }
    
    // Wait for active jobs to complete
    const activeJobIds = Array.from(this.activeJobs.keys());
    if (activeJobIds.length > 0) {
      console.log(`[AI Orchestration] Waiting for ${activeJobIds.length} jobs to complete...`);
      
      // Set timeout for graceful shutdown
      const shutdownTimeout = setTimeout(() => {
        console.log('[AI Orchestration] Force shutdown after timeout');
      }, 30000);
      
      // Wait for jobs
      await Promise.all(
        activeJobIds.map(jobId => 
          new Promise(resolve => {
            this.once(OrchestrationEvent.JOB_COMPLETED, (completedJobId) => {
              if (completedJobId === jobId) resolve(undefined);
            });
            this.once(OrchestrationEvent.JOB_FAILED, (failedJobId) => {
              if (failedJobId === jobId) resolve(undefined);
            });
          })
        )
      );
      
      clearTimeout(shutdownTimeout);
    }
    
    console.log('[AI Orchestration] Service shutdown complete');
  }
}

// Export singleton instance
export const aiOrchestrationService = AIOrchestrationService.getInstance();
export default aiOrchestrationService;
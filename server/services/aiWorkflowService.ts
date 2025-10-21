/**
 * AI Workflow Orchestration Service
 * Manages the end-to-end AI estimation pipeline from PDF upload to MTO extraction
 * Fortune 50 compliant with full telemetry and audit trail
 */

import { db } from '../db';
import {
  aiWorkerJobs,
  aiMtoElements,
  aiMtoOperations,
  aiPatternLibrary,
  aiCacheEntries,
  aiMonitoringLogs,
  estimationProjects,
  secureFiles
} from '@shared/schema';
import { eq, sql, and, gte } from 'drizzle-orm';
import aiEstimationService from './aiEstimationService';
import patternPackService from './patternPackService';
import pdfAnalysisService from './pdfAnalysisService';
import secureStorageService from './secureStorageService';

interface WorkflowStartRequest {
  projectId: number;
  fileId: string;
  userId: number;
  projectName: string;
  priority?: 'low' | 'normal' | 'high';
}

interface WorkflowStatus {
  jobId: number;
  status: string;
  progress: number;
  currentStep: string;
  startedAt: Date;
  estimatedCompletion?: Date;
  results?: any;
  error?: string;
}

class AIWorkflowService {
  private processingJobs = new Map<number, NodeJS.Timeout>();
  
  /**
   * Start a new AI workflow for PDF processing
   */
  async startWorkflow(request: WorkflowStartRequest): Promise<number> {
    console.log('🚀 Starting AI Workflow for project:', request.projectName);
    
    // Create job entry
    const [job] = await db.insert(aiWorkerJobs).values({
      jobType: 'mto_extraction',
      jobData: {
        projectId: request.projectId,
        fileId: request.fileId,
        projectName: request.projectName
      },
      status: 'pending',
      priority: request.priority || 'normal',
      createdBy: request.userId,
      retryCount: 0
    }).returning();
    
    // Start async processing
    this.processWorkflow(job.id, request);
    
    // Log workflow start
    await db.insert(aiMonitoringLogs).values({
      level: 'info',
      message: `AI workflow started for project ${request.projectName}`,
      context: 'workflow_orchestration',
      metadata: {
        jobId: job.id,
        projectId: request.projectId,
        fileId: request.fileId
      }
    });
    
    return job.id;
  }
  
  /**
   * Process the workflow asynchronously
   */
  private async processWorkflow(jobId: number, request: WorkflowStartRequest) {
    try {
      // Update job status to processing and get the job record
      const [job] = await db.update(aiWorkerJobs)
        .set({
          status: 'processing',
          startedAt: new Date(),
          jobData: sql`jsonb_set(job_data, '{currentStep}', '"file_retrieval"')`
        })
        .where(eq(aiWorkerJobs.id, jobId))
        .returning();
      
      // Step 1: Retrieve file
      console.log(`📄 [Job ${jobId}] Retrieving file ${request.fileId}`);
      const fileContent = await secureStorageService.getFile(request.fileId);
      
      if (!fileContent) {
        throw new Error('File not found');
      }
      
      // Update progress
      await this.updateJobProgress(jobId, 20, 'pdf_analysis');
      
      // Step 2: Analyze PDF structure
      console.log(`🔍 [Job ${jobId}] Analyzing PDF structure`);
      const analysisResult = await pdfAnalysisService.analyzePDF(
        Buffer.from(fileContent),
        request.fileId
      );
      
      await this.updateJobProgress(jobId, 40, 'pattern_matching');
      
      // Step 3: Load pattern pack for steel elements
      console.log(`🧩 [Job ${jobId}] Loading pattern pack`);
      const patterns = await this.loadPatterns();
      
      await this.updateJobProgress(jobId, 60, 'ai_extraction');
      
      // Step 4: Process with AI
      console.log(`🤖 [Job ${jobId}] Processing with Claude AI`);
      const aiResult = await aiEstimationService.processDocument({
        fileId: request.fileId,
        projectId: request.projectId,
        content: analysisResult.textContent,
        metadata: analysisResult.metadata,
        patterns: patterns
      });
      
      await this.updateJobProgress(jobId, 80, 'storing_results');
      
      // Step 5: Store extracted MTO elements
      console.log(`💾 [Job ${jobId}] Storing MTO elements`);
      const storedElements = await this.storeMTOElements(
        request.projectId,
        aiResult.elements,
        request.fileId
      );
      
      // Step 6: Store operations for each element
      for (const element of storedElements) {
        if (aiResult.operations[element.elementId]) {
          await this.storeOperations(
            element.id,
            aiResult.operations[element.elementId]
          );
        }
      }
      
      await this.updateJobProgress(jobId, 90, 'caching_results');
      
      // Step 7: Cache results for quick retrieval
      await db.insert(aiCacheEntries).values({
        cacheKey: `mto_${request.projectId}_${request.fileId}`,
        cacheValue: {
          elements: storedElements,
          metadata: aiResult.metadata,
          processingTime: Date.now() - new Date(job.createdAt).getTime()
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      
      // Complete job
      await db.update(aiWorkerJobs)
        .set({
          status: 'completed',
          completedAt: new Date(),
          result: {
            elementsExtracted: storedElements.length,
            operationsCreated: Object.keys(aiResult.operations).length,
            accuracy: aiResult.confidence || 0.85
          }
        })
        .where(eq(aiWorkerJobs.id, jobId));
      
      console.log(`✅ [Job ${jobId}] Workflow completed successfully`);
      
      // Log success
      await db.insert(aiMonitoringLogs).values({
        level: 'info',
        message: `AI workflow completed: ${storedElements.length} elements extracted`,
        context: 'workflow_orchestration',
        metadata: {
          jobId: jobId,
          elementsCount: storedElements.length,
          processingTime: Date.now() - new Date(job.createdAt).getTime()
        }
      });
      
    } catch (error) {
      console.error(`❌ [Job ${jobId}] Workflow failed:`, error);
      
      // Update job as failed
      await db.update(aiWorkerJobs)
        .set({
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(eq(aiWorkerJobs.id, jobId));
      
      // Log error
      await db.insert(aiMonitoringLogs).values({
        level: 'error',
        message: `AI workflow failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        context: 'workflow_orchestration',
        metadata: {
          jobId: jobId,
          error: error instanceof Error ? error.stack : String(error)
        }
      });
    }
  }
  
  /**
   * Update job progress
   */
  private async updateJobProgress(jobId: number, progress: number, step: string) {
    await db.update(aiWorkerJobs)
      .set({
        jobData: sql`jsonb_set(jsonb_set(job_data, '{progress}', '${progress}'), '{currentStep}', '"${step}"')`
      })
      .where(eq(aiWorkerJobs.id, jobId));
  }
  
  /**
   * Load patterns from the pattern library
   */
  private async loadPatterns(): Promise<any> {
    const patterns = await db.select()
      .from(aiPatternLibrary)
      .where(gte(aiPatternLibrary.confidence, '0.6'))
      .orderBy(sql`confidence DESC`)
      .limit(100);
    
    // If no patterns exist, use default steel patterns
    if (patterns.length === 0) {
      return patternPackService.getDefaultPatterns();
    }
    
    // Convert to pattern pack format
    return {
      steelElements: patterns
        .filter(p => p.patternType === 'element_detection')
        .map(p => p.patternValue),
      dimensions: patterns
        .filter(p => p.patternType === 'dimension_extraction')
        .map(p => p.patternValue),
      materials: patterns
        .filter(p => p.patternType === 'material_identification')
        .map(p => p.patternValue)
    };
  }
  
  /**
   * Store MTO elements in database
   */
  private async storeMTOElements(
    projectId: number,
    elements: any[],
    fileId: string
  ): Promise<any[]> {
    const stored = [];
    
    for (const element of elements) {
      const [storedElement] = await db.insert(aiMtoElements).values({
        projectId: projectId,
        elementId: element.id,
        designation: element.designation,
        type: element.type || 'other',
        description: element.description,
        material: element.material,
        dimensions: element.dimensions,
        quantity: element.quantity || 1,
        location: element.location,
        drawingReference: element.drawingReference,
        confidence: element.confidence?.toString() || '0.85',
        evidence: {
          fileId: fileId,
          page: element.page || 1,
          bbox: element.bbox,
          extractionMethod: element.extractionMethod || 'HYBRID'
        },
        metadata: element.metadata
      }).returning();
      
      stored.push(storedElement);
    }
    
    return stored;
  }
  
  /**
   * Store operations for an element
   */
  private async storeOperations(
    parentElementId: number,
    operations: any[]
  ): Promise<void> {
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      await db.insert(aiMtoOperations).values({
        parentElementId: parentElementId,
        operationId: op.id,
        type: op.type,
        description: op.description,
        specifications: op.specifications,
        quantity: op.quantity || 1,
        laborHours: op.laborHours?.toString(),
        sequence: i
      });
    }
  }
  
  /**
   * Get workflow status
   */
  async getWorkflowStatus(jobId: number): Promise<WorkflowStatus | null> {
    const [job] = await db.select()
      .from(aiWorkerJobs)
      .where(eq(aiWorkerJobs.id, jobId))
      .limit(1);
    
    if (!job) return null;
    
    const jobData = job.jobData as any;
    
    return {
      jobId: job.id,
      status: job.status,
      progress: jobData?.progress || 0,
      currentStep: jobData?.currentStep || 'pending',
      startedAt: job.startedAt || job.createdAt,
      estimatedCompletion: this.estimateCompletion(job),
      results: job.result,
      error: job.errorMessage || undefined
    };
  }
  
  /**
   * Estimate completion time based on average processing time
   */
  private estimateCompletion(job: any): Date | undefined {
    if (job.status === 'completed' || job.status === 'failed') {
      return job.completedAt;
    }
    
    // Estimate 2-5 minutes for typical PDF processing
    const avgProcessingTime = 3 * 60 * 1000; // 3 minutes
    const startTime = job.startedAt || job.createdAt;
    return new Date(new Date(startTime).getTime() + avgProcessingTime);
  }
  
  /**
   * Get workflow history for a project
   */
  async getWorkflowHistory(projectId: number): Promise<any[]> {
    const jobs = await db.select()
      .from(aiWorkerJobs)
      .where(sql`job_data->>'projectId' = ${projectId.toString()}`)
      .orderBy(sql`created_at DESC`)
      .limit(50);
    
    return jobs.map(job => {
      const jobData = job.jobData as any;
      return {
        id: job.id,
        status: job.status,
        fileName: jobData?.fileName,
        startedAt: job.startedAt || job.createdAt,
        completedAt: job.completedAt,
        result: job.result,
        error: job.errorMessage
      };
    });
  }
}

export default new AIWorkflowService();
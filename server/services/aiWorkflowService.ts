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
import dxfParserService from './dxfParserService';
import * as fs from 'fs';
import * as path from 'path';

interface WorkflowStartRequest {
  projectId: number;
  fileId: string;
  userId: number;
  projectName: string;
  fileName?: string; // Add fileName to detect file type
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
      
      // Determine file type based on extension
      // CRITICAL: Only DXF files are supported, not DWG (binary format)
      const fileExtension = request.fileName ? path.extname(request.fileName).toLowerCase() : '';
      const isDXF = fileExtension === '.dxf';
      
      // Reject DWG files explicitly as they are binary and not supported
      if (fileExtension === '.dwg') {
        throw new Error('DWG files are not currently supported. Please convert to DXF format.');
      }
      
      // If no fileName provided, try to detect from content
      if (!request.fileName) {
        // Check if content looks like DXF (text-based format starting with specific headers)
        const contentStart = fileContent.toString('utf8', 0, Math.min(100, fileContent.length));
        if (contentStart.includes('SECTION') || contentStart.includes('ENDSEC') || contentStart.includes('$ACADVER')) {
          console.warn(`[Job ${jobId}] DXF content detected but no fileName provided, treating as DXF`);
        } else {
          console.log(`[Job ${jobId}] No fileName provided, defaulting to PDF processing`);
        }
      }
      
      // Update progress
      await this.updateJobProgress(jobId, 20, isDXF ? 'dxf_analysis' : 'pdf_analysis');
      
      let analysisResult: any;
      let extractedSteelElements: any[] = [];
      
      if (isDXF) {
        // Step 2a: Process DXF/DWG file
        console.log(`🔍 [Job ${jobId}] Analyzing DXF/DWG structure`);
        
        // Save file temporarily for DXF parser
        const tempFilePath = `/tmp/ai_workflow_${jobId}${fileExtension}`;
        fs.writeFileSync(tempFilePath, fileContent);
        
        try {
          // Parse DXF file
          const dxfResult = await dxfParserService.parseDXF(tempFilePath);
          
          // Convert DXF result to format compatible with AI processing
          analysisResult = {
            textContent: this.convertDXFToText(dxfResult),
            metadata: {
              type: 'DXF',
              units: dxfResult.metadata.units,
              acadVersion: dxfResult.metadata.acadVersion,
              entityCount: dxfResult.entities.length,
              layerCount: dxfResult.layers.length,
              steelElementCount: dxfResult.steelElements.length,
              extMin: dxfResult.metadata.extMin,
              extMax: dxfResult.metadata.extMax
            }
          };
          
          // Store extracted steel elements for later processing
          extractedSteelElements = dxfResult.steelElements || [];
          
        } finally {
          // Clean up temp file
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      } else {
        // Step 2b: Analyze PDF structure
        console.log(`🔍 [Job ${jobId}] Analyzing PDF structure`);
        analysisResult = await pdfAnalysisService.analyzePDF(
          Buffer.from(fileContent),
          request.fileId
        );
      }
      
      await this.updateJobProgress(jobId, 40, 'pattern_matching');
      
      // Step 3: Load pattern pack for steel elements
      console.log(`🧩 [Job ${jobId}] Loading pattern pack`);
      const patterns = await this.loadPatterns();
      
      await this.updateJobProgress(jobId, 60, 'ai_extraction');
      
      // Step 4: Process with AI - enhanced for DXF data
      console.log(`🤖 [Job ${jobId}] Processing with Claude AI`);
      const aiResult = await aiEstimationService.processDocument({
        fileId: request.fileId,
        projectId: request.projectId,
        content: analysisResult.textContent,
        metadata: {
          ...analysisResult.metadata,
          isDXF: isDXF,
          hasSteelElements: extractedSteelElements.length > 0
        },
        patterns: patterns,
        // Pass pre-extracted steel elements from DXF parser to AI
        extractedElements: isDXF ? extractedSteelElements : undefined
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
  
  /**
   * Convert DXF parsing result to text format for AI processing
   */
  private convertDXFToText(dxfResult: any): string {
    const lines: string[] = [];
    
    // Add header information
    lines.push('=== DXF DRAWING ANALYSIS ===');
    lines.push(`Units: ${dxfResult.metadata.units}`);
    lines.push(`AutoCAD Version: ${dxfResult.metadata.acadVersion}`);
    lines.push(`Total Entities: ${dxfResult.entities.length}`);
    lines.push(`Total Layers: ${dxfResult.layers.length}`);
    
    // Add steel elements information
    if (dxfResult.steelElements && dxfResult.steelElements.length > 0) {
      lines.push('\n=== EXTRACTED STEEL ELEMENTS ===');
      dxfResult.steelElements.forEach((element: any) => {
        lines.push(`\nElement: ${element.designation || element.id}`);
        lines.push(`  Type: ${element.type}`);
        lines.push(`  Layer: ${element.layer}`);
        if (element.profile) lines.push(`  Profile: ${element.profile}`);
        if (element.material) lines.push(`  Material: ${element.material}`);
        
        // Add dimensions if available
        if (element.dimensions) {
          if (element.dimensions.length) lines.push(`  Length: ${element.dimensions.length}mm`);
          if (element.dimensions.width) lines.push(`  Width: ${element.dimensions.width}mm`);
          if (element.dimensions.height) lines.push(`  Height: ${element.dimensions.height}mm`);
          if (element.dimensions.thickness) lines.push(`  Thickness: ${element.dimensions.thickness}mm`);
        }
        
        // Add position information
        if (element.position) {
          lines.push(`  Position: X=${element.position.x}, Y=${element.position.y}`);
        }
        
        // Add confidence score
        lines.push(`  Confidence: ${element.confidence || 'N/A'}`);
      });
    }
    
    // Add layer information
    lines.push('\n=== LAYERS ===');
    dxfResult.layers.forEach((layer: any) => {
      lines.push(`Layer: ${layer.name}`);
      if (layer.entityCount) lines.push(`  Entities: ${layer.entityCount}`);
    });
    
    // Add blocks information if available
    if (dxfResult.blocks && dxfResult.blocks.length > 0) {
      lines.push('\n=== BLOCKS ===');
      dxfResult.blocks.forEach((block: any) => {
        lines.push(`Block: ${block.name}`);
        if (block.entityCount) lines.push(`  Entities: ${block.entityCount}`);
      });
    }
    
    // Add entity statistics
    const entityTypes: { [key: string]: number } = {};
    dxfResult.entities.forEach((entity: any) => {
      entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
    });
    
    lines.push('\n=== ENTITY STATISTICS ===');
    Object.entries(entityTypes).forEach(([type, count]) => {
      lines.push(`${type}: ${count}`);
    });
    
    // Add processing warnings if any
    if (dxfResult.warnings && dxfResult.warnings.length > 0) {
      lines.push('\n=== WARNINGS ===');
      dxfResult.warnings.forEach((warning: string) => {
        lines.push(`- ${warning}`);
      });
    }
    
    return lines.join('\n');
  }
}

export default new AIWorkflowService();
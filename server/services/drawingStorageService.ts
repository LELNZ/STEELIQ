import { db } from "../db";
import {
  drawingDocuments,
  drawingAnnotations,
  drawingProcessingQueue,
  DrawingDocument,
  InsertDrawingDocument,
  DrawingAnnotation,
  InsertDrawingAnnotation,
  DrawingProcessingQueue,
  InsertDrawingProcessingQueue
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import crypto from "crypto";
import { promisify } from "util";

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

export class DrawingStorageService {
  private static instance: DrawingStorageService;
  private readonly uploadDir: string;
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly allowedFileTypes = ['.pdf', '.dxf', '.dwg', '.ifc'];
  private readonly allowedMimeTypes = [
    'application/pdf',
    'application/dxf',
    'application/x-dxf',
    'application/x-dwg',
    'application/dwg',
    'application/x-ifc',
    'application/ifc'
  ];

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'drawings');
    this.initializeStorage();
  }

  public static getInstance(): DrawingStorageService {
    if (!DrawingStorageService.instance) {
      DrawingStorageService.instance = new DrawingStorageService();
    }
    return DrawingStorageService.instance;
  }

  private async initializeStorage() {
    try {
      await mkdir(this.uploadDir, { recursive: true });
      // Create subdirectories for organization
      await mkdir(path.join(this.uploadDir, 'temp'), { recursive: true });
      await mkdir(path.join(this.uploadDir, 'processed'), { recursive: true });
      await mkdir(path.join(this.uploadDir, 'archive'), { recursive: true });
    } catch (error) {
      console.error('Failed to initialize storage directories:', error);
    }
  }

  // Validate file before processing
  public validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.maxFileSize) {
      return { 
        valid: false, 
        error: `File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB` 
      };
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!this.allowedFileTypes.includes(ext)) {
      return { 
        valid: false, 
        error: `File type ${ext} is not allowed. Allowed types: ${this.allowedFileTypes.join(', ')}` 
      };
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      // Allow for some flexibility with MIME types
      const isOctetStream = file.mimetype === 'application/octet-stream';
      const hasValidExtension = this.allowedFileTypes.includes(ext);
      
      if (!isOctetStream || !hasValidExtension) {
        return { 
          valid: false, 
          error: `Invalid file MIME type: ${file.mimetype}` 
        };
      }
    }

    return { valid: true };
  }

  // Generate secure filename
  private generateSecureFilename(originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(originalName + timestamp).digest('hex');
    return `${timestamp}_${hash}${ext}`;
  }

  // Store uploaded file
  public async storeFile(
    file: Express.Multer.File,
    projectId: number,
    userId: number
  ): Promise<DrawingDocument> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate secure filename and path
      const secureFilename = this.generateSecureFilename(file.originalname);
      const relativePath = path.join('temp', secureFilename);
      const fullPath = path.join(this.uploadDir, relativePath);

      // Move file from multer temp to our storage
      if (file.path) {
        await fs.promises.rename(file.path, fullPath);
      } else if (file.buffer) {
        await fs.promises.writeFile(fullPath, file.buffer);
      }

      // Extract metadata for PDF files
      let pageCount: number | null = null;
      let drawingTitle: string | null = null;
      let aiProcessingData: any = null;

      const ext = path.extname(file.originalname).toLowerCase().substring(1);
      
      if (ext === 'pdf') {
        try {
          const { PdfMetadataService } = await import('./pdfMetadataService');
          const metadataService = PdfMetadataService.getInstance();
          const metadata = await metadataService.extractMetadata(fullPath);
          
          pageCount = metadata.pageCount;
          drawingTitle = metadata.title || null;
          aiProcessingData = {
            pageSize: metadata.pageSize,
            hasText: metadata.hasText,
            hasImages: metadata.hasImages,
            author: metadata.author,
            creationDate: metadata.creationDate,
            modificationDate: metadata.modificationDate
          };
        } catch (error) {
          console.error('Error extracting PDF metadata:', error);
          // Continue even if metadata extraction fails
        }
      }

      // Create database record
      const documentData: Omit<InsertDrawingDocument, 'id' | 'createdAt' | 'updatedAt'> = {
        projectId,
        fileName: secureFilename,
        originalFileName: file.originalname,
        fileType: ext,
        fileSize: file.size,
        filePath: relativePath,
        uploadedBy: userId,
        status: 'uploaded',
        processingStartedAt: null,
        processingCompletedAt: null,
        processingError: null,
        pageCount,
        drawingNumber: null,
        drawingTitle,
        drawingScale: null,
        drawingDate: null,
        revision: null,
        aiProcessingData,
        extractedElements: null,
        confidence: null
      };

      const [document] = await db
        .insert(drawingDocuments)
        .values(documentData)
        .returning();

      // Add to processing queue
      await this.addToProcessingQueue(document.id, 'metadata_extraction', 1);

      return document;
    } catch (error) {
      console.error('Error storing file:', error);
      throw error;
    }
  }

  // Add task to processing queue
  public async addToProcessingQueue(
    documentId: number,
    taskType: string,
    priority: number = 5
  ): Promise<DrawingProcessingQueue> {
    const queueData: Omit<InsertDrawingProcessingQueue, 'id' | 'createdAt'> = {
      documentId,
      taskType,
      priority,
      status: 'pending',
      attemptCount: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      nextRetryAt: null,
      result: null,
      error: null,
      completedAt: null
    };

    const [queueItem] = await db
      .insert(drawingProcessingQueue)
      .values(queueData)
      .returning();

    return queueItem;
  }

  // Get document by ID
  public async getDocument(documentId: number): Promise<DrawingDocument | null> {
    const [document] = await db
      .select()
      .from(drawingDocuments)
      .where(eq(drawingDocuments.id, documentId));

    return document || null;
  }

  // Get documents by project
  public async getProjectDocuments(projectId: number): Promise<DrawingDocument[]> {
    return await db
      .select()
      .from(drawingDocuments)
      .where(eq(drawingDocuments.projectId, projectId))
      .orderBy(desc(drawingDocuments.createdAt));
  }

  // Update document status
  public async updateDocumentStatus(
    documentId: number,
    status: string,
    error?: string
  ): Promise<void> {
    const updateData: Partial<DrawingDocument> = {
      status,
      updatedAt: new Date()
    };

    if (status === 'processing') {
      updateData.processingStartedAt = new Date();
    } else if (status === 'completed') {
      updateData.processingCompletedAt = new Date();
    } else if (status === 'failed' && error) {
      updateData.processingError = error;
    }

    await db
      .update(drawingDocuments)
      .set(updateData)
      .where(eq(drawingDocuments.id, documentId));
  }

  // Store annotation
  public async createAnnotation(
    annotation: Omit<InsertDrawingAnnotation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DrawingAnnotation> {
    const [result] = await db
      .insert(drawingAnnotations)
      .values(annotation)
      .returning();

    return result;
  }

  // Get annotations for document
  public async getDocumentAnnotations(
    documentId: number,
    pageNumber?: number
  ): Promise<DrawingAnnotation[]> {
    let query = db
      .select()
      .from(drawingAnnotations)
      .where(eq(drawingAnnotations.documentId, documentId));

    if (pageNumber !== undefined) {
      query = query.where(
        and(
          eq(drawingAnnotations.documentId, documentId),
          eq(drawingAnnotations.pageNumber, pageNumber)
        )
      );
    }

    return await query.orderBy(asc(drawingAnnotations.createdAt));
  }

  // Update annotation
  public async updateAnnotation(
    annotationId: number,
    updates: Partial<DrawingAnnotation>
  ): Promise<void> {
    await db
      .update(drawingAnnotations)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(drawingAnnotations.id, annotationId));
  }

  // Delete annotation
  public async deleteAnnotation(annotationId: number): Promise<void> {
    await db
      .delete(drawingAnnotations)
      .where(eq(drawingAnnotations.id, annotationId));
  }

  // Get next pending task from queue
  public async getNextPendingTask(): Promise<DrawingProcessingQueue | null> {
    const [task] = await db
      .select()
      .from(drawingProcessingQueue)
      .where(eq(drawingProcessingQueue.status, 'pending'))
      .orderBy(
        asc(drawingProcessingQueue.priority),
        asc(drawingProcessingQueue.createdAt)
      )
      .limit(1);

    return task || null;
  }

  // Update queue task
  public async updateQueueTask(
    taskId: number,
    updates: Partial<DrawingProcessingQueue>
  ): Promise<void> {
    await db
      .update(drawingProcessingQueue)
      .set(updates)
      .where(eq(drawingProcessingQueue.id, taskId));
  }

  // Move file to processed folder
  public async moveToProcessed(documentId: number): Promise<void> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const oldPath = path.join(this.uploadDir, document.filePath);
    const newRelativePath = document.filePath.replace('temp/', 'processed/');
    const newPath = path.join(this.uploadDir, newRelativePath);

    await fs.promises.rename(oldPath, newPath);

    await db
      .update(drawingDocuments)
      .set({
        filePath: newRelativePath,
        updatedAt: new Date()
      })
      .where(eq(drawingDocuments.id, documentId));
  }

  // Get file path for serving
  public getFilePath(document: DrawingDocument): string {
    return path.join(this.uploadDir, document.filePath);
  }

  // Delete document and associated data
  public async deleteDocument(documentId: number): Promise<void> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Delete file
    const filePath = path.join(this.uploadDir, document.filePath);
    try {
      await unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }

    // Delete annotations
    await db
      .delete(drawingAnnotations)
      .where(eq(drawingAnnotations.documentId, documentId));

    // Delete queue tasks
    await db
      .delete(drawingProcessingQueue)
      .where(eq(drawingProcessingQueue.documentId, documentId));

    // Delete document record
    await db
      .delete(drawingDocuments)
      .where(eq(drawingDocuments.id, documentId));
  }

  // Archive document
  public async archiveDocument(documentId: number): Promise<void> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const oldPath = path.join(this.uploadDir, document.filePath);
    const archiveDir = document.filePath.replace(/^(temp|processed)\//, 'archive/');
    const newPath = path.join(this.uploadDir, archiveDir);

    // Ensure archive subdirectory exists
    await mkdir(path.dirname(newPath), { recursive: true });
    
    // Move file
    await fs.promises.rename(oldPath, newPath);

    // Update database
    await db
      .update(drawingDocuments)
      .set({
        filePath: archiveDir,
        status: 'archived',
        updatedAt: new Date()
      })
      .where(eq(drawingDocuments.id, documentId));
  }
}
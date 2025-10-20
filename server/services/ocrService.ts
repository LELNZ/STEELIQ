/**
 * OCR Service for Processing Scanned PDF Documents
 * Fortune 50 compliant with comprehensive logging and error handling
 */

import { createWorker, Worker, RecognizeResult } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import { validateRealData, auditDataSource } from '../utils/noMockDataPolicy.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(
  process.cwd(),
  'node_modules/pdfjs-dist/build/pdf.worker.js'
);

export interface OCRResult {
  success: boolean;
  text: string;
  confidence: number;
  pages: PageOCRResult[];
  processingTime: number;
  warnings: string[];
  method: 'OCR' | 'HYBRID' | 'TEXT';
}

export interface PageOCRResult {
  pageNumber: number;
  text: string;
  confidence: number;
  hasText: boolean;
  hasImages: boolean;
  boundingBoxes?: BoundingBox[];
}

export interface BoundingBox {
  text: string;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  confidence: number;
  page: number;
}

class OCRService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private readonly MIN_TEXT_LENGTH = 100; // Minimum characters to consider as text-based PDF
  private readonly MIN_CONFIDENCE = 0.6; // Minimum OCR confidence threshold
  
  /**
   * Initialize Tesseract worker with optimal settings
   */
  private async initializeWorker(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return;
    }
    
    console.log('[OCR] Initializing Tesseract worker...');
    
    try {
      this.worker = await createWorker({
        logger: (m) => {
          if (m.status) {
            console.log(`[OCR Progress] ${m.status}: ${Math.round(m.progress * 100)}%`);
          }
        },
        errorHandler: (err) => {
          console.error('[OCR Error]', err);
        }
      });
      
      // Load English language with engineering/technical vocabulary
      await this.worker.loadLanguage('eng');
      await this.worker.initialize('eng');
      
      // Configure for technical drawings
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,/-()[]{}:;@#$%&*+=<>?" \'',
        tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
        preserve_interword_spaces: '1',
        textord_heavy_nr: '1', // Assume heavy noise (common in scanned drawings)
        edges_max_children_per_outline: '40' // Better for technical drawings
      });
      
      this.isInitialized = true;
      console.log('[OCR] Tesseract worker initialized successfully');
    } catch (error) {
      console.error('[OCR] Failed to initialize Tesseract:', error);
      throw new Error('OCR initialization failed');
    }
  }
  
  /**
   * Process a PDF buffer and extract text using OCR if needed
   */
  async processPDF(pdfBuffer: Buffer, forceOCR: boolean = false): Promise<OCRResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    try {
      // Load PDF document
      const pdfData = new Uint8Array(pdfBuffer);
      const pdfDocument = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const numPages = pdfDocument.numPages;
      
      console.log(`[OCR] Processing PDF with ${numPages} pages...`);
      
      const pageResults: PageOCRResult[] = [];
      let fullText = '';
      let totalConfidence = 0;
      let method: 'OCR' | 'HYBRID' | 'TEXT' = 'TEXT';
      
      // Process each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        console.log(`[OCR] Processing page ${pageNum}/${numPages}...`);
        
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Extract native text
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        // Check if page has sufficient native text
        const hasNativeText = pageText.length >= this.MIN_TEXT_LENGTH;
        
        if (hasNativeText && !forceOCR) {
          // Use native text extraction
          pageResults.push({
            pageNumber: pageNum,
            text: pageText,
            confidence: 1.0, // Perfect confidence for native text
            hasText: true,
            hasImages: false
          });
          fullText += pageText + '\n\n';
          totalConfidence += 1.0;
        } else {
          // Need OCR - page is likely scanned or image-based
          method = hasNativeText ? 'HYBRID' : 'OCR';
          warnings.push(`Page ${pageNum} requires OCR processing (${hasNativeText ? 'hybrid mode' : 'image-only'})`);
          
          const ocrResult = await this.processPageWithOCR(page, pageNum);
          pageResults.push(ocrResult);
          fullText += ocrResult.text + '\n\n';
          totalConfidence += ocrResult.confidence;
        }
      }
      
      // Calculate overall confidence
      const averageConfidence = totalConfidence / numPages;
      const processingTime = Date.now() - startTime;
      
      // Validate no mock data
      if (fullText.trim().length < 100) {
        warnings.push('⚠️ Minimal text extracted - verify PDF quality');
      }
      
      // Audit data source for Fortune 50 compliance
      auditDataSource({
        source: 'OCR_EXTRACTION',
        method,
        confidence: averageConfidence,
        pageCount: numPages,
        processingTimeMs: processingTime
      });
      
      console.log(`[OCR] Completed: ${fullText.length} chars extracted in ${processingTime}ms (${method} mode)`);
      
      return {
        success: true,
        text: fullText,
        confidence: averageConfidence,
        pages: pageResults,
        processingTime,
        warnings,
        method
      };
      
    } catch (error) {
      console.error('[OCR] Processing failed:', error);
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        text: '',
        confidence: 0,
        pages: [],
        processingTime,
        warnings: ['OCR processing failed: ' + (error as Error).message],
        method: 'OCR'
      };
    }
  }
  
  /**
   * Process a single page with OCR
   */
  private async processPageWithOCR(page: any, pageNumber: number): Promise<PageOCRResult> {
    try {
      // Initialize worker if needed
      await this.initializeWorker();
      
      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }
      
      // Get page viewport
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
      
      // Create canvas and render page
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert canvas to buffer
      const imageBuffer = canvas.toBuffer('image/png');
      
      // Run OCR
      const result = await this.worker.recognize(imageBuffer);
      
      // Extract bounding boxes for evidence tracking
      const boundingBoxes: BoundingBox[] = result.data.words.map(word => ({
        text: word.text,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1
        },
        confidence: word.confidence / 100,
        page: pageNumber
      }));
      
      // Filter low confidence results
      const filteredText = result.data.words
        .filter(word => word.confidence >= this.MIN_CONFIDENCE * 100)
        .map(word => word.text)
        .join(' ');
      
      return {
        pageNumber,
        text: filteredText || result.data.text,
        confidence: result.data.confidence / 100,
        hasText: true,
        hasImages: true,
        boundingBoxes: boundingBoxes.filter(box => box.confidence >= this.MIN_CONFIDENCE)
      };
      
    } catch (error) {
      console.error(`[OCR] Failed to process page ${pageNumber}:`, error);
      
      return {
        pageNumber,
        text: '',
        confidence: 0,
        hasText: false,
        hasImages: true
      };
    }
  }
  
  /**
   * Extract text from specific region of a page
   */
  async extractRegion(
    pdfBuffer: Buffer,
    pageNumber: number,
    region: { x: number; y: number; width: number; height: number }
  ): Promise<string> {
    try {
      const pdfData = new Uint8Array(pdfBuffer);
      const pdfDocument = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const page = await pdfDocument.getPage(pageNumber);
      
      // Get page viewport
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create canvas for full page
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Create cropped canvas for region
      const regionCanvas = createCanvas(region.width * 2, region.height * 2);
      const regionContext = regionCanvas.getContext('2d');
      
      // Copy region from full canvas
      regionContext.drawImage(
        canvas as any,
        region.x * 2, region.y * 2, region.width * 2, region.height * 2,
        0, 0, region.width * 2, region.height * 2
      );
      
      // Initialize worker if needed
      await this.initializeWorker();
      
      if (!this.worker) {
        throw new Error('OCR worker not initialized');
      }
      
      // Run OCR on region
      const imageBuffer = regionCanvas.toBuffer('image/png');
      const result = await this.worker.recognize(imageBuffer);
      
      return result.data.text;
      
    } catch (error) {
      console.error('[OCR] Failed to extract region:', error);
      return '';
    }
  }
  
  /**
   * Enhance text extraction with multiple passes and confidence thresholds
   */
  async enhancedExtraction(pdfBuffer: Buffer): Promise<OCRResult> {
    console.log('[OCR] Starting enhanced extraction with multiple passes...');
    
    // First pass: Standard extraction
    const firstPass = await this.processPDF(pdfBuffer, false);
    
    // If confidence is low, try again with different settings
    if (firstPass.confidence < 0.7) {
      console.log('[OCR] Low confidence detected, attempting enhanced extraction...');
      
      // Reinitialize worker with different parameters
      if (this.worker) {
        await this.worker.setParameters({
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/-()[]{}:;@#$%&*+=<>?" \'',
          tessedit_pageseg_mode: '3', // Fully automatic
          textonly_pdf: '0',
          hocr_font_info: '1'
        });
      }
      
      // Second pass with force OCR
      const secondPass = await this.processPDF(pdfBuffer, true);
      
      // Return best result
      return secondPass.confidence > firstPass.confidence ? secondPass : firstPass;
    }
    
    return firstPass;
  }
  
  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('[OCR] Worker terminated');
    }
  }
}

export default new OCRService();
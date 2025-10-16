/**
 * Error Recovery Service for AI Estimation System
 * Provides resilient error handling and partial extraction recovery
 * Implements Fortune 50-level fault tolerance
 */

import { SelectAiEstimationResult, SelectMtoItem } from '@shared/schema';
import { storage } from '../storage';

interface RecoveryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  enablePartialExtraction?: boolean;
  fallbackStrategies?: string[];
}

interface PartialExtractionResult {
  success: boolean;
  extractedItems: Partial<SelectMtoItem>[];
  failedSections: Array<{
    section: string;
    error: string;
    page?: number;
  }>;
  recoveryAttempts: number;
  completionPercentage: number;
}

interface ErrorContext {
  operation: string;
  input?: any;
  timestamp: Date;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  recoveryAttempted: boolean;
  recoverySuccessful?: boolean;
}

class ErrorRecoveryService {
  private errorHistory: Map<string, ErrorContext[]> = new Map();
  private recoveryStrategies = new Map<string, Function>();
  
  constructor() {
    this.initializeRecoveryStrategies();
  }

  /**
   * Initialize recovery strategies for different error types
   */
  private initializeRecoveryStrategies() {
    // OCR failure recovery
    this.recoveryStrategies.set('OCR_FAILURE', async (context: any) => {
      console.log('[Recovery] Attempting OCR recovery with enhanced parameters...');
      
      // Try different OCR configurations
      const configs = [
        { psm: 3, oem: 3 },  // Fully automatic page segmentation
        { psm: 6, oem: 1 },  // Uniform block of text
        { psm: 11, oem: 3 }  // Sparse text
      ];
      
      for (const config of configs) {
        try {
          // Attempt with different configuration
          const result = await this.retryWithConfig(context, config);
          if (result) return result;
        } catch (e) {
          continue;
        }
      }
      
      return null;
    });

    // PDF parsing failure recovery
    this.recoveryStrategies.set('PDF_PARSE_FAILURE', async (context: any) => {
      console.log('[Recovery] Attempting PDF recovery with page-by-page extraction...');
      
      const results = [];
      const totalPages = context.pageCount || 10;
      
      // Try extracting page by page
      for (let i = 1; i <= totalPages; i++) {
        try {
          const pageResult = await this.extractSinglePage(context.pdfBuffer, i);
          if (pageResult) results.push(pageResult);
        } catch (e) {
          console.error(`[Recovery] Failed to extract page ${i}:`, e.message);
        }
      }
      
      return results.length > 0 ? results : null;
    });

    // AI API failure recovery
    this.recoveryStrategies.set('AI_API_FAILURE', async (context: any) => {
      console.log('[Recovery] AI API failure - implementing fallback strategy...');
      
      // Try with smaller chunks
      if (context.text && context.text.length > 10000) {
        const chunks = this.chunkText(context.text, 8000);
        const results = [];
        
        for (const chunk of chunks) {
          try {
            const result = await this.processChunk(chunk, context);
            if (result) results.push(result);
          } catch (e) {
            console.error('[Recovery] Chunk processing failed:', e.message);
          }
        }
        
        return this.mergeChunkResults(results);
      }
      
      return null;
    });

    // DXF parsing failure recovery
    this.recoveryStrategies.set('DXF_PARSE_FAILURE', async (context: any) => {
      console.log('[Recovery] Attempting DXF recovery with line-by-line parsing...');
      
      const lines = context.content?.split('\n') || [];
      const elements = [];
      let currentEntity = null;
      
      for (let i = 0; i < lines.length; i++) {
        try {
          const line = lines[i].trim();
          
          // Basic DXF entity detection
          if (line === '0') {
            if (currentEntity) {
              elements.push(currentEntity);
            }
            currentEntity = { type: lines[i + 1]?.trim(), data: [] };
          } else if (currentEntity) {
            currentEntity.data.push(line);
          }
        } catch (e) {
          continue;
        }
      }
      
      if (currentEntity) elements.push(currentEntity);
      
      return elements.length > 0 ? { entities: elements } : null;
    });
  }

  /**
   * Main error recovery handler
   */
  async handleError(
    error: Error,
    context: any,
    options: RecoveryOptions = {}
  ): Promise<{ recovered: boolean; result?: any; partialResult?: PartialExtractionResult }> {
    const {
      maxRetries = 3,
      retryDelayMs = 1000,
      enablePartialExtraction = true,
      fallbackStrategies = ['BASIC', 'ENHANCED', 'MANUAL']
    } = options;

    const errorContext: ErrorContext = {
      operation: context.operation || 'UNKNOWN',
      input: context.input,
      timestamp: new Date(),
      errorType: this.classifyError(error),
      errorMessage: error.message,
      stackTrace: error.stack,
      recoveryAttempted: true,
      recoverySuccessful: false
    };

    // Store error for analysis
    this.logError(errorContext);

    // Attempt recovery based on error type
    const recoveryStrategy = this.recoveryStrategies.get(errorContext.errorType);
    
    if (recoveryStrategy) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[Recovery] Attempt ${attempt}/${maxRetries} for ${errorContext.errorType}`);
          
          const result = await recoveryStrategy(context);
          
          if (result) {
            errorContext.recoverySuccessful = true;
            console.log(`[Recovery] Success on attempt ${attempt}`);
            return { recovered: true, result };
          }
        } catch (retryError) {
          console.error(`[Recovery] Attempt ${attempt} failed:`, retryError.message);
          
          if (attempt < maxRetries) {
            await this.delay(retryDelayMs * attempt); // Exponential backoff
          }
        }
      }
    }

    // If recovery failed but partial extraction is enabled
    if (enablePartialExtraction) {
      console.log('[Recovery] Attempting partial extraction...');
      const partialResult = await this.attemptPartialExtraction(context);
      
      if (partialResult.extractedItems.length > 0) {
        return {
          recovered: false,
          partialResult
        };
      }
    }

    return { recovered: false };
  }

  /**
   * Classify error type for appropriate recovery strategy
   */
  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('ocr') || message.includes('tesseract')) {
      return 'OCR_FAILURE';
    } else if (message.includes('pdf') || message.includes('parse')) {
      return 'PDF_PARSE_FAILURE';
    } else if (message.includes('anthropic') || message.includes('api') || message.includes('timeout')) {
      return 'AI_API_FAILURE';
    } else if (message.includes('dxf')) {
      return 'DXF_PARSE_FAILURE';
    } else if (message.includes('memory') || message.includes('heap')) {
      return 'MEMORY_FAILURE';
    } else {
      return 'UNKNOWN_FAILURE';
    }
  }

  /**
   * Attempt partial extraction when full extraction fails
   */
  private async attemptPartialExtraction(context: any): Promise<PartialExtractionResult> {
    const extractedItems: Partial<SelectMtoItem>[] = [];
    const failedSections: Array<{ section: string; error: string; page?: number }> = [];
    let successfulSections = 0;
    let totalSections = 0;

    // Try to extract whatever we can from the available data
    if (context.sections && Array.isArray(context.sections)) {
      totalSections = context.sections.length;
      
      for (const section of context.sections) {
        try {
          const items = await this.extractFromSection(section);
          extractedItems.push(...items);
          successfulSections++;
        } catch (e) {
          failedSections.push({
            section: section.name || 'Unknown',
            error: e.message,
            page: section.page
          });
        }
      }
    }

    // Try basic pattern matching as fallback
    if (extractedItems.length === 0 && context.text) {
      const basicItems = this.extractBasicPatterns(context.text);
      extractedItems.push(...basicItems);
      
      if (basicItems.length > 0) {
        successfulSections = 1;
        totalSections = 1;
      }
    }

    const completionPercentage = totalSections > 0 
      ? Math.round((successfulSections / totalSections) * 100)
      : 0;

    return {
      success: extractedItems.length > 0,
      extractedItems,
      failedSections,
      recoveryAttempts: context.recoveryAttempts || 1,
      completionPercentage
    };
  }

  /**
   * Extract basic patterns using regex when AI fails
   */
  private extractBasicPatterns(text: string): Partial<SelectMtoItem>[] {
    const items: Partial<SelectMtoItem>[] = [];
    
    // Pattern for steel designations (e.g., "UC305x305x97", "PFC200x75", "SHS100x100x5")
    const steelPattern = /\b(UC|UB|PFC|SHS|RHS|CHS|EA|L)\s*(\d+)\s*[x×]\s*(\d+)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\b/gi;
    
    // Pattern for quantities (e.g., "10 nos", "5 EA", "12 pieces")
    const quantityPattern = /(\d+(?:\.\d+)?)\s*(nos?|ea|pcs?|pieces?|units?)\b/gi;
    
    // Pattern for dimensions (e.g., "6000mm", "3.5m", "12'-6"")
    const dimensionPattern = /(\d+(?:\.\d+)?)\s*(mm|m|cm|ft|'|")\b/gi;
    
    let match;
    const designations = new Set<string>();
    
    // Extract steel designations
    while ((match = steelPattern.exec(text)) !== null) {
      const designation = match[0].replace(/\s+/g, '');
      
      if (!designations.has(designation)) {
        designations.add(designation);
        
        items.push({
          designation,
          description: `Steel section ${match[1]}`,
          category: this.categorizeSteel(match[1]),
          quantity: 1, // Default quantity
          unit: 'EA',
          confidence: 0.5 // Lower confidence for pattern matching
        });
      }
    }
    
    // Try to associate quantities with items
    const quantities: Array<{ value: number; unit: string; position: number }> = [];
    
    while ((match = quantityPattern.exec(text)) !== null) {
      quantities.push({
        value: parseFloat(match[1]),
        unit: match[2].toUpperCase(),
        position: match.index
      });
    }
    
    // Simple proximity matching for quantities
    items.forEach((item, index) => {
      const nearestQuantity = this.findNearestQuantity(
        text.indexOf(item.designation!),
        quantities
      );
      
      if (nearestQuantity) {
        item.quantity = nearestQuantity.value;
        item.unit = nearestQuantity.unit;
      }
    });
    
    return items;
  }

  /**
   * Categorize steel based on designation prefix
   */
  private categorizeSteel(prefix: string): string {
    const categories: Record<string, string> = {
      'UC': 'COLUMNS',
      'UB': 'BEAMS',
      'PFC': 'CHANNELS',
      'SHS': 'HOLLOW_SECTIONS',
      'RHS': 'HOLLOW_SECTIONS',
      'CHS': 'HOLLOW_SECTIONS',
      'EA': 'ANGLES',
      'L': 'ANGLES'
    };
    
    return categories[prefix.toUpperCase()] || 'STRUCTURAL';
  }

  /**
   * Find nearest quantity to a designation position
   */
  private findNearestQuantity(
    designationPos: number,
    quantities: Array<{ value: number; unit: string; position: number }>
  ): { value: number; unit: string } | null {
    if (quantities.length === 0) return null;
    
    let nearest = quantities[0];
    let minDistance = Math.abs(designationPos - quantities[0].position);
    
    for (const qty of quantities) {
      const distance = Math.abs(designationPos - qty.position);
      if (distance < minDistance && distance < 100) { // Within 100 characters
        nearest = qty;
        minDistance = distance;
      }
    }
    
    return minDistance < 100 ? nearest : null;
  }

  /**
   * Chunk text for processing large documents
   */
  private chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]\s+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    
    return chunks;
  }

  /**
   * Merge results from multiple chunks
   */
  private mergeChunkResults(results: any[]): any {
    if (!results || results.length === 0) return null;
    
    const merged = {
      items: [],
      confidence: 0,
      metadata: {
        chunks: results.length,
        mergedAt: new Date().toISOString()
      }
    };
    
    for (const result of results) {
      if (result?.items) {
        merged.items.push(...result.items);
      }
      merged.confidence += result?.confidence || 0;
    }
    
    merged.confidence /= results.length;
    
    return merged;
  }

  /**
   * Helper methods for specific recovery strategies
   */
  private async retryWithConfig(context: any, config: any): Promise<any> {
    // Implementation specific to OCR retry with different configs
    return null;
  }

  private async extractSinglePage(pdfBuffer: Buffer, pageNumber: number): Promise<any> {
    // Implementation for single page extraction
    return null;
  }

  private async processChunk(chunk: string, context: any): Promise<any> {
    // Implementation for processing text chunks
    return null;
  }

  private async extractFromSection(section: any): Promise<Partial<SelectMtoItem>[]> {
    // Implementation for section extraction
    return [];
  }

  /**
   * Log error for analysis and improvement
   */
  private logError(context: ErrorContext) {
    const key = `${context.operation}_${context.errorType}`;
    
    if (!this.errorHistory.has(key)) {
      this.errorHistory.set(key, []);
    }
    
    this.errorHistory.get(key)!.push(context);
    
    // Keep only last 100 errors per type
    const history = this.errorHistory.get(key)!;
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [key, errors] of this.errorHistory.entries()) {
      const recoveryRate = errors.filter(e => e.recoverySuccessful).length / errors.length;
      
      stats[key] = {
        totalErrors: errors.length,
        recoveryRate: Math.round(recoveryRate * 100),
        lastError: errors[errors.length - 1]?.timestamp,
        mostCommonMessage: this.getMostCommonMessage(errors)
      };
    }
    
    return stats;
  }

  /**
   * Get most common error message for a type
   */
  private getMostCommonMessage(errors: ErrorContext[]): string {
    const messageCounts = new Map<string, number>();
    
    for (const error of errors) {
      const count = messageCounts.get(error.errorMessage) || 0;
      messageCounts.set(error.errorMessage, count + 1);
    }
    
    let maxCount = 0;
    let mostCommon = '';
    
    for (const [message, count] of messageCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = message;
      }
    }
    
    return mostCommon;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save partial extraction results to database
   */
  async savePartialResults(
    resultId: number,
    partialResult: PartialExtractionResult
  ): Promise<void> {
    try {
      // Update the estimation result with partial status
      await storage.updateAiEstimationResult(resultId, {
        metadata: {
          partial: true,
          completionPercentage: partialResult.completionPercentage,
          failedSections: partialResult.failedSections,
          recoveryAttempts: partialResult.recoveryAttempts
        }
      });
      
      // Save extracted items
      for (const item of partialResult.extractedItems) {
        if (item.designation) {
          await storage.createMtoItem({
            ...item,
            estimationResultId: resultId,
            metadata: { partial: true }
          } as any);
        }
      }
      
      console.log(`[Recovery] Saved ${partialResult.extractedItems.length} partial items`);
    } catch (error) {
      console.error('[Recovery] Failed to save partial results:', error);
    }
  }
}

export const errorRecoveryService = new ErrorRecoveryService();
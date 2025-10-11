import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PdfMetadata {
  pageCount: number;
  pageSize?: {
    width: number;
    height: number;
    unit: string;
  };
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  fileSize: number;
  hasText: boolean;
  hasImages: boolean;
}

export class PdfMetadataService {
  private static instance: PdfMetadataService;

  private constructor() {}

  static getInstance(): PdfMetadataService {
    if (!PdfMetadataService.instance) {
      PdfMetadataService.instance = new PdfMetadataService();
    }
    return PdfMetadataService.instance;
  }

  /**
   * Extract metadata from a PDF file
   */
  async extractMetadata(filePath: string): Promise<PdfMetadata> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // For now, we'll use a simple approach with PDF.js on the server side
      // In production, we could use specialized tools like pdfinfo, pdftk, or qpdf
      
      // Try to extract basic metadata using Node.js buffer analysis
      const metadata = await this.extractBasicMetadata(filePath, fileSize);
      
      return metadata;
    } catch (error) {
      console.error('Error extracting PDF metadata:', error);
      throw error;
    }
  }

  /**
   * Extract basic metadata by parsing the PDF structure
   */
  private async extractBasicMetadata(filePath: string, fileSize: number): Promise<PdfMetadata> {
    return new Promise((resolve, reject) => {
      const metadata: PdfMetadata = {
        pageCount: 0,
        fileSize,
        hasText: false,
        hasImages: false
      };

      // Read the PDF file
      const buffer = fs.readFileSync(filePath);
      const content = buffer.toString('latin1');

      // Extract page count using regex patterns
      // Look for /Type /Page patterns
      const pageMatches = content.match(/\/Type\s*\/Page[^s]/g);
      if (pageMatches) {
        metadata.pageCount = pageMatches.length;
      }

      // Alternative method: look for page tree nodes
      if (metadata.pageCount === 0) {
        const countMatch = content.match(/\/Count\s+(\d+)/);
        if (countMatch) {
          metadata.pageCount = parseInt(countMatch[1]);
        }
      }

      // Extract title
      const titleMatch = content.match(/\/Title\s*\((.*?)\)/);
      if (titleMatch) {
        metadata.title = this.decodePdfString(titleMatch[1]);
      }

      // Extract author
      const authorMatch = content.match(/\/Author\s*\((.*?)\)/);
      if (authorMatch) {
        metadata.author = this.decodePdfString(authorMatch[1]);
      }

      // Extract subject
      const subjectMatch = content.match(/\/Subject\s*\((.*?)\)/);
      if (subjectMatch) {
        metadata.subject = this.decodePdfString(subjectMatch[1]);
      }

      // Extract keywords
      const keywordsMatch = content.match(/\/Keywords\s*\((.*?)\)/);
      if (keywordsMatch) {
        metadata.keywords = this.decodePdfString(keywordsMatch[1]);
      }

      // Extract creator
      const creatorMatch = content.match(/\/Creator\s*\((.*?)\)/);
      if (creatorMatch) {
        metadata.creator = this.decodePdfString(creatorMatch[1]);
      }

      // Extract producer
      const producerMatch = content.match(/\/Producer\s*\((.*?)\)/);
      if (producerMatch) {
        metadata.producer = this.decodePdfString(producerMatch[1]);
      }

      // Check for text content
      metadata.hasText = content.includes('/Font') || content.includes('stream') && content.includes('BT');

      // Check for images
      metadata.hasImages = content.includes('/Image') || content.includes('/XObject');

      // Extract page size from MediaBox
      const mediaBoxMatch = content.match(/\/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s*\]/);
      if (mediaBoxMatch) {
        const width = parseFloat(mediaBoxMatch[3]) - parseFloat(mediaBoxMatch[1]);
        const height = parseFloat(mediaBoxMatch[4]) - parseFloat(mediaBoxMatch[2]);
        
        // Convert points to millimeters (1 point = 0.352778 mm)
        metadata.pageSize = {
          width: Math.round(width * 0.352778),
          height: Math.round(height * 0.352778),
          unit: 'mm'
        };
      }

      // Extract dates
      const creationDateMatch = content.match(/\/CreationDate\s*\(D:(\d{14})/);
      if (creationDateMatch) {
        metadata.creationDate = this.parsePdfDate(creationDateMatch[1]);
      }

      const modDateMatch = content.match(/\/ModDate\s*\(D:(\d{14})/);
      if (modDateMatch) {
        metadata.modificationDate = this.parsePdfDate(modDateMatch[1]);
      }

      // Fallback page count to 1 if not detected
      if (metadata.pageCount === 0) {
        metadata.pageCount = 1;
      }

      resolve(metadata);
    });
  }

  /**
   * Decode PDF string (handle escape sequences)
   */
  private decodePdfString(str: string): string {
    return str
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\r/g, '\r')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
  }

  /**
   * Parse PDF date format (D:YYYYMMDDHHmmSS)
   */
  private parsePdfDate(dateStr: string): Date {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    const hour = parseInt(dateStr.substring(8, 10)) || 0;
    const minute = parseInt(dateStr.substring(10, 12)) || 0;
    const second = parseInt(dateStr.substring(12, 14)) || 0;
    
    return new Date(year, month, day, hour, minute, second);
  }

  /**
   * Extract text content from PDF (for searchable text)
   * This is a placeholder for more advanced text extraction
   */
  async extractText(filePath: string): Promise<string> {
    // This would require a proper PDF parsing library like pdf-parse
    // For now, return empty string
    return '';
  }

  /**
   * Identify drawing elements in PDF (beams, columns, etc.)
   * This is where AI analysis would be integrated
   */
  async identifyDrawingElements(filePath: string): Promise<any[]> {
    // Placeholder for AI-based element identification
    // This would integrate with AI services to detect:
    // - Steel sections (beams, columns, plates)
    // - Dimensions and measurements
    // - Drawing numbers and references
    // - Material specifications
    
    return [];
  }

  /**
   * Compare two PDF files for revisions
   */
  async compareRevisions(originalPath: string, revisedPath: string): Promise<any> {
    // Placeholder for revision comparison
    // Would identify changes between drawing versions
    
    return {
      added: [],
      removed: [],
      modified: []
    };
  }
}
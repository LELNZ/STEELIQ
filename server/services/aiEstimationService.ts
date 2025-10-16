import Anthropic from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import pdf from 'pdf-parse';
import { DrawingDocument, DrawingAnnotation } from '@shared/schema';
import { db } from '../db/index.js';
import { aiDrawingAnalysis, aiRunTelemetry } from '@shared/schema.js';
import { eq } from 'drizzle-orm';
import PatternPackService from './patternPackService.js';
import complianceLintService from './complianceLintService.js';
import { validateRealData, auditDataSource, NoMockDataViolationError } from '../utils/noMockDataPolicy.js';

// V4.2 AUTO - Self-Learning AI Architecture Version  
const AI_VERSION = 'V4.2 AUTO';
const DEFAULT_MODEL_STR = "claude-3-5-sonnet-20241022"; // Latest model with vision for PDF analysis

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const patternPackService = new PatternPackService();

// Hierarchical MTO structure types
export interface MaterialTakeOffItem {
  id: string;
  designation: string; // e.g., B1, C1, PL1
  type: 'beam' | 'column' | 'plate' | 'angle' | 'channel' | 'tube' | 'other';
  description: string;
  material: string; // e.g., AS350, AS250
  dimensions: {
    length?: number; // in mm
    width?: number;
    height?: number;
    thickness?: number;
    weight?: number; // kg/m
  };
  quantity: number;
  childItems: MaterialTakeOffOperation[];
  location?: string; // Grid reference or area
  drawingReference?: string; // PDF page or drawing number
  confidence: number; // 0-1 AI confidence score
  // NEW: Evidence tracking for Fortune 50 audit trail
  evidence?: {
    fileId: string;
    page: number;
    bbox?: number[]; // [x1, y1, x2, y2]
    extractionMethod: 'TEXT' | 'VISION' | 'HYBRID' | 'UNSPECIFIED';
  };
}

export interface MaterialTakeOffOperation {
  id: string;
  parentDesignation: string; // e.g., B1
  operationId: string; // e.g., 4.1, 4.2
  type: 'cutting' | 'drilling' | 'welding' | 'painting' | 'endplate' | 'stiffener' | 'cleat' | 'baseplate';
  description: string;
  specifications?: {
    holes?: { diameter: number; count: number; pattern?: string };
    weldType?: string;
    weldSize?: number;
    plateThickness?: number;
    plateDimensions?: { width: number; height: number };
  };
  quantity: number;
  laborHours?: number;
}

export interface AIEstimationResult {
  projectId: number;
  mtoItems: MaterialTakeOffItem[];
  summary: {
    totalWeight: number;
    totalLength: number;
    steelGrade: { [grade: string]: number };
    itemCounts: { [type: string]: number };
    estimatedFabricationHours: number;
    estimatedCost: {
      materials: number;
      labor: number;
      coating: number;
      total: number;
    };
  };
  aiAnalysis: {
    confidence: number;
    processingTime: number;
    elementsDetected: number;
    warnings: string[];
    suggestions: string[];
  };
  // NEW: Auto-config detection for standards compliance
  autoConfig?: {
    regionCodeSet?: string; // AS/NZS, AISC, etc
    unitsDefault?: 'mm' | 'inch';
    weldStandard?: string;
    boltStandard?: string;
    excludedPhrases?: string[];
  };
}

class AIEstimationService {
  /**
   * Analyze a construction drawing PDF and extract MTO data with self-learning
   * PRAGMATIC PHASE 1 APPROACH - Working system with critical Fortune 50 features
   */
  async analyzeDrawingForMTO(
    pdfBuffer: Buffer,
    annotations?: DrawingAnnotation[],
    projectContext?: string,
    organizationKey: string = 'default'
  ): Promise<AIEstimationResult> {
    console.log(`[${AI_VERSION}] Starting pragmatic AI analysis with self-learning...`);
    const startTime = Date.now();
    
    try {
      // Extract text from PDF
      const pdfData = await pdf(pdfBuffer);
      const pdfText = pdfData.text;
      const pageCount = pdfData.numpages;
      
      console.log(`PDF Analysis: ${pageCount} pages, ${pdfText.length} characters extracted`);
      
      // Determine project type from context
      const projectType = this.detectProjectType(projectContext || '', pdfText);
      console.log(`Detected project type: ${projectType}`);
      
      // Load pattern pack for this organization and project type
      const patternPackData = await patternPackService.loadPatternPack(organizationKey, projectType);
      
      // Check if PDF is image-based (no extractable text)
      if (pdfText.trim().length < 100) {
        console.error('[CRITICAL] PDF is image-based/scanned - cannot extract text');
        console.error('⛔ NO MOCK DATA POLICY: Refusing to generate fake data');
        console.log('📝 Required: OCR/Vision API integration for scanned PDFs');
        
        // STRICT NO MOCK DATA POLICY - Return error, never generate fake data
        const processingTime = Date.now() - startTime;
        
        return {
          projectId: 0,
          mtoItems: [], // Empty array - NO FAKE DATA
          summary: {
            totalWeight: 0,
            totalLength: 0,
            steelGrade: {},
            itemCounts: {},
            estimatedFabricationHours: 0,
            estimatedCost: {
              materials: 0,
              labor: 0,
              coating: 0,
              total: 0
            }
          },
          aiAnalysis: {
            confidence: 0, // Zero confidence - no real data extracted
            processingTime,
            elementsDetected: 0,
            warnings: [
              '⛔ CRITICAL: PDF is image-based/scanned - text extraction failed',
              '⚠️ OCR or Vision API required to process scanned drawings',
              '❌ NO DATA EXTRACTED - Upload a text-based PDF or implement OCR'
            ],
            suggestions: [
              'Upload a vector/text-based PDF (not scanned)',
              'Ensure PDF was created digitally, not scanned from paper',
              'Contact support if this is a digitally-created PDF'
            ]
          }
        };
      }
      
      // Detect auto-config from PDF (lightweight for Phase 1)
      const autoConfig = this.detectAutoConfig(pdfText);
      
      // Prepare context with annotations
      const annotationContext = annotations?.map(a => 
        `Annotation at page ${a.pageNumber}: ${a.elementType} - ${(a as any).notes || ''}`
      ).join('\n') || 'No annotations provided';
      
      // Build pragmatic prompt for Phase 1
      const prompt = this.buildPragmaticPrompt(
        pdfText, 
        annotationContext, 
        projectContext,
        patternPackData,
        autoConfig
      );

      // Call Anthropic API
      const response = await anthropic.messages.create({
        model: DEFAULT_MODEL_STR,
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // Lower temperature for consistency
      });

      // Parse the AI response
      const aiContent = (response.content[0] as any).text || '';
      console.log('AI Response Length:', aiContent.length);
      
      // Transform response to our MTO format
      const mtoData = this.parseAIResponse(aiContent);
      
      // Extract proposed pattern pack from AI response
      const proposedPatternPack = this.extractPatternPack(aiContent);
      
      // Calculate summary statistics
      const summary = this.calculateMTOSummary(mtoData);
      
      // Run compliance linting
      const lintResults = await complianceLintService.lintMTO(mtoData);
      const lintWarnings = lintResults.filter(r => r.severity === 'warning').map(r => r.message);
      const lintErrors = lintResults.filter(r => r.severity === 'error').map(r => r.message);
      
      // Calculate confidence
      const baseConfidence = patternPackData ? 0.85 : 0.75;
      const compliancePenalty = lintErrors.length * 0.05 + lintWarnings.length * 0.02;
      const confidence = Math.max(0.5, baseConfidence - compliancePenalty);
      const processingTime = Date.now() - startTime;
      
      // Save telemetry and pattern learning
      if (proposedPatternPack) {
        try {
          const [telemetryRecord] = await db.insert(aiRunTelemetry).values({
            projectType,
            patternPackUsedId: patternPackData?.id || null,
            patternPackProposed: proposedPatternPack,
            confidenceScore: confidence,
            processingTimeMs: processingTime,
            tokensUsed: response.usage?.total_tokens || 0,
            accuracyMetrics: {
              elementsDetected: mtoData.length,
              confidenceScore: confidence,
              patternMatchRate: patternPackData ? 0.75 : 0
            }
          }).returning({ id: aiRunTelemetry.id });
          
          // Save pattern pack
          if (proposedPatternPack) {
            await patternPackService.savePatternPack(
              organizationKey,
              projectType,
              proposedPatternPack,
              telemetryRecord.id
            );
          }
        } catch (error) {
          console.error('Failed to save telemetry/patterns:', error);
        }
      }
      
      console.log(`[${AI_VERSION}] Analysis complete: ${mtoData.length} MTO items extracted in ${processingTime}ms`);
      
      return {
        projectId: 0,
        mtoItems: mtoData,
        summary,
        aiAnalysis: {
          confidence,
          processingTime,
          elementsDetected: mtoData.length,
          warnings: [
            ...(patternPackData ? [] : ['First run for this project type - patterns being learned']),
            ...lintErrors,
            ...lintWarnings
          ],
          suggestions: [
            'Review beam connections for completeness',
            'Verify coating specifications with project requirements',
            ...(patternPackData ? [`Applied learned patterns from ${patternPackData.usage_count} previous runs`] : [])
          ]
        },
        autoConfig
      };
    } catch (error) {
      console.error('AI estimation failed:', error);
      throw new Error(`AI estimation analysis failed: ${(error as Error).message || 'Unknown error'}`);
    }
  }
  
  /**
   * Build pragmatic prompt for Phase 1 - simpler but effective
   */
  private buildPragmaticPrompt(
    pdfText: string,
    annotationContext: string,
    projectContext: string | undefined,
    patternPackData: any,
    autoConfig: any
  ): string {
    return `You are STEELIQ AI - an expert structural steel estimator analyzing construction drawings.

**SYSTEM VERSION:** ${AI_VERSION}
**PROJECT TYPE:** ${projectContext || 'Steel fabrication project'}
**DETECTED STANDARDS:** ${autoConfig.regionCodeSet || 'AS/NZS (Australian)'}
**UNITS:** ${autoConfig.unitsDefault || 'mm'}

${patternPackData ? `
**LEARNED PATTERNS FROM ${patternPackData.usage_count || 0} PREVIOUS RUNS:**
Apply these patterns to improve accuracy:
${JSON.stringify(patternPackData, null, 2).substring(0, 2000)}
` : '**FIRST RUN:** Learning patterns for future improvement'}

**DRAWING TEXT (First 10000 chars):**
${pdfText.substring(0, 10000)}

**USER ANNOTATIONS:**
${annotationContext}

**EXTRACT MATERIAL TAKE-OFF:**
1. Identify all structural steel elements (beams, columns, plates, etc)
2. Extract exact designations, dimensions, materials, quantities
3. Include connection details (end plates, bolts, welds)
4. Note grid locations and drawing references
5. Assign confidence scores based on clarity

**OUTPUT FORMAT:**
Return a JSON object with:
{
  "elements": [
    {
      "id": "unique-id",
      "designation": "B1",
      "type": "beam",
      "profile": "610UB125",
      "material": "AS300",
      "dimensions": { "length": 12000, "weight": 125 },
      "quantity": 1,
      "location": "Grid A1-A4",
      "confidence": 0.95,
      "evidence": {
        "page": 1,
        "extractionMethod": "TEXT"
      },
      "childItems": [...]
    }
  ],
  "pattern_pack_proposed": {
    "material_patterns": {},
    "connection_patterns": {},
    "designation_patterns": {}
  }
}

Ensure NO MOCK DATA - only extract what is actually in the drawings.`;
  }
  
  /**
   * Detect project type from context and PDF text
   */
  private detectProjectType(context: string, pdfText: string): string {
    const combined = (context + ' ' + pdfText).toLowerCase();
    
    if (combined.includes('warehouse') || combined.includes('portal frame')) {
      return 'warehouse';
    } else if (combined.includes('bridge') || combined.includes('girder')) {
      return 'bridge';
    } else if (combined.includes('high rise') || combined.includes('multi-storey')) {
      return 'commercial';
    } else if (combined.includes('residential') || combined.includes('house')) {
      return 'residential';
    } else if (combined.includes('industrial') || combined.includes('plant')) {
      return 'industrial';
    }
    
    return 'general';
  }
  
  /**
   * Lightweight auto-config detection for Phase 1
   */
  private detectAutoConfig(pdfText: string): any {
    const text = pdfText.toLowerCase();
    
    return {
      regionCodeSet: text.includes('as/nzs') || text.includes('as ') ? 'AS/NZS' :
                     text.includes('aisc') ? 'AISC' :
                     text.includes('bs en') ? 'BS EN' : 'AS/NZS',
      unitsDefault: text.includes('inch') || text.includes('feet') ? 'inch' : 'mm',
      weldStandard: text.includes('as/nzs 1554') ? 'AS/NZS 1554' :
                    text.includes('aws') ? 'AWS D1.1' : 'AS/NZS 1554',
      boltStandard: text.includes('as/nzs 1252') ? 'AS/NZS 1252' :
                    text.includes('astm') ? 'ASTM A325' : 'AS/NZS 1252',
      excludedPhrases: ['BY OTHERS', 'BY ARCHITECT', 'NOT IN CONTRACT']
    };
  }
  
  /**
   * Parse AI response into MTO items
   */
  private parseAIResponse(aiResponse: string): MaterialTakeOffItem[] {
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiResponse.match(/\{[\s\S]*\}/) ||
                       aiResponse.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        console.log('No JSON found in AI response');
        return [];
      }
      
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      // Handle different response formats
      const elements = parsed.elements || parsed.mtoItems || parsed.items || 
                      (Array.isArray(parsed) ? parsed : []);
      
      // Transform to our format
      return elements.map((item: any) => ({
        id: item.id || `EL-${Date.now()}-${Math.random()}`,
        designation: item.designation || item.mark || 'U1',
        type: this.mapElementType(item.type || item.element_type),
        description: item.description || `${item.profile || ''} ${item.type || ''}`,
        material: item.material || item.grade || 'AS350',
        dimensions: item.dimensions || {},
        quantity: item.quantity || 1,
        childItems: this.parseChildItems(item.childItems || item.connections || []),
        location: item.location || item.grid || '',
        drawingReference: item.drawingReference || `Page ${item.page || 1}`,
        confidence: item.confidence || item.confidence_score || 0.7,
        evidence: item.evidence || {
          fileId: 'current.pdf',
          page: item.page || 1,
          extractionMethod: item.extractionMethod || 'TEXT'
        }
      }));
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }
  
  /**
   * Map element types to our schema
   */
  private mapElementType(type: string): MaterialTakeOffItem['type'] {
    const typeMap: Record<string, MaterialTakeOffItem['type']> = {
      'BEAM': 'beam',
      'COLUMN': 'column',
      'PLATE': 'plate',
      'ANGLE': 'angle',
      'CHANNEL': 'channel',
      'TUBE': 'tube',
      'beam': 'beam',
      'column': 'column',
      'plate': 'plate'
    };
    
    return typeMap[type] || 'other';
  }
  
  /**
   * Parse child items (connections)
   */
  private parseChildItems(items: any[]): MaterialTakeOffOperation[] {
    if (!Array.isArray(items)) return [];
    
    return items.map((item, index) => ({
      id: item.id || `OP-${index}`,
      parentDesignation: item.parentDesignation || '',
      operationId: item.operationId || `4.${index + 1}`,
      type: item.type || 'endplate',
      description: item.description || '',
      specifications: item.specifications || item.spec || {},
      quantity: item.quantity || 1,
      laborHours: item.laborHours || 0
    }));
  }
  
  /**
   * Extract pattern pack from AI response
   */
  private extractPatternPack(aiResponse: string): any {
    try {
      const patternMatch = aiResponse.match(/"pattern_pack_proposed"\s*:\s*(\{[\s\S]*?\})/);
      if (patternMatch) {
        return JSON.parse(patternMatch[1]);
      }
    } catch (error) {
      console.log('Could not extract pattern pack from response');
    }
    return null;
  }
  
  /**
   * Calculate MTO summary statistics
   */
  private calculateMTOSummary(items: MaterialTakeOffItem[]): any {
    let totalWeight = 0;
    let totalLength = 0;
    const steelGrade: { [grade: string]: number } = {};
    const itemCounts: { [type: string]: number } = {};
    let estimatedHours = 0;

    for (const item of items) {
      // Calculate weight (simplified)
      const length = item.dimensions.length || 0;
      const weight = item.dimensions.weight || 0;
      const itemWeight = (length / 1000) * weight * item.quantity;
      totalWeight += itemWeight;
      totalLength += length * item.quantity;
      
      // Track steel grades
      const grade = item.material;
      steelGrade[grade] = (steelGrade[grade] || 0) + itemWeight;
      
      // Track item types
      itemCounts[item.type] = (itemCounts[item.type] || 0) + item.quantity;
      
      // Estimate fabrication hours
      estimatedHours += item.quantity * 2; // Simplified: 2 hours per item
      
      // Add child operation hours
      for (const child of item.childItems || []) {
        estimatedHours += child.laborHours || 0.5;
      }
    }
    
    return {
      totalWeight: Math.round(totalWeight),
      totalLength: Math.round(totalLength),
      steelGrade,
      itemCounts,
      estimatedFabricationHours: Math.round(estimatedHours),
      estimatedCost: {
        materials: Math.round(totalWeight * 2.5), // $2.50/kg simplified
        labor: Math.round(estimatedHours * 85), // $85/hour
        coating: Math.round(totalWeight * 0.5), // $0.50/kg
        total: 0
      }
    };
  }
}

export default new AIEstimationService();
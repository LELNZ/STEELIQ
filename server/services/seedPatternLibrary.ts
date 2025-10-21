/**
 * Seed Pattern Library with Initial Steel Patterns
 * Provides base patterns for AI to learn from
 */

import { db } from '../db';
import { aiPatternLibrary, aiLearningMetrics } from '@shared/schema';
import { sql } from 'drizzle-orm';

const steelElementPatterns = [
  {
    patternKey: 'beam_ub_pattern',
    patternType: 'element_detection',
    patternValue: {
      regex: /(\d+)UB(\d+\.?\d*)/gi,
      description: 'Universal Beam pattern',
      example: '610UB125',
      components: {
        depth: 'first number in mm',
        weight: 'number after UB in kg/m'
      }
    },
    confidence: 0.95
  },
  {
    patternKey: 'beam_uc_pattern',
    patternType: 'element_detection',
    patternValue: {
      regex: /(\d+)UC(\d+\.?\d*)/gi,
      description: 'Universal Column pattern',
      example: '310UC137',
      components: {
        depth: 'first number in mm',
        weight: 'number after UC in kg/m'
      }
    },
    confidence: 0.95
  },
  {
    patternKey: 'plate_pattern',
    patternType: 'element_detection',
    patternValue: {
      regex: /PL(\d+)\s*x\s*(\d+)/gi,
      description: 'Plate pattern',
      example: 'PL20x300',
      components: {
        thickness: 'first number in mm',
        width: 'second number in mm'
      }
    },
    confidence: 0.92
  },
  {
    patternKey: 'angle_ea_pattern',
    patternType: 'element_detection',
    patternValue: {
      regex: /EA(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/gi,
      description: 'Equal Angle pattern',
      example: 'EA100x100x10',
      components: {
        leg1: 'first dimension',
        leg2: 'second dimension',
        thickness: 'third dimension'
      }
    },
    confidence: 0.90
  },
  {
    patternKey: 'angle_ua_pattern',
    patternType: 'element_detection',
    patternValue: {
      regex: /UA(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/gi,
      description: 'Unequal Angle pattern',
      example: 'UA150x100x12',
      components: {
        leg1: 'larger dimension',
        leg2: 'smaller dimension',
        thickness: 'thickness'
      }
    },
    confidence: 0.88
  },
  {
    patternKey: 'channel_pfc_pattern',
    patternType: 'element_detection',
    patternValue: {
      regex: /PFC(\d+)\s*x\s*(\d+)/gi,
      description: 'Parallel Flange Channel pattern',
      example: 'PFC250x90',
      components: {
        depth: 'first number',
        width: 'second number'
      }
    },
    confidence: 0.91
  },
  {
    patternKey: 'shs_pattern',
    patternType: 'element_detection',
    patternValue: {
      regex: /SHS(\d+)\s*x\s*(\d+)\s*x\s*(\d+\.?\d*)/gi,
      description: 'Square Hollow Section pattern',
      example: 'SHS100x100x5',
      components: {
        width: 'first dimension',
        height: 'second dimension',
        thickness: 'wall thickness'
      }
    },
    confidence: 0.93
  },
  {
    patternKey: 'rhs_pattern',
    patternType: 'element_detection',
    patternValue: {
      regex: /RHS(\d+)\s*x\s*(\d+)\s*x\s*(\d+\.?\d*)/gi,
      description: 'Rectangular Hollow Section pattern',
      example: 'RHS200x100x8',
      components: {
        width: 'first dimension',
        height: 'second dimension',
        thickness: 'wall thickness'
      }
    },
    confidence: 0.93
  },
  {
    patternKey: 'chs_pattern',
    patternType: 'element_detection',
    patternValue: {
      regex: /CHS(\d+\.?\d*)\s*x\s*(\d+\.?\d*)/gi,
      description: 'Circular Hollow Section pattern',
      example: 'CHS219.1x8.2',
      components: {
        diameter: 'outside diameter',
        thickness: 'wall thickness'
      }
    },
    confidence: 0.91
  }
];

const dimensionPatterns = [
  {
    patternKey: 'length_mm_pattern',
    patternType: 'dimension_extraction',
    patternValue: {
      regex: /(\d+(?:,\d{3})*(?:\.\d+)?)\s*mm\s*(?:long|length|L)/gi,
      unit: 'mm',
      dimension: 'length',
      example: '6,000mm long'
    },
    confidence: 0.94
  },
  {
    patternKey: 'weight_kg_pattern',
    patternType: 'dimension_extraction',
    patternValue: {
      regex: /(\d+(?:\.\d+)?)\s*kg(?:\/m)?/gi,
      unit: 'kg',
      dimension: 'weight',
      example: '125.4kg/m'
    },
    confidence: 0.92
  },
  {
    patternKey: 'quantity_pattern',
    patternType: 'dimension_extraction',
    patternValue: {
      regex: /(?:qty|quantity)[:=\s]*(\d+)/gi,
      dimension: 'quantity',
      example: 'QTY: 12'
    },
    confidence: 0.96
  },
  {
    patternKey: 'grid_location_pattern',
    patternType: 'dimension_extraction',
    patternValue: {
      regex: /(?:grid|grids?)\s*([A-Z]\d+(?:\s*-\s*[A-Z]\d+)?)/gi,
      dimension: 'location',
      example: 'Grid A1-B3'
    },
    confidence: 0.88
  }
];

const materialPatterns = [
  {
    patternKey: 'grade_300_pattern',
    patternType: 'material_identification',
    patternValue: {
      regex: /(?:AS|Grade)\s*300/gi,
      grade: 'AS300',
      yieldStrength: 300,
      tensileStrength: 430
    },
    confidence: 0.95
  },
  {
    patternKey: 'grade_350_pattern',
    patternType: 'material_identification',
    patternValue: {
      regex: /(?:AS|Grade)\s*350/gi,
      grade: 'AS350',
      yieldStrength: 350,
      tensileStrength: 480
    },
    confidence: 0.95
  },
  {
    patternKey: 'grade_250_pattern',
    patternType: 'material_identification',
    patternValue: {
      regex: /(?:AS|Grade)\s*250/gi,
      grade: 'AS250',
      yieldStrength: 250,
      tensileStrength: 410
    },
    confidence: 0.94
  },
  {
    patternKey: 'galvanized_pattern',
    patternType: 'material_identification',
    patternValue: {
      regex: /(?:galv|galvanized|hdg|hot\s*dip)/gi,
      coating: 'Hot Dip Galvanized',
      standard: 'AS/NZS 4680'
    },
    confidence: 0.91
  }
];

export async function seedPatternLibrary() {
  console.log('🌱 Seeding Pattern Library with steel patterns...');
  
  try {
    // Clear existing patterns (optional - comment out to keep existing)
    // await db.delete(aiPatternLibrary);
    
    // Insert element patterns
    for (const pattern of steelElementPatterns) {
      await db.insert(aiPatternLibrary).values({
        patternType: pattern.patternType,
        patternKey: pattern.patternKey,
        patternValue: pattern.patternValue,
        confidence: pattern.confidence.toString(),
        successCount: 0,
        failureCount: 0,
        version: 1
      }).onConflictDoNothing();
    }
    
    // Insert dimension patterns
    for (const pattern of dimensionPatterns) {
      await db.insert(aiPatternLibrary).values({
        patternType: pattern.patternType,
        patternKey: pattern.patternKey,
        patternValue: pattern.patternValue,
        confidence: pattern.confidence.toString(),
        successCount: 0,
        failureCount: 0,
        version: 1
      }).onConflictDoNothing();
    }
    
    // Insert material patterns
    for (const pattern of materialPatterns) {
      await db.insert(aiPatternLibrary).values({
        patternType: pattern.patternType,
        patternKey: pattern.patternKey,
        patternValue: pattern.patternValue,
        confidence: pattern.confidence.toString(),
        successCount: 0,
        failureCount: 0,
        version: 1
      }).onConflictDoNothing();
    }
    
    // Create initial learning metric
    const today = new Date().toISOString().split('T')[0];
    await db.insert(aiLearningMetrics).values({
      date: today,
      projectsProcessed: 0,
      elementsExtracted: 0,
      correctionsReceived: 0,
      patternsLearned: steelElementPatterns.length + dimensionPatterns.length + materialPatterns.length,
      accuracyRate: '85.0',
      timeToProcess: '120',
      costSaved: '0',
      apiCostIncurred: '0',
      modelVersion: 'v4.2-base'
    }).onConflictDoNothing();
    
    console.log(`✅ Seeded ${steelElementPatterns.length + dimensionPatterns.length + materialPatterns.length} patterns successfully`);
    
    // Verify patterns were inserted
    const count = await db.execute(sql`SELECT COUNT(*) as count FROM ai_pattern_library`);
    console.log(`📊 Total patterns in library: ${count.rows[0].count}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error seeding pattern library:', error);
    return false;
  }
}

// Export for use in other modules
export default { seedPatternLibrary };
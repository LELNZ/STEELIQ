import { db } from '../db';
import { complianceLints, lintRules } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

export interface LintRule {
  id: number;
  name: string | null;
  category: string | null;
  description: string | null;
  ruleLogic: any;
  severityDefault: string | null;
  isActive: boolean | null;
}

export interface LintResult {
  ruleId: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
  details: any;
}

class ComplianceLintService {
  private standardRules: LintRule[] = [];
  private rulesInitialized: Promise<void>;
  
  constructor() {
    this.rulesInitialized = this.initializeDefaultRules();
  }
  
  /**
   * Initialize default compliance rules for Australian standards
   */
  private async initializeDefaultRules() {
    const defaultRules = [
      {
        name: 'AS4100 - Minimum Steel Grade',
        category: 'standards',
        description: 'Check if steel grade meets AS4100 requirements',
        ruleLogic: {
          type: 'material_grade',
          condition: 'minimum',
          value: 'AS250',
          message: 'Steel grade below AS250 detected'
        },
        severityDefault: 'warning' as const
      },
      {
        name: 'AS4100 - Bolt Spacing Requirements',
        category: 'standards',
        description: 'Verify bolt spacing meets AS4100 minimum requirements',
        ruleLogic: {
          type: 'bolt_spacing',
          condition: 'minimum',
          value: 2.5, // times bolt diameter
          message: 'Bolt spacing below 2.5 times diameter'
        },
        severityDefault: 'error' as const
      },
      {
        name: 'AS/NZS 4600 - Cold-Formed Steel Thickness',
        category: 'standards',
        description: 'Check minimum thickness for cold-formed steel',
        ruleLogic: {
          type: 'thickness',
          condition: 'minimum',
          value: 0.75, // mm
          message: 'Cold-formed steel thickness below 0.75mm'
        },
        severityDefault: 'error' as const
      },
      {
        name: 'Safety - Handrail Height',
        category: 'safety',
        description: 'Verify handrail height meets safety standards',
        ruleLogic: {
          type: 'dimension',
          condition: 'range',
          min: 900,
          max: 1100,
          message: 'Handrail height outside 900-1100mm range'
        },
        severityDefault: 'error' as const
      },
      {
        name: 'Quality - Weld Size Consistency',
        category: 'quality',
        description: 'Check for consistent weld sizes across similar joints',
        ruleLogic: {
          type: 'weld_size',
          condition: 'consistency',
          tolerance: 0.1, // 10% tolerance
          message: 'Inconsistent weld sizes detected'
        },
        severityDefault: 'warning' as const
      },
      {
        name: 'Efficiency - Material Utilization',
        category: 'efficiency',
        description: 'Check for efficient material usage',
        ruleLogic: {
          type: 'material_usage',
          condition: 'efficiency',
          threshold: 0.85, // 85% utilization target
          message: 'Material utilization below 85%'
        },
        severityDefault: 'info' as const
      }
    ];
    
    // Load or create rules in database
    for (const rule of defaultRules) {
      try {
        const existing = await db.select()
          .from(lintRules)
          .where(eq(lintRules.name, rule.name))
          .limit(1);
        
        if (existing.length === 0) {
          await db.insert(lintRules).values({
            name: rule.name,
            category: rule.category,
            description: rule.description,
            ruleLogic: rule.ruleLogic,
            severityDefault: rule.severityDefault,
            isActive: true
          });
          console.log(`Created lint rule: ${rule.name}`);
        }
      } catch (error) {
        console.error(`Failed to create rule ${rule.name}:`, error);
      }
    }
    
    // Load all active rules
    this.standardRules = await db.select()
      .from(lintRules)
      .where(eq(lintRules.isActive, true));
  }
  
  /**
   * Run compliance linting on MTO data
   */
  async lintMTO(mtoItems: any[], aiAnalysisId?: number): Promise<LintResult[]> {
    // Ensure rules are initialized before linting
    await this.rulesInitialized;
    
    const results: LintResult[] = [];
    
    for (const item of mtoItems) {
      for (const rule of this.standardRules) {
        const lintResult = this.evaluateRule(rule, item);
        if (lintResult) {
          results.push(lintResult);
          
          // Save to database if analysis ID provided
          if (aiAnalysisId) {
            await this.saveLintResult(aiAnalysisId, lintResult);
          }
        }
      }
    }
    
    return results;
  }
  
  /**
   * Evaluate a single rule against an MTO item
   */
  private evaluateRule(rule: LintRule, item: any): LintResult | null {
    const logic = rule.ruleLogic;
    
    switch (logic.type) {
      case 'material_grade':
        if (item.material && this.compareMaterialGrade(item.material, logic.value) < 0) {
          return {
            ruleId: rule.id,
            severity: rule.severityDefault,
            message: `${item.designation}: ${logic.message} (${item.material})`,
            details: { item: item.designation, material: item.material }
          };
        }
        break;
        
      case 'thickness':
        if (item.dimensions?.thickness && item.dimensions.thickness < logic.value) {
          return {
            ruleId: rule.id,
            severity: rule.severityDefault,
            message: `${item.designation}: ${logic.message} (${item.dimensions.thickness}mm)`,
            details: { item: item.designation, thickness: item.dimensions.thickness }
          };
        }
        break;
        
      case 'bolt_spacing':
        // Check child items for bolt patterns
        for (const child of item.childItems || []) {
          if (child.specifications?.holes && child.specifications.holes.pattern) {
            // Simplified check - would need actual pattern analysis
            const spacing = this.estimateBoltSpacing(child.specifications.holes);
            if (spacing < logic.value * child.specifications.holes.diameter) {
              return {
                ruleId: rule.id,
                severity: rule.severityDefault,
                message: `${item.designation}: ${logic.message}`,
                details: { item: item.designation, spacing }
              };
            }
          }
        }
        break;
        
      case 'weld_size':
        // Check weld consistency across similar items
        const weldSizes = (item.childItems || [])
          .filter(c => c.specifications?.weldSize)
          .map(c => c.specifications.weldSize);
        
        if (weldSizes.length > 1) {
          const avg = weldSizes.reduce((a, b) => a + b, 0) / weldSizes.length;
          const maxDeviation = Math.max(...weldSizes.map(s => Math.abs(s - avg) / avg));
          
          if (maxDeviation > logic.tolerance) {
            return {
              ruleId: rule.id,
              severity: rule.severityDefault,
              message: `${item.designation}: ${logic.message}`,
              details: { item: item.designation, weldSizes, deviation: maxDeviation }
            };
          }
        }
        break;
    }
    
    return null;
  }
  
  /**
   * Compare material grades (simplified)
   */
  private compareMaterialGrade(grade1: string, grade2: string): number {
    const grades = ['AS200', 'AS250', 'AS300', 'AS350', 'AS400'];
    const index1 = grades.indexOf(grade1);
    const index2 = grades.indexOf(grade2);
    
    if (index1 === -1 || index2 === -1) return 0;
    return index1 - index2;
  }
  
  /**
   * Estimate bolt spacing from pattern (simplified)
   */
  private estimateBoltSpacing(holes: any): number {
    if (!holes.pattern) return 100; // Default safe value
    
    const parts = holes.pattern.split('x');
    if (parts.length === 2) {
      const rows = parseInt(parts[0]);
      const cols = parseInt(parts[1]);
      // Rough estimate - would need actual dimensions
      return 100 / Math.max(rows - 1, cols - 1);
    }
    
    return 100;
  }
  
  /**
   * Save lint result to database
   */
  private async saveLintResult(aiAnalysisId: number, result: LintResult) {
    try {
      await db.insert(complianceLints).values({
        aiAnalysisId,
        lintRuleId: result.ruleId,
        severity: result.severity,
        message: result.message,
        details: result.details,
        isResolved: false
      });
    } catch (error) {
      console.error('Failed to save lint result:', error);
    }
  }
  
  /**
   * Get lint statistics for an organization
   */
  async getLintStats(organizationKey: string = 'default'): Promise<any> {
    const stats = await db.select({
      severity: complianceLints.severity,
      count: db.sql<number>`COUNT(*)`
    })
    .from(complianceLints)
    .groupBy(complianceLints.severity);
    
    const byCategory = await db.select({
      category: lintRules.category,
      count: db.sql<number>`COUNT(*)`
    })
    .from(complianceLints)
    .innerJoin(lintRules, eq(complianceLints.lintRuleId, lintRules.id))
    .groupBy(lintRules.category);
    
    return {
      bySeverity: stats,
      byCategory,
      totalIssues: stats.reduce((sum, s) => sum + Number(s.count), 0)
    };
  }
}

export default new ComplianceLintService();
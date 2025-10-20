/**
 * Feedback Learning Service - Enhanced Self-Learning for 15-20% Accuracy Improvement
 * Fortune 50 Level Machine Learning Pipeline
 */

import { db } from '../db';
import { 
  ai_feedback_entries,
  patternPacks,
  patternLearningEvents,
  aiRunTelemetry,
  ai_mto_evidence
} from '@shared/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { patternPackService } from './patternPackService';
import { aiMonitoringService } from './aiMonitoringService';

interface UserCorrection {
  elementId: string;
  field: string;
  originalValue: any;
  correctedValue: any;
  reason?: string;
}

interface LearningMetrics {
  accuracyRate: number;
  improvementDelta: number;
  totalRuns: number;
  correctionsApplied: number;
  patternConfidence: number;
}

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  confidenceAdjustment: number;
}

class FeedbackLearningService {
  private readonly ACCURACY_IMPROVEMENT_TARGET = 0.15; // 15% minimum
  private readonly LEARNING_THRESHOLD = 10; // Runs needed before measuring improvement
  private readonly CONFIDENCE_DECAY_RATE = 0.95; // Decay unused patterns
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.3; // Minimum confidence to use pattern
  
  /**
   * Process user feedback and corrections
   * This is the primary entry point for improving accuracy
   */
  async processUserFeedback(
    jobId: string,
    userId: number,
    corrections: UserCorrection[],
    rating?: number,
    comments?: string
  ): Promise<LearningMetrics> {
    console.log(`[FeedbackLearning] Processing ${corrections.length} corrections for job ${jobId}`);
    
    try {
      // Store feedback entry
      const [feedbackEntry] = await db.insert(ai_feedback_entries).values({
        jobId,
        userId,
        rating,
        corrections: corrections as any,
        comments,
        approved: rating ? rating >= 4 : false,
        createdAt: new Date()
      }).returning();
      
      // Process each correction
      const learningResults = await Promise.all(
        corrections.map(correction => this.applyCorrection(jobId, correction))
      );
      
      // Calculate learning metrics
      const metrics = await this.calculateLearningMetrics(jobId);
      
      // Update pattern confidence based on feedback
      await this.updatePatternConfidence(jobId, corrections, rating);
      
      // Trigger pattern revalidation if significant corrections
      if (corrections.length > 5 || rating && rating <= 2) {
        await this.triggerPatternRevalidation(jobId);
      }
      
      // Record metrics
      await aiMonitoringService.recordMetric({
        name: 'feedback_processed',
        value: corrections.length,
        unit: 'corrections',
        tags: { jobId, userId: userId.toString() }
      });
      
      console.log(`[FeedbackLearning] Metrics: ${JSON.stringify(metrics)}`);
      return metrics;
      
    } catch (error) {
      console.error('[FeedbackLearning] Error processing feedback:', error);
      throw error;
    }
  }
  
  /**
   * Apply a single correction and learn from it
   */
  private async applyCorrection(jobId: string, correction: UserCorrection): Promise<void> {
    // Find the pattern pack associated with this job
    const telemetry = await db
      .select()
      .from(aiRunTelemetry)
      .where(eq(aiRunTelemetry.id, parseInt(jobId)))
      .limit(1);
    
    if (!telemetry.length) {
      console.warn(`[FeedbackLearning] No telemetry found for job ${jobId}`);
      return;
    }
    
    const organizationKey = telemetry[0].organizationKey || 'default';
    const projectType = telemetry[0].projectType || 'general';
    
    // Load current pattern pack
    const patternPack = await patternPackService.loadPatternPack(organizationKey, projectType);
    
    if (!patternPack) {
      console.warn('[FeedbackLearning] No pattern pack found to update');
      return;
    }
    
    // Update pattern based on correction type
    const updatedPattern = this.updatePatternFromCorrection(patternPack, correction);
    
    // Save updated pattern with learning event
    await patternPackService.savePatternPack(
      organizationKey,
      projectType,
      updatedPattern,
      parseInt(jobId)
    );
    
    // Record learning event
    await db.insert(patternLearningEvents).values({
      patternPackId: patternPack.id || 0,
      aiAnalysisId: parseInt(jobId),
      eventType: 'user_correction',
      originalValue: { [correction.field]: correction.originalValue },
      correctedValue: { [correction.field]: correction.correctedValue },
      confidenceDelta: this.calculateConfidenceDelta(correction)
    });
  }
  
  /**
   * Update pattern based on correction
   */
  private updatePatternFromCorrection(pattern: any, correction: UserCorrection): any {
    const updatedPattern = { ...pattern };
    
    // Handle different correction types
    switch (correction.field) {
      case 'designation':
        // Learn designation patterns
        if (!updatedPattern.designation_patterns) {
          updatedPattern.designation_patterns = {};
        }
        updatedPattern.designation_patterns[correction.originalValue] = correction.correctedValue;
        break;
        
      case 'material':
        // Learn material aliases
        if (!updatedPattern.legend_aliases) {
          updatedPattern.legend_aliases = {};
        }
        updatedPattern.legend_aliases[correction.originalValue] = correction.correctedValue;
        break;
        
      case 'quantity':
        // Learn counting rules
        if (!updatedPattern.measurement_guardrails) {
          updatedPattern.measurement_guardrails = {};
        }
        updatedPattern.measurement_guardrails.quantity_patterns = {
          ...updatedPattern.measurement_guardrails.quantity_patterns,
          [correction.originalValue]: correction.correctedValue
        };
        break;
        
      case 'dimensions':
        // Learn dimension extraction patterns
        if (!updatedPattern.measurement_guardrails) {
          updatedPattern.measurement_guardrails = {};
        }
        updatedPattern.measurement_guardrails.dimension_patterns = {
          ...updatedPattern.measurement_guardrails.dimension_patterns,
          learned: true,
          corrections: [
            ...(updatedPattern.measurement_guardrails.dimension_patterns?.corrections || []),
            { from: correction.originalValue, to: correction.correctedValue }
          ]
        };
        break;
        
      default:
        // Generic field update
        updatedPattern[`${correction.field}_corrections`] = {
          ...updatedPattern[`${correction.field}_corrections`],
          [correction.originalValue]: correction.correctedValue
        };
    }
    
    // Increment version
    const currentVersion = updatedPattern.version || '1.0.0';
    const versionParts = currentVersion.split('.');
    versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
    updatedPattern.version = versionParts.join('.');
    
    return updatedPattern;
  }
  
  /**
   * Calculate confidence adjustment based on correction severity
   */
  private calculateConfidenceDelta(correction: UserCorrection): number {
    // Major errors get larger negative deltas
    if (correction.field === 'quantity' || correction.field === 'designation') {
      return -10; // Critical fields
    } else if (correction.field === 'material' || correction.field === 'dimensions') {
      return -5; // Important fields
    } else {
      return -2; // Minor fields
    }
  }
  
  /**
   * Update pattern confidence based on feedback
   */
  private async updatePatternConfidence(
    jobId: string,
    corrections: UserCorrection[],
    rating?: number
  ): Promise<void> {
    // Calculate overall confidence adjustment
    let confidenceAdjustment = 0;
    
    if (rating) {
      // Rating-based adjustment: 5 stars = +10, 1 star = -20
      confidenceAdjustment += (rating - 3) * 5;
    }
    
    // Correction-based adjustment
    confidenceAdjustment += corrections.reduce(
      (sum, c) => sum + this.calculateConfidenceDelta(c), 
      0
    );
    
    // Get associated pattern pack
    const telemetry = await db
      .select()
      .from(aiRunTelemetry)
      .where(eq(aiRunTelemetry.id, parseInt(jobId)))
      .limit(1);
    
    if (telemetry.length && telemetry[0].patternPackId) {
      // Update pattern pack confidence
      await db
        .update(patternPacks)
        .set({
          confidenceScore: sql`GREATEST(0, LEAST(100, confidence_score + ${confidenceAdjustment}))`
        })
        .where(eq(patternPacks.id, telemetry[0].patternPackId));
    }
  }
  
  /**
   * Calculate learning metrics to track improvement
   */
  async calculateLearningMetrics(jobId: string): Promise<LearningMetrics> {
    // Get telemetry for this job
    const telemetry = await db
      .select()
      .from(aiRunTelemetry)
      .where(eq(aiRunTelemetry.id, parseInt(jobId)))
      .limit(1);
    
    if (!telemetry.length) {
      return {
        accuracyRate: 0,
        improvementDelta: 0,
        totalRuns: 0,
        correctionsApplied: 0,
        patternConfidence: 0
      };
    }
    
    const organizationKey = telemetry[0].organizationKey || 'default';
    const projectType = telemetry[0].projectType || 'general';
    
    // Get all runs for this organization and project type
    const allRuns = await db
      .select()
      .from(aiRunTelemetry)
      .where(
        and(
          eq(aiRunTelemetry.organizationKey, organizationKey),
          eq(aiRunTelemetry.projectType, projectType)
        )
      )
      .orderBy(desc(aiRunTelemetry.createdAt));
    
    // Get feedback for these runs
    const feedbackData = await db
      .select()
      .from(ai_feedback_entries)
      .where(sql`job_id IN (${sql.join(allRuns.map(r => sql`${r.id.toString()}`), sql`, `)})`)
      .orderBy(desc(ai_feedback_entries.createdAt));
    
    // Calculate metrics
    const totalRuns = allRuns.length;
    const totalCorrections = feedbackData.reduce(
      (sum, f) => sum + (f.corrections ? (f.corrections as any[]).length : 0), 
      0
    );
    
    // Calculate accuracy rate (inverse of correction rate)
    const avgCorrectionsPerRun = totalRuns > 0 ? totalCorrections / totalRuns : 0;
    const accuracyRate = Math.max(0, 1 - (avgCorrectionsPerRun / 100)); // Assume 100 items per run avg
    
    // Calculate improvement over time
    let improvementDelta = 0;
    if (totalRuns >= this.LEARNING_THRESHOLD) {
      const recentRuns = allRuns.slice(0, 5);
      const oldRuns = allRuns.slice(-5);
      
      const recentCorrections = feedbackData.filter(f => 
        recentRuns.some(r => r.id.toString() === f.jobId)
      ).reduce((sum, f) => sum + (f.corrections as any[]).length, 0) / recentRuns.length;
      
      const oldCorrections = feedbackData.filter(f =>
        oldRuns.some(r => r.id.toString() === f.jobId)  
      ).reduce((sum, f) => sum + (f.corrections as any[]).length, 0) / oldRuns.length;
      
      improvementDelta = oldCorrections > 0 ? 
        (oldCorrections - recentCorrections) / oldCorrections : 0;
    }
    
    // Get current pattern confidence
    let patternConfidence = 0;
    if (telemetry[0].patternPackId) {
      const patternPack = await db
        .select()
        .from(patternPacks)
        .where(eq(patternPacks.id, telemetry[0].patternPackId))
        .limit(1);
      
      if (patternPack.length) {
        patternConfidence = (patternPack[0].confidenceScore || 0) / 100;
      }
    }
    
    return {
      accuracyRate,
      improvementDelta,
      totalRuns,
      correctionsApplied: totalCorrections,
      patternConfidence
    };
  }
  
  /**
   * Validate pattern before accepting into production
   */
  async validatePattern(patternData: any): Promise<ValidationResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidenceAdjustment = 0;
    
    // Check for required fields
    if (!patternData.version) {
      issues.push('Pattern missing version number');
      confidenceAdjustment -= 5;
    }
    
    // Validate legend aliases
    if (patternData.legend_aliases) {
      const aliases = Object.keys(patternData.legend_aliases);
      if (aliases.length < 3) {
        suggestions.push('Consider adding more material aliases for better coverage');
      }
      
      // Check for conflicting aliases
      const values = Object.values(patternData.legend_aliases);
      const duplicates = values.filter((v, i) => values.indexOf(v) !== i);
      if (duplicates.length > 0) {
        issues.push(`Duplicate alias mappings found: ${duplicates.join(', ')}`);
        confidenceAdjustment -= 10;
      }
    }
    
    // Validate measurement guardrails
    if (patternData.measurement_guardrails) {
      if (!patternData.measurement_guardrails.min_beam_length) {
        suggestions.push('Add minimum beam length guardrail to prevent false positives');
      }
      if (!patternData.measurement_guardrails.max_beam_length) {
        suggestions.push('Add maximum beam length guardrail for validation');
      }
    }
    
    // Check pattern complexity
    const complexity = this.calculatePatternComplexity(patternData);
    if (complexity < 0.3) {
      suggestions.push('Pattern is too simple - may not capture edge cases');
      confidenceAdjustment -= 5;
    } else if (complexity > 0.8) {
      issues.push('Pattern is overly complex - may cause performance issues');
      confidenceAdjustment -= 10;
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
      confidenceAdjustment
    };
  }
  
  /**
   * Calculate pattern complexity score
   */
  private calculatePatternComplexity(pattern: any): number {
    let complexity = 0;
    let fieldCount = 0;
    
    // Count fields and nested structures
    for (const key in pattern) {
      if (pattern.hasOwnProperty(key)) {
        fieldCount++;
        if (typeof pattern[key] === 'object' && pattern[key] !== null) {
          complexity += Object.keys(pattern[key]).length * 0.1;
        }
      }
    }
    
    complexity += fieldCount * 0.05;
    return Math.min(1, complexity);
  }
  
  /**
   * Trigger pattern revalidation when significant issues detected
   */
  private async triggerPatternRevalidation(jobId: string): Promise<void> {
    console.log(`[FeedbackLearning] Triggering pattern revalidation for job ${jobId}`);
    
    // Get all evidence for this job
    const evidence = await db
      .select()
      .from(ai_mto_evidence)
      .where(eq(ai_mto_evidence.runTelemetryId, parseInt(jobId)));
    
    // Group evidence by confidence level
    const lowConfidence = evidence.filter(e => (e.confidenceScore || 0) < 0.5);
    const mediumConfidence = evidence.filter(e => 
      (e.confidenceScore || 0) >= 0.5 && (e.confidenceScore || 0) < 0.8
    );
    
    // Flag patterns that need review
    if (lowConfidence.length > evidence.length * 0.3) {
      await aiMonitoringService.recordAlert({
        level: 'warning',
        message: `Pattern needs review: ${lowConfidence.length} low-confidence extractions`,
        details: { jobId, totalEvidence: evidence.length, lowConfidence: lowConfidence.length }
      });
    }
  }
  
  /**
   * Get learning progress towards 15-20% improvement goal
   */
  async getLearningProgress(
    organizationKey: string = 'default',
    projectType: string = 'general'
  ): Promise<{
    currentImprovement: number;
    targetImprovement: number;
    runsCompleted: number;
    runsToTarget: number;
    estimatedAccuracy: number;
  }> {
    // Get all runs for this org/project
    const runs = await db
      .select()
      .from(aiRunTelemetry)
      .where(
        and(
          eq(aiRunTelemetry.organizationKey, organizationKey),
          eq(aiRunTelemetry.projectType, projectType)
        )
      );
    
    const metrics = await this.calculateLearningMetrics(
      runs.length > 0 ? runs[0].id.toString() : '0'
    );
    
    // Calculate progress
    const currentImprovement = metrics.improvementDelta;
    const runsCompleted = metrics.totalRuns;
    const runsToTarget = Math.max(0, this.LEARNING_THRESHOLD - runsCompleted);
    
    // Estimate accuracy based on pattern confidence and corrections
    const baseAccuracy = 0.7; // Starting accuracy
    const estimatedAccuracy = Math.min(
      0.95,
      baseAccuracy + (currentImprovement * baseAccuracy) + (metrics.patternConfidence * 0.1)
    );
    
    return {
      currentImprovement,
      targetImprovement: this.ACCURACY_IMPROVEMENT_TARGET,
      runsCompleted,
      runsToTarget,
      estimatedAccuracy
    };
  }
  
  /**
   * Decay confidence of unused patterns
   */
  async decayUnusedPatterns(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Decay patterns not used in 30 days
    await db
      .update(patternPacks)
      .set({
        confidenceScore: sql`GREATEST(30, confidence_score * ${this.CONFIDENCE_DECAY_RATE})`
      })
      .where(sql`last_used_at < ${thirtyDaysAgo}`);
    
    console.log('[FeedbackLearning] Decayed confidence of unused patterns');
  }
}

export const feedbackLearningService = new FeedbackLearningService();
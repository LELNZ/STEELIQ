import { db } from "../db";
import { patternPacks, patternLearningEvents, autoConfigurations, aiRunTelemetry } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";

interface PatternPackData {
  title_block_layout?: any;
  legend_aliases?: Record<string, string>;
  hole_policy_extracted?: any;
  bolt_grade_policy?: any;
  weld_symbol_family?: string;
  excluded_by_notes_phrases?: string[];
  handrail_detection_terms?: string[];
  measurement_guardrails?: any;
  style_features?: any;
  version?: string;
}

export class PatternPackService {
  /**
   * Generate a checksum for pattern pack data
   */
  private generateChecksum(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Load the most relevant pattern pack for a project
   */
  async loadPatternPack(organizationKey: string = 'default', projectType?: string): Promise<PatternPackData | null> {
    try {
      // Find the most relevant pattern pack
      const conditions = [eq(patternPacks.organizationKey, organizationKey)];
      if (projectType) {
        conditions.push(eq(patternPacks.projectType, projectType));
      }

      const patterns = await db
        .select()
        .from(patternPacks)
        .where(and(...conditions))
        .orderBy(desc(patternPacks.confidenceScore), desc(patternPacks.usageCount))
        .limit(1);

      if (patterns.length === 0) {
        console.log('No pattern pack found for organization:', organizationKey);
        return null;
      }

      const pattern = patterns[0];
      
      // Update usage statistics
      await db
        .update(patternPacks)
        .set({
          usageCount: (pattern.usageCount || 0) + 1,
          lastUsedAt: new Date()
        })
        .where(eq(patternPacks.id, pattern.id));

      console.log(`Loaded pattern pack ${pattern.id} v${pattern.version} for organization ${organizationKey}`);
      
      return pattern.patternData as PatternPackData;
    } catch (error) {
      console.error('Error loading pattern pack:', error);
      return null;
    }
  }

  /**
   * Save or update a pattern pack from AI analysis
   */
  async savePatternPack(
    organizationKey: string = 'default',
    projectType: string,
    patternData: PatternPackData,
    analysisId: number
  ): Promise<number> {
    try {
      const checksum = this.generateChecksum(patternData);
      const version = patternData.version || '1.0.0';

      // Check if similar pattern pack exists
      const existing = await db
        .select()
        .from(patternPacks)
        .where(
          and(
            eq(patternPacks.organizationKey, organizationKey),
            eq(patternPacks.projectType, projectType),
            eq(patternPacks.checksum, checksum)
          )
        )
        .limit(1);

      let patternPackId: number;

      if (existing.length > 0) {
        // Update existing pattern pack
        patternPackId = existing[0].id;
        
        await db
          .update(patternPacks)
          .set({
            patternData,
            version,
            confidenceScore: Math.min(100, (existing[0].confidenceScore || 50) + 2), // Increase confidence
            usageCount: (existing[0].usageCount || 0) + 1,
            lastUsedAt: new Date(),
            // Update individual fields for querying
            legendAliases: patternData.legend_aliases,
            holePolicyExtracted: patternData.hole_policy_extracted,
            boltGradePolicy: patternData.bolt_grade_policy,
            weldSymbolFamily: patternData.weld_symbol_family,
            excludedPhrases: patternData.excluded_by_notes_phrases,
            handrailDetectionTerms: patternData.handrail_detection_terms,
            measurementGuardrails: patternData.measurement_guardrails,
            styleFeatures: patternData.style_features
          })
          .where(eq(patternPacks.id, patternPackId));

        console.log(`Updated pattern pack ${patternPackId} for organization ${organizationKey}`);
      } else {
        // Create new pattern pack
        const [newPack] = await db
          .insert(patternPacks)
          .values({
            organizationKey,
            projectType,
            patternData,
            version,
            checksum,
            confidenceScore: 70, // Start with moderate confidence
            usageCount: 1,
            lastUsedAt: new Date(),
            // Store individual fields for querying
            titleBlockLayout: patternData.title_block_layout,
            legendAliases: patternData.legend_aliases,
            holePolicyExtracted: patternData.hole_policy_extracted,
            boltGradePolicy: patternData.bolt_grade_policy,
            weldSymbolFamily: patternData.weld_symbol_family,
            excludedPhrases: patternData.excluded_by_notes_phrases,
            handrailDetectionTerms: patternData.handrail_detection_terms,
            measurementGuardrails: patternData.measurement_guardrails,
            styleFeatures: patternData.style_features
          })
          .returning({ id: patternPacks.id });

        patternPackId = newPack.id;
        console.log(`Created new pattern pack ${patternPackId} for organization ${organizationKey}`);
      }

      // Record learning event
      await db.insert(patternLearningEvents).values({
        patternPackId,
        aiAnalysisId: analysisId,
        eventType: existing.length > 0 ? 'enhancement' : 'creation',
        originalValue: existing.length > 0 ? existing[0].patternData : null,
        correctedValue: patternData,
        confidenceDelta: existing.length > 0 ? 2 : 0
      });

      return patternPackId;
    } catch (error) {
      console.error('Error saving pattern pack:', error);
      throw error;
    }
  }

  /**
   * Merge pattern pack with live sheet detections
   */
  mergePatterns(
    patternPackIn: PatternPackData | null,
    liveDetections: PatternPackData
  ): PatternPackData {
    if (!patternPackIn) {
      return liveDetections;
    }

    // Live detections always override pattern pack
    return {
      ...patternPackIn,
      ...liveDetections,
      // Merge arrays (live takes precedence but keep unique values)
      excluded_by_notes_phrases: [
        ...new Set([
          ...(liveDetections.excluded_by_notes_phrases || []),
          ...(patternPackIn.excluded_by_notes_phrases || [])
        ])
      ],
      handrail_detection_terms: [
        ...new Set([
          ...(liveDetections.handrail_detection_terms || []),
          ...(patternPackIn.handrail_detection_terms || [])
        ])
      ],
      // Merge objects (live overrides)
      legend_aliases: {
        ...patternPackIn.legend_aliases,
        ...liveDetections.legend_aliases
      },
      bolt_grade_policy: {
        ...patternPackIn.bolt_grade_policy,
        ...liveDetections.bolt_grade_policy
      }
    };
  }

  /**
   * Record pattern conflicts for learning
   */
  async recordConflict(
    patternPackId: number,
    analysisId: number,
    field: string,
    patternValue: any,
    liveValue: any
  ): Promise<void> {
    await db.insert(patternLearningEvents).values({
      patternPackId,
      aiAnalysisId: analysisId,
      eventType: 'conflict',
      originalValue: { [field]: patternValue },
      correctedValue: { [field]: liveValue },
      confidenceDelta: -5 // Reduce confidence on conflicts
    });

    // Reduce pattern pack confidence if too many conflicts
    await db
      .update(patternPacks)
      .set({
        confidenceScore: db.sql`GREATEST(0, confidence_score - 5)`
      })
      .where(eq(patternPacks.id, patternPackId));
  }

  /**
   * Get learning statistics for an organization
   */
  async getLearningStats(organizationKey: string = 'default'): Promise<any> {
    const patterns = await db
      .select({
        count: db.sql<number>`COUNT(*)`,
        avgConfidence: db.sql<number>`AVG(confidence_score)`,
        totalUsage: db.sql<number>`SUM(usage_count)`
      })
      .from(patternPacks)
      .where(eq(patternPacks.organizationKey, organizationKey));

    const events = await db
      .select({
        eventType: patternLearningEvents.eventType,
        count: db.sql<number>`COUNT(*)`
      })
      .from(patternLearningEvents)
      .innerJoin(patternPacks, eq(patternLearningEvents.patternPackId, patternPacks.id))
      .where(eq(patternPacks.organizationKey, organizationKey))
      .groupBy(patternLearningEvents.eventType);

    return {
      patternPackCount: patterns[0]?.count || 0,
      averageConfidence: patterns[0]?.avgConfidence || 0,
      totalUsage: patterns[0]?.totalUsage || 0,
      learningEvents: events
    };
  }

  /**
   * Clean up old or unused pattern packs
   */
  async cleanupOldPatterns(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db
      .delete(patternPacks)
      .where(
        and(
          db.sql`last_used_at < ${cutoffDate}`,
          db.sql`usage_count < 3`,
          db.sql`confidence_score < 50`
        )
      );

    console.log(`Cleaned up ${result.count || 0} old pattern packs`);
    return result.count || 0;
  }

  /**
   * Save auto-configuration detected from drawings
   */
  async saveAutoConfiguration(analysisId: number, config: any): Promise<void> {
    await db.insert(autoConfigurations).values({
      aiAnalysisId: analysisId,
      regionCodeSet: config.region_code_set,
      unitsDefault: config.units_default,
      ntsDoNotScale: config.nts_do_not_scale,
      weldStandard: config.weld_standard,
      boltStandard: config.bolt_standard,
      boltGradePolicy: config.bolt_grade_policy,
      holeOversizeTable: config.hole_oversize_table,
      coatingsMacroclimate: config.coatings_macroclimate,
      excludedByNotesPhrases: config.excluded_by_notes_phrases,
      includeHandrails: config.include_handrails,
      legendMap: config.legend_map,
      detectionConfidence: config.detection_confidence || 85
    });
  }

  /**
   * Save telemetry for AI run
   */
  async saveTelemetry(analysisId: number, telemetry: any): Promise<void> {
    await db.insert(aiRunTelemetry).values({
      aiAnalysisId: analysisId,
      startedAt: telemetry.started_at,
      completedAt: new Date(),
      modelName: telemetry.model_name || 'claude-3-opus-20240229',
      promptVersion: telemetry.prompt_version || 'STEELIQ-V4.2-AUTO',
      detectorVersions: telemetry.detector_versions,
      patternPackInHash: telemetry.pattern_pack_in_hash,
      patternPackUsed: telemetry.pattern_pack_used,
      pagesScanned: telemetry.pages_scanned,
      elementsFound: telemetry.elements_found,
      elementsFlagged: telemetry.elements_flagged,
      conflictsCount: telemetry.conflicts_count,
      scaleMissingViews: telemetry.scale_missing_views,
      lintsGenerated: telemetry.lints_generated,
      processingTimeMs: Date.now() - telemetry.started_at,
      visionApiCalls: telemetry.vision_api_calls || 1,
      totalTokensUsed: telemetry.total_tokens_used
    });
  }
}

// Export singleton instance
export const patternPackService = new PatternPackService();
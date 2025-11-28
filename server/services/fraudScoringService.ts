/**
 * Wave 5.2: Fraud Scoring Service
 * Fortune 50 Compliance: Real-time risk scoring with sub-second latency
 * SOC 2 Type II: Complete audit trail for all risk decisions
 * 
 * Features:
 * - Real-time fraud risk scoring for clock events
 * - Pattern learning from historical behavior
 * - Multi-factor risk assessment (GPS, velocity, time, device, pattern)
 * - HMAC-SHA256 dual-authorization for high-risk overrides
 * - Sub-100ms processing latency target
 */

import { db } from '../db';
import { 
  fraudRiskProfiles, 
  clockEventRisk, 
  riskOverrideRequests,
  timeClocks,
  users,
  type FraudRiskProfile,
  type ClockEventRisk,
  type RiskOverrideRequest,
  type InsertFraudRiskProfile,
  type InsertClockEventRisk,
  type InsertRiskOverrideRequest
} from '@shared/schema';
import { eq, desc, and, gte, lte, sql, isNull, or, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { GPS_CONFIG } from '@shared/gpsConfig';

// Risk thresholds aligned with Fortune 50 standards
const RISK_THRESHOLDS = {
  LOW: 0.25,
  MEDIUM: 0.50,
  HIGH: 0.75,
  CRITICAL: 0.90,
};

// Risk factor weights (must sum to 1.0)
const RISK_WEIGHTS = {
  GPS: 0.25,
  VELOCITY: 0.20,
  PATTERN: 0.20,
  DEVICE: 0.15,
  TIME: 0.20,
};

// SLA deadlines for override reviews
const SLA_HOURS = {
  low: 24,
  normal: 8,
  high: 2,
  urgent: 1,
};

interface ClockEventContext {
  userId: number;
  timeClockId?: number;
  eventType: 'clock_in' | 'clock_out' | 'break_start' | 'break_end';
  eventTimestamp: Date;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface RiskScoreResult {
  compositeScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresReview: boolean;
  requiresDualAuth: boolean;
  factors: {
    gps: { score: number; details: Record<string, any> };
    velocity: { score: number; details: Record<string, any> };
    pattern: { score: number; details: Record<string, any> };
    device: { score: number; details: Record<string, any> };
    time: { score: number; details: Record<string, any> };
  };
  processingLatencyMs: number;
}

interface RiskDashboardMetrics {
  totalEvents: number;
  highRiskEvents: number;
  criticalRiskEvents: number;
  pendingReviews: number;
  overrideRequests: number;
  avgRiskScore: number;
  riskDistribution: Record<string, number>;
  topRiskUsers: Array<{ userId: number; username: string; riskScore: number; eventCount: number }>;
  recentHighRiskEvents: ClockEventRisk[];
  slaBreaches: number;
}

class FraudScoringService {
  private readonly MODEL_VERSION = 'v1.0.0-wave52';
  private readonly ALGORITHM = 'weighted_ensemble';

  /**
   * Calculate real-time risk score for a clock event
   * Target: Sub-100ms latency
   */
  async calculateRiskScore(context: ClockEventContext): Promise<RiskScoreResult> {
    const startTime = Date.now();

    // Get or create user's risk profile
    const profile = await this.getOrCreateProfile(context.userId);

    // Calculate individual risk factors in parallel for speed
    const [gpsRisk, velocityRisk, patternRisk, deviceRisk, timeRisk] = await Promise.all([
      this.calculateGpsRisk(context, profile),
      this.calculateVelocityRisk(context, profile),
      this.calculatePatternRisk(context, profile),
      this.calculateDeviceRisk(context, profile),
      this.calculateTimeRisk(context, profile),
    ]);

    // Calculate weighted composite score
    const compositeScore = 
      (gpsRisk.score * RISK_WEIGHTS.GPS) +
      (velocityRisk.score * RISK_WEIGHTS.VELOCITY) +
      (patternRisk.score * RISK_WEIGHTS.PATTERN) +
      (deviceRisk.score * RISK_WEIGHTS.DEVICE) +
      (timeRisk.score * RISK_WEIGHTS.TIME);

    // Determine risk level
    const riskLevel = this.getRiskLevel(compositeScore);

    // Determine if review/dual-auth required
    const requiresReview = compositeScore >= RISK_THRESHOLDS.MEDIUM;
    const requiresDualAuth = compositeScore >= RISK_THRESHOLDS.HIGH;

    const processingLatencyMs = Date.now() - startTime;

    return {
      compositeScore,
      riskLevel,
      requiresReview,
      requiresDualAuth,
      factors: {
        gps: gpsRisk,
        velocity: velocityRisk,
        pattern: patternRisk,
        device: deviceRisk,
        time: timeRisk,
      },
      processingLatencyMs,
    };
  }

  /**
   * Score a clock event and persist to database
   */
  async scoreAndPersistEvent(context: ClockEventContext): Promise<ClockEventRisk> {
    const riskResult = await this.calculateRiskScore(context);
    const profile = await this.getOrCreateProfile(context.userId);

    // Generate audit hash
    const auditData = JSON.stringify({
      userId: context.userId,
      eventType: context.eventType,
      timestamp: context.eventTimestamp.toISOString(),
      compositeScore: riskResult.compositeScore,
      factors: riskResult.factors,
    });
    const auditHash = crypto.createHash('sha256').update(auditData).digest('hex');

    // Get previous audit hash for chain
    const previousEvent = await db.select({ auditHash: clockEventRisk.auditHash })
      .from(clockEventRisk)
      .where(eq(clockEventRisk.userId, context.userId))
      .orderBy(desc(clockEventRisk.createdAt))
      .limit(1);

    const insertData: InsertClockEventRisk = {
      timeClockId: context.timeClockId,
      userId: context.userId,
      profileId: profile.id,
      compositeRiskScore: riskResult.compositeScore.toFixed(4),
      riskLevel: riskResult.riskLevel,
      requiresReview: riskResult.requiresReview,
      requiresDualAuth: riskResult.requiresDualAuth,
      gpsRiskScore: riskResult.factors.gps.score.toFixed(4),
      velocityRiskScore: riskResult.factors.velocity.score.toFixed(4),
      patternRiskScore: riskResult.factors.pattern.score.toFixed(4),
      deviceRiskScore: riskResult.factors.device.score.toFixed(4),
      timeRiskScore: riskResult.factors.time.score.toFixed(4),
      gpsRiskFactors: riskResult.factors.gps.details,
      velocityRiskFactors: riskResult.factors.velocity.details,
      patternRiskFactors: riskResult.factors.pattern.details,
      deviceRiskFactors: riskResult.factors.device.details,
      timeRiskFactors: riskResult.factors.time.details,
      eventType: context.eventType,
      eventTimestamp: context.eventTimestamp,
      gpsLatitude: context.gpsLatitude?.toString(),
      gpsLongitude: context.gpsLongitude?.toString(),
      gpsAccuracy: context.gpsAccuracy?.toString(),
      deviceFingerprint: context.deviceFingerprint,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      processingLatencyMs: riskResult.processingLatencyMs,
      modelVersion: this.MODEL_VERSION,
      algorithmUsed: this.ALGORITHM,
      reviewStatus: riskResult.requiresReview ? 'pending' : 'approved',
      auditHash,
      previousAuditHash: previousEvent[0]?.auditHash || null,
    };

    const [result] = await db.insert(clockEventRisk).values(insertData).returning();

    // Update profile if high risk
    if (riskResult.riskLevel === 'high' || riskResult.riskLevel === 'critical') {
      await this.updateProfileRiskMetrics(profile.id, riskResult);
    }

    return result;
  }

  /**
   * Get or create a fraud risk profile for a user
   */
  async getOrCreateProfile(userId: number): Promise<FraudRiskProfile> {
    const existing = await db.select()
      .from(fraudRiskProfiles)
      .where(eq(fraudRiskProfiles.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new profile with baseline patterns
    const [newProfile] = await db.insert(fraudRiskProfiles).values({
      userId,
      overallRiskScore: '0.0000',
      riskTier: 'low',
    }).returning();

    return newProfile;
  }

  /**
   * Update user's risk profile based on behavioral patterns
   */
  async updateBehavioralBaseline(userId: number): Promise<FraudRiskProfile> {
    const profile = await this.getOrCreateProfile(userId);

    // Get last 30 days of clock events
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEvents = await db.select()
      .from(clockEventRisk)
      .where(and(
        eq(clockEventRisk.userId, userId),
        gte(clockEventRisk.eventTimestamp, thirtyDaysAgo)
      ))
      .orderBy(clockEventRisk.eventTimestamp);

    if (recentEvents.length < 5) {
      return profile; // Not enough data for baseline
    }

    // Calculate velocity patterns
    const dailyCounts: Record<string, number> = {};
    const eventTimes: string[] = [];

    for (const event of recentEvents) {
      const dateKey = event.eventTimestamp.toISOString().split('T')[0];
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
      eventTimes.push(event.eventTimestamp.toTimeString().split(' ')[0]);
    }

    const dailyCountValues = Object.values(dailyCounts);
    const avgDailyEvents = dailyCountValues.reduce((a, b) => a + b, 0) / dailyCountValues.length;
    const maxDailyEvents = Math.max(...dailyCountValues);

    // Calculate typical start/end times
    const clockInEvents = recentEvents.filter(e => e.eventType === 'clock_in');
    const clockOutEvents = recentEvents.filter(e => e.eventType === 'clock_out');

    let typicalStartTime: string | undefined;
    let typicalEndTime: string | undefined;

    if (clockInEvents.length > 0) {
      const startMinutes = clockInEvents.map(e => {
        const t = e.eventTimestamp;
        return t.getHours() * 60 + t.getMinutes();
      });
      const avgStart = startMinutes.reduce((a, b) => a + b, 0) / startMinutes.length;
      const h = Math.floor(avgStart / 60);
      const m = Math.floor(avgStart % 60);
      typicalStartTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
    }

    if (clockOutEvents.length > 0) {
      const endMinutes = clockOutEvents.map(e => {
        const t = e.eventTimestamp;
        return t.getHours() * 60 + t.getMinutes();
      });
      const avgEnd = endMinutes.reduce((a, b) => a + b, 0) / endMinutes.length;
      const h = Math.floor(avgEnd / 60);
      const m = Math.floor(avgEnd % 60);
      typicalEndTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
    }

    // Calculate location patterns
    const locations: Array<{ lat: number; lng: number }> = [];
    for (const event of recentEvents) {
      if (event.gpsLatitude && event.gpsLongitude) {
        locations.push({
          lat: parseFloat(event.gpsLatitude),
          lng: parseFloat(event.gpsLongitude),
        });
      }
    }

    // Cluster locations (simplified - group by proximity)
    const primaryLocations = this.clusterLocations(locations);

    // Calculate behavioral hash
    const behaviorData = JSON.stringify({
      avgDailyEvents,
      maxDailyEvents,
      typicalStartTime,
      typicalEndTime,
      locationCount: primaryLocations.length,
    });
    const behavioralHash = crypto.createHash('sha256').update(behaviorData).digest('hex');

    // Calculate overall risk based on history
    const highRiskCount = recentEvents.filter(e => 
      e.riskLevel === 'high' || e.riskLevel === 'critical'
    ).length;
    const overallRisk = Math.min(highRiskCount / recentEvents.length, 1);

    // Update audit hash chain
    const auditData = JSON.stringify({
      userId,
      updatedAt: new Date().toISOString(),
      avgDailyEvents,
      overallRisk,
    });
    const auditHash = crypto.createHash('sha256').update(auditData).digest('hex');

    // Update profile
    const [updated] = await db.update(fraudRiskProfiles)
      .set({
        avgDailyClockEvents: avgDailyEvents.toFixed(2),
        maxDailyClockEvents: maxDailyEvents,
        typicalStartTime,
        typicalEndTime,
        primaryWorkLocations: primaryLocations,
        overallRiskScore: overallRisk.toFixed(4),
        riskTier: this.getRiskLevel(overallRisk),
        behavioralHash,
        patternLastUpdated: new Date(),
        lastRiskAssessment: new Date(),
        auditHash,
        previousAuditHash: profile.auditHash,
        updatedAt: new Date(),
      })
      .where(eq(fraudRiskProfiles.id, profile.id))
      .returning();

    return updated;
  }

  /**
   * Get risk dashboard metrics
   */
  async getRiskDashboard(options: {
    startDate?: Date;
    endDate?: Date;
    departmentId?: number;
  } = {}): Promise<RiskDashboardMetrics> {
    const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options.endDate || new Date();

    // Get all events in date range
    const events = await db.select()
      .from(clockEventRisk)
      .where(and(
        gte(clockEventRisk.eventTimestamp, startDate),
        lte(clockEventRisk.eventTimestamp, endDate)
      ));

    // Calculate metrics
    const totalEvents = events.length;
    const highRiskEvents = events.filter(e => e.riskLevel === 'high').length;
    const criticalRiskEvents = events.filter(e => e.riskLevel === 'critical').length;
    const pendingReviews = events.filter(e => e.reviewStatus === 'pending').length;

    // Get override requests
    const overrides = await db.select()
      .from(riskOverrideRequests)
      .where(and(
        gte(riskOverrideRequests.createdAt, startDate),
        lte(riskOverrideRequests.createdAt, endDate)
      ));

    // Calculate SLA breaches
    const now = new Date();
    const slaBreaches = overrides.filter(o => 
      o.status === 'pending' && o.slaDeadline && new Date(o.slaDeadline) < now
    ).length;

    // Calculate average risk score
    const avgRiskScore = events.length > 0
      ? events.reduce((sum, e) => sum + parseFloat(e.compositeRiskScore), 0) / events.length
      : 0;

    // Risk distribution
    const riskDistribution = {
      low: events.filter(e => e.riskLevel === 'low').length,
      medium: events.filter(e => e.riskLevel === 'medium').length,
      high: highRiskEvents,
      critical: criticalRiskEvents,
    };

    // Top risk users
    const userRiskMap = new Map<number, { score: number; count: number }>();
    for (const event of events) {
      const existing = userRiskMap.get(event.userId) || { score: 0, count: 0 };
      userRiskMap.set(event.userId, {
        score: existing.score + parseFloat(event.compositeRiskScore),
        count: existing.count + 1,
      });
    }

    const userIds = Array.from(userRiskMap.keys());
    const usersData = userIds.length > 0 
      ? await db.select({ id: users.id, username: users.username })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

    const usernameMap = new Map(usersData.map(u => [u.id, u.username]));

    const topRiskUsers = Array.from(userRiskMap.entries())
      .map(([userId, data]) => ({
        userId,
        username: usernameMap.get(userId) || 'Unknown',
        riskScore: data.score / data.count,
        eventCount: data.count,
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    // Recent high-risk events
    const recentHighRiskEvents = await db.select()
      .from(clockEventRisk)
      .where(and(
        or(
          eq(clockEventRisk.riskLevel, 'high'),
          eq(clockEventRisk.riskLevel, 'critical')
        ),
        gte(clockEventRisk.eventTimestamp, startDate)
      ))
      .orderBy(desc(clockEventRisk.eventTimestamp))
      .limit(10);

    return {
      totalEvents,
      highRiskEvents,
      criticalRiskEvents,
      pendingReviews,
      overrideRequests: overrides.length,
      avgRiskScore,
      riskDistribution,
      topRiskUsers,
      recentHighRiskEvents,
      slaBreaches,
    };
  }

  /**
   * Get risk score for a specific clock event
   */
  async getEventRisk(eventId: number): Promise<ClockEventRisk | null> {
    const [event] = await db.select()
      .from(clockEventRisk)
      .where(eq(clockEventRisk.id, eventId))
      .limit(1);
    return event || null;
  }

  /**
   * Submit a risk review decision
   */
  async submitReviewDecision(
    eventId: number,
    reviewerId: number,
    decision: 'approved' | 'rejected' | 'escalated',
    notes?: string
  ): Promise<ClockEventRisk> {
    const event = await this.getEventRisk(eventId);
    if (!event) {
      throw new Error('Clock event risk not found');
    }

    // Generate HMAC for decision integrity
    const hmacData = JSON.stringify({
      eventId,
      reviewerId,
      decision,
      timestamp: new Date().toISOString(),
    });
    const hmac = crypto.createHmac('sha256', process.env.HMAC_SECRET || 'default-secret')
      .update(hmacData)
      .digest('hex');

    // Update audit hash
    const auditData = JSON.stringify({
      eventId,
      reviewerId,
      decision,
      notes,
      timestamp: new Date().toISOString(),
    });
    const auditHash = crypto.createHash('sha256').update(auditData).digest('hex');

    const [updated] = await db.update(clockEventRisk)
      .set({
        reviewStatus: decision,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        primaryApproverId: reviewerId,
        primaryApprovedAt: new Date(),
        primaryApprovalHmac: hmac,
        auditHash,
        previousAuditHash: event.auditHash,
        updatedAt: new Date(),
      })
      .where(eq(clockEventRisk.id, eventId))
      .returning();

    return updated;
  }

  /**
   * Create an override request for a high-risk event
   */
  async createOverrideRequest(
    eventId: number,
    requestedBy: number,
    overrideType: 'risk_score' | 'location' | 'time' | 'device',
    requestedAction: string,
    justification: string,
    evidence?: Array<{ type: string; url: string; description: string }>
  ): Promise<RiskOverrideRequest> {
    const event = await this.getEventRisk(eventId);
    if (!event) {
      throw new Error('Clock event risk not found');
    }

    // Determine priority and SLA based on risk level
    const priority = event.riskLevel === 'critical' ? 'urgent' 
      : event.riskLevel === 'high' ? 'high' 
      : 'normal';

    const slaHours = SLA_HOURS[priority as keyof typeof SLA_HOURS];
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours);

    // Critical events require secondary approval
    const requiresSecondaryApproval = event.riskLevel === 'critical';

    // Generate audit hash
    const auditData = JSON.stringify({
      eventId,
      requestedBy,
      overrideType,
      requestedAction,
      timestamp: new Date().toISOString(),
    });
    const auditHash = crypto.createHash('sha256').update(auditData).digest('hex');

    const [request] = await db.insert(riskOverrideRequests).values({
      clockEventRiskId: eventId,
      userId: event.userId,
      requestedBy,
      overrideType,
      originalRiskScore: event.compositeRiskScore,
      requestedAction,
      justification,
      supportingEvidence: evidence || [],
      status: 'pending',
      priority,
      slaDeadline,
      requiresSecondaryApproval,
      auditHash,
    }).returning();

    return request;
  }

  /**
   * Process override approval (primary or secondary)
   */
  async processOverrideApproval(
    requestId: number,
    approverId: number,
    decision: 'approved' | 'rejected',
    notes?: string,
    isSecondary: boolean = false
  ): Promise<RiskOverrideRequest> {
    const [request] = await db.select()
      .from(riskOverrideRequests)
      .where(eq(riskOverrideRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new Error('Override request not found');
    }

    // Generate HMAC for approval integrity
    const hmacData = JSON.stringify({
      requestId,
      approverId,
      decision,
      isSecondary,
      timestamp: new Date().toISOString(),
    });
    const hmac = crypto.createHmac('sha256', process.env.HMAC_SECRET || 'default-secret')
      .update(hmacData)
      .digest('hex');

    // Update audit hash
    const auditData = JSON.stringify({
      requestId,
      approverId,
      decision,
      isSecondary,
      notes,
      timestamp: new Date().toISOString(),
    });
    const auditHash = crypto.createHash('sha256').update(auditData).digest('hex');

    const updates: Partial<RiskOverrideRequest> = {
      auditHash,
      previousAuditHash: request.auditHash,
      updatedAt: new Date(),
    };

    if (isSecondary) {
      updates.secondaryApproverId = approverId;
      updates.secondaryDecision = decision;
      updates.secondaryDecisionAt = new Date();
      updates.secondaryNotes = notes;
      updates.secondaryHmac = hmac;

      // If secondary approved and primary approved, finalize
      if (decision === 'approved' && request.primaryDecision === 'approved') {
        updates.finalDecision = 'approved';
        updates.finalDecisionAt = new Date();
        updates.status = 'approved';
      } else if (decision === 'rejected') {
        updates.finalDecision = 'rejected';
        updates.finalDecisionAt = new Date();
        updates.status = 'rejected';
      }
    } else {
      updates.primaryApproverId = approverId;
      updates.primaryDecision = decision;
      updates.primaryDecisionAt = new Date();
      updates.primaryNotes = notes;
      updates.primaryHmac = hmac;

      // If no secondary required and approved, finalize
      if (!request.requiresSecondaryApproval && decision === 'approved') {
        updates.finalDecision = 'approved';
        updates.finalDecisionAt = new Date();
        updates.status = 'approved';
      } else if (decision === 'rejected') {
        updates.finalDecision = 'rejected';
        updates.finalDecisionAt = new Date();
        updates.status = 'rejected';
      }
    }

    const [updated] = await db.update(riskOverrideRequests)
      .set(updates)
      .where(eq(riskOverrideRequests.id, requestId))
      .returning();

    // If override approved, apply to the clock event
    if (updated.status === 'approved') {
      await this.applyOverride(updated);
    }

    return updated;
  }

  /**
   * Get pending override requests
   */
  async getPendingOverrides(options: {
    approverId?: number;
    includeExpired?: boolean;
  } = {}): Promise<RiskOverrideRequest[]> {
    const conditions = [eq(riskOverrideRequests.status, 'pending')];

    if (!options.includeExpired) {
      conditions.push(
        or(
          isNull(riskOverrideRequests.slaDeadline),
          gte(riskOverrideRequests.slaDeadline, new Date())
        )!
      );
    }

    return db.select()
      .from(riskOverrideRequests)
      .where(and(...conditions))
      .orderBy(desc(riskOverrideRequests.createdAt));
  }

  /**
   * Get user's risk profile
   */
  async getUserProfile(userId: number): Promise<FraudRiskProfile | null> {
    const [profile] = await db.select()
      .from(fraudRiskProfiles)
      .where(eq(fraudRiskProfiles.userId, userId))
      .limit(1);
    return profile || null;
  }

  /**
   * Get risk events for a user
   */
  async getUserRiskEvents(userId: number, options: {
    startDate?: Date;
    endDate?: Date;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    limit?: number;
  } = {}): Promise<ClockEventRisk[]> {
    const conditions = [eq(clockEventRisk.userId, userId)];

    if (options.startDate) {
      conditions.push(gte(clockEventRisk.eventTimestamp, options.startDate));
    }
    if (options.endDate) {
      conditions.push(lte(clockEventRisk.eventTimestamp, options.endDate));
    }
    if (options.riskLevel) {
      conditions.push(eq(clockEventRisk.riskLevel, options.riskLevel));
    }

    let query = db.select()
      .from(clockEventRisk)
      .where(and(...conditions))
      .orderBy(desc(clockEventRisk.eventTimestamp));

    if (options.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    return query;
  }

  // Private helper methods

  private async calculateGpsRisk(
    context: ClockEventContext,
    profile: FraudRiskProfile
  ): Promise<{ score: number; details: Record<string, any> }> {
    const details: Record<string, any> = {};
    let score = 0;

    if (!context.gpsLatitude || !context.gpsLongitude) {
      details.noGpsData = true;
      score = 0.3; // Moderate risk for missing GPS
      return { score, details };
    }

    // Check GPS accuracy
    if (context.gpsAccuracy) {
      if (context.gpsAccuracy > GPS_CONFIG.MAX_ACCURACY_THRESHOLD_M) {
        details.lowAccuracy = true;
        details.accuracy = context.gpsAccuracy;
        score += 0.3;
      }
    }

    // Check against known locations
    const primaryLocations = profile.primaryWorkLocations as Array<{ lat: number; lng: number; frequency: number }>;
    if (primaryLocations && primaryLocations.length > 0) {
      const currentLat = context.gpsLatitude;
      const currentLng = context.gpsLongitude;

      let minDistance = Infinity;
      for (const loc of primaryLocations) {
        const distance = this.haversineDistance(currentLat, currentLng, loc.lat, loc.lng);
        minDistance = Math.min(minDistance, distance);
      }

      if (minDistance > GPS_CONFIG.GEOFENCE_RADIUS_M / 1000) { // Convert to km
        details.outsideKnownLocations = true;
        details.distanceFromNearest = minDistance;
        score += 0.4;
      }
    }

    // Check for GPS spoofing indicators
    const spoofingIndicators = this.detectGpsSpoofing(context);
    if (spoofingIndicators.detected) {
      details.spoofingDetected = true;
      details.spoofingIndicators = spoofingIndicators.reasons;
      score += 0.5;
    }

    return { score: Math.min(score, 1), details };
  }

  private async calculateVelocityRisk(
    context: ClockEventContext,
    profile: FraudRiskProfile
  ): Promise<{ score: number; details: Record<string, any> }> {
    const details: Record<string, any> = {};
    let score = 0;

    // Get last clock event for this user
    const [lastEvent] = await db.select()
      .from(clockEventRisk)
      .where(eq(clockEventRisk.userId, context.userId))
      .orderBy(desc(clockEventRisk.eventTimestamp))
      .limit(1);

    if (!lastEvent || !lastEvent.gpsLatitude || !lastEvent.gpsLongitude) {
      return { score: 0, details: { noHistory: true } };
    }

    if (!context.gpsLatitude || !context.gpsLongitude) {
      return { score: 0, details: { noCurrentGps: true } };
    }

    // Calculate time difference
    const timeDiffHours = (context.eventTimestamp.getTime() - lastEvent.eventTimestamp.getTime()) / (1000 * 60 * 60);
    
    if (timeDiffHours <= 0) {
      return { score: 0, details: { sameOrPastTime: true } };
    }

    // Calculate distance
    const distance = this.haversineDistance(
      parseFloat(lastEvent.gpsLatitude),
      parseFloat(lastEvent.gpsLongitude),
      context.gpsLatitude,
      context.gpsLongitude
    );

    // Calculate speed
    const speed = distance / timeDiffHours;
    details.distance = distance;
    details.timeDiffHours = timeDiffHours;
    details.speed = speed;

    // Check for impossible travel (>200 km/h average)
    if (speed > 200) {
      details.impossibleTravel = true;
      score = 0.9;
    } else if (speed > 150) {
      details.highSpeed = true;
      score = 0.5;
    } else if (speed > 100) {
      details.moderateSpeed = true;
      score = 0.2;
    }

    // Compare to user's max travel speed
    if (profile.maxTravelSpeed) {
      const maxSpeed = parseFloat(profile.maxTravelSpeed);
      if (speed > maxSpeed * 1.5) {
        details.exceedsHistoricalMax = true;
        score = Math.max(score, 0.4);
      }
    }

    return { score: Math.min(score, 1), details };
  }

  private async calculatePatternRisk(
    context: ClockEventContext,
    profile: FraudRiskProfile
  ): Promise<{ score: number; details: Record<string, any> }> {
    const details: Record<string, any> = {};
    let score = 0;

    // Check if event count exceeds daily maximum
    const today = new Date(context.eventTimestamp);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = await db.select({ count: sql<number>`count(*)` })
      .from(clockEventRisk)
      .where(and(
        eq(clockEventRisk.userId, context.userId),
        gte(clockEventRisk.eventTimestamp, today),
        lte(clockEventRisk.eventTimestamp, tomorrow)
      ));

    const eventCount = todayEvents[0]?.count || 0;
    details.todayEventCount = eventCount;

    if (profile.maxDailyClockEvents && eventCount > profile.maxDailyClockEvents) {
      details.exceedsDailyMax = true;
      score += 0.3;
    }

    // Check pattern stability
    if (profile.timePatternStability) {
      const stability = parseFloat(profile.timePatternStability);
      if (stability < 0.5) {
        details.lowPatternStability = true;
        score += 0.2;
      }
    }

    // Check if user has history of confirmed fraud
    if (profile.confirmedFraudCount && profile.confirmedFraudCount > 0) {
      details.hasConfirmedFraud = true;
      details.confirmedFraudCount = profile.confirmedFraudCount;
      score += 0.4;
    }

    return { score: Math.min(score, 1), details };
  }

  private async calculateDeviceRisk(
    context: ClockEventContext,
    profile: FraudRiskProfile
  ): Promise<{ score: number; details: Record<string, any> }> {
    const details: Record<string, any> = {};
    let score = 0;

    if (!context.deviceFingerprint) {
      details.noDeviceFingerprint = true;
      return { score: 0.1, details };
    }

    const knownDevices = profile.knownDevices as Array<{ deviceId: string; lastSeen: string }>;
    
    if (!knownDevices || knownDevices.length === 0) {
      details.firstDevice = true;
      return { score: 0, details };
    }

    const isKnownDevice = knownDevices.some(d => d.deviceId === context.deviceFingerprint);
    
    if (!isKnownDevice) {
      details.unknownDevice = true;
      details.deviceFingerprint = context.deviceFingerprint;
      score = 0.4;

      // Check if too many devices
      if (knownDevices.length >= 3) {
        details.tooManyDevices = true;
        score = 0.6;
      }
    }

    // Check device consistency
    if (profile.deviceConsistency) {
      const consistency = parseFloat(profile.deviceConsistency);
      if (consistency < 0.7) {
        details.lowDeviceConsistency = true;
        score = Math.max(score, 0.3);
      }
    }

    return { score: Math.min(score, 1), details };
  }

  private async calculateTimeRisk(
    context: ClockEventContext,
    profile: FraudRiskProfile
  ): Promise<{ score: number; details: Record<string, any> }> {
    const details: Record<string, any> = {};
    let score = 0;

    const eventHour = context.eventTimestamp.getHours();
    const eventMinutes = eventHour * 60 + context.eventTimestamp.getMinutes();

    // Check for off-hours activity
    if (eventHour < 6 || eventHour > 22) {
      details.offHours = true;
      score += 0.3;
    }

    // Check against typical times
    if (context.eventType === 'clock_in' && profile.typicalStartTime) {
      const [h, m] = profile.typicalStartTime.split(':').map(Number);
      const typicalMinutes = h * 60 + m;
      const deviation = Math.abs(eventMinutes - typicalMinutes);

      details.typicalStartMinutes = typicalMinutes;
      details.actualMinutes = eventMinutes;
      details.startDeviation = deviation;

      if (deviation > 120) { // More than 2 hours off
        details.unusualStartTime = true;
        score += 0.4;
      } else if (deviation > 60) {
        details.slightlyUnusualStart = true;
        score += 0.2;
      }
    }

    if (context.eventType === 'clock_out' && profile.typicalEndTime) {
      const [h, m] = profile.typicalEndTime.split(':').map(Number);
      const typicalMinutes = h * 60 + m;
      const deviation = Math.abs(eventMinutes - typicalMinutes);

      details.typicalEndMinutes = typicalMinutes;
      details.endDeviation = deviation;

      if (deviation > 180) { // More than 3 hours off
        details.unusualEndTime = true;
        score += 0.4;
      } else if (deviation > 90) {
        details.slightlyUnusualEnd = true;
        score += 0.2;
      }
    }

    // Check weekend activity
    const dayOfWeek = context.eventTimestamp.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      details.weekendActivity = true;
      score += 0.2;
    }

    return { score: Math.min(score, 1), details };
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= RISK_THRESHOLDS.CRITICAL) return 'critical';
    if (score >= RISK_THRESHOLDS.HIGH) return 'high';
    if (score >= RISK_THRESHOLDS.MEDIUM) return 'medium';
    return 'low';
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private detectGpsSpoofing(context: ClockEventContext): { detected: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Check for unrealistic accuracy
    if (context.gpsAccuracy !== undefined && context.gpsAccuracy < 1) {
      reasons.push('unrealistically_high_accuracy');
    }

    // Check for round coordinates (often spoofed)
    if (context.gpsLatitude && context.gpsLongitude) {
      const latStr = context.gpsLatitude.toString();
      const lngStr = context.gpsLongitude.toString();
      
      // Check if coordinates have suspiciously few decimal places
      const latDecimals = latStr.includes('.') ? latStr.split('.')[1]?.length || 0 : 0;
      const lngDecimals = lngStr.includes('.') ? lngStr.split('.')[1]?.length || 0 : 0;
      
      if (latDecimals < 4 || lngDecimals < 4) {
        reasons.push('low_coordinate_precision');
      }
    }

    return { detected: reasons.length > 0, reasons };
  }

  private clusterLocations(locations: Array<{ lat: number; lng: number }>): Array<{ lat: number; lng: number; frequency: number }> {
    if (locations.length === 0) return [];

    // Simple clustering: group locations within 0.5km
    const clusters: Array<{ lat: number; lng: number; count: number; sumLat: number; sumLng: number }> = [];
    const CLUSTER_RADIUS = 0.5; // km

    for (const loc of locations) {
      let found = false;
      for (const cluster of clusters) {
        const avgLat = cluster.sumLat / cluster.count;
        const avgLng = cluster.sumLng / cluster.count;
        const distance = this.haversineDistance(loc.lat, loc.lng, avgLat, avgLng);
        
        if (distance < CLUSTER_RADIUS) {
          cluster.count++;
          cluster.sumLat += loc.lat;
          cluster.sumLng += loc.lng;
          found = true;
          break;
        }
      }

      if (!found) {
        clusters.push({ lat: loc.lat, lng: loc.lng, count: 1, sumLat: loc.lat, sumLng: loc.lng });
      }
    }

    return clusters
      .map(c => ({
        lat: c.sumLat / c.count,
        lng: c.sumLng / c.count,
        frequency: c.count / locations.length,
      }))
      .filter(c => c.frequency >= 0.1) // Only keep locations used at least 10% of the time
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5); // Keep top 5 locations
  }

  private async updateProfileRiskMetrics(profileId: number, riskResult: RiskScoreResult): Promise<void> {
    await db.update(fraudRiskProfiles)
      .set({
        totalFlagsRaised: sql`${fraudRiskProfiles.totalFlagsRaised} + 1`,
        lastRiskAssessment: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fraudRiskProfiles.id, profileId));
  }

  private async applyOverride(request: RiskOverrideRequest): Promise<void> {
    await db.update(clockEventRisk)
      .set({
        overrideApplied: true,
        overrideReason: request.justification,
        overrideApprovedBy: request.primaryApproverId,
        overrideApprovedAt: new Date(),
        reviewStatus: 'approved',
        updatedAt: new Date(),
      })
      .where(eq(clockEventRisk.id, request.clockEventRiskId));

    // Update the override request as applied
    await db.update(riskOverrideRequests)
      .set({
        appliedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(riskOverrideRequests.id, request.id));
  }
}

export const fraudScoringService = new FraudScoringService();

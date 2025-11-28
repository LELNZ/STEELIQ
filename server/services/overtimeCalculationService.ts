import { db } from "../db";
import { overtimeRules, timesheetOvertimeSegments, timeClocks, timesheets, users, departments } from "@shared/schema";
import { eq, and, lte, gte, or, isNull, desc, sql } from "drizzle-orm";
import { startOfWeek, endOfWeek, format, differenceInHours } from "date-fns";

export interface OvertimeThreshold {
  basis: 'daily' | 'weekly' | 'consecutive';
  threshold_hours: number;
  rate_multiplier: number;
  name: string;
  cap_hours?: number;
  escalation_rule_id?: number;
}

export interface OvertimeSegment {
  tierType: string;
  thresholdHours: number;
  hoursApplied: number;
  rateMultiplier: number;
  overtimeRuleId: number;
  calculatedCost?: number;
}

export interface OvertimeCalculationResult {
  regularHours: number;
  overtimeSegments: OvertimeSegment[];
  totalOvertimeHours: number;
  totalWeightedHours: number; // Regular + (OT * multipliers)
  appliedRules: number[]; // Rule IDs applied
  warnings: string[];
}

export class OvertimeCalculationService {
  
  /**
   * Calculate overtime for a user's timesheet
   * Fortune 50 compliant with jurisdiction priority and audit trail
   */
  async calculateOvertimeForTimesheet(
    timesheetId: number,
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<OvertimeCalculationResult> {
    
    // Get user's department and applicable rules
    const userInfo = await this.getUserInfo(userId);
    const applicableRules = await this.getApplicableRules(
      userInfo.departmentId,
      userInfo.employmentType,
      startDate
    );
    
    // Get time clock entries for the period
    const timeEntries = await this.getTimeEntries(userId, startDate, endDate);
    
    // Calculate hours by day and week
    const hoursBreakdown = this.calculateHoursBreakdown(timeEntries);
    
    // Apply overtime rules in priority order
    const result = this.applyOvertimeRules(
      hoursBreakdown,
      applicableRules
    );
    
    // Save overtime segments for audit
    if (timesheetId && result.overtimeSegments.length > 0) {
      await this.saveOvertimeSegments(timesheetId, result.overtimeSegments);
    }
    
    return result;
  }
  
  /**
   * Get user information for overtime calculation
   */
  private async getUserInfo(userId: number): Promise<any> {
    const [user] = await db
      .select({
        id: users.id,
        departmentId: sql<number | null>`NULL`, // users table doesn't have departmentId
        department: users.department,
        employmentType: sql<string>`'full_time'` // Default until we have employment type field
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return user || { id: userId, departmentId: null, employmentType: 'full_time' };
  }
  
  /**
   * Get applicable overtime rules based on jurisdiction and priority
   */
  private async getApplicableRules(
    departmentId: number | null,
    employmentType: string,
    effectiveDate: Date
  ): Promise<any[]> {
    // Get all active rules that apply to this scenario
    const rules = await db
      .select()
      .from(overtimeRules)
      .where(
        and(
          eq(overtimeRules.isActive, true),
          lte(overtimeRules.effectiveStart, effectiveDate),
          or(
            isNull(overtimeRules.effectiveEnd),
            gte(overtimeRules.effectiveEnd, effectiveDate)
          ),
          or(
            isNull(overtimeRules.businessUnitId),
            eq(overtimeRules.businessUnitId, departmentId)
          ),
          or(
            isNull(overtimeRules.employmentClassification),
            eq(overtimeRules.employmentClassification, employmentType)
          )
        )
      )
      .orderBy(desc(overtimeRules.priority));
    
    return rules;
  }
  
  /**
   * Get time entries for the period
   * Uses event-based schema with ClockSessionBuilder
   */
  private async getTimeEntries(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // Import the shared utilities
    const { fetchClockEvents } = await import('./utils/clockEventsFetcher');
    const { ClockSessionBuilder } = await import('./utils/clockSessionBuilder');
    
    // Get all clock events for the period
    const clockEvents = await fetchClockEvents(userId, startDate, endDate);
    
    // Build shift sessions from events
    const sessions = ClockSessionBuilder.buildSessions(clockEvents);
    
    // Convert complete sessions to the format expected by overtime calculations
    const entries = sessions
      .filter(s => s.isComplete && s.clockOutTime)
      .map(session => ({
        id: session.clockInTime.getTime(), // Use timestamp as ID for compatibility
        clockIn: session.clockInTime,
        clockOut: session.clockOutTime,
        hoursWorked: session.netHoursWorked ?? session.totalHoursWorked ?? 0,
        jobId: session.jobId,
        date: new Date(session.clockInTime.toISOString().split('T')[0])
      }))
      .sort((a, b) => a.clockIn.getTime() - b.clockIn.getTime()); // Sort by clock in time
    
    return entries;
  }
  
  /**
   * Calculate hours breakdown by day and week
   */
  private calculateHoursBreakdown(timeEntries: any[]): any {
    const breakdown = {
      dailyHours: new Map<string, number>(),
      weeklyHours: new Map<string, number>(),
      consecutiveDaysWorked: 0,
      totalHours: 0
    };
    
    let lastWorkDate: Date | null = null;
    let consecutiveDays = 0;
    
    for (const entry of timeEntries) {
      const dateKey = format(entry.date, 'yyyy-MM-dd');
      const weekKey = format(startOfWeek(entry.date), 'yyyy-MM-dd');
      const hours = Number(entry.hoursWorked) || 0;
      
      // Daily hours
      const currentDailyHours = breakdown.dailyHours.get(dateKey) || 0;
      breakdown.dailyHours.set(dateKey, currentDailyHours + hours);
      
      // Weekly hours
      const currentWeeklyHours = breakdown.weeklyHours.get(weekKey) || 0;
      breakdown.weeklyHours.set(weekKey, currentWeeklyHours + hours);
      
      // Track consecutive days
      if (lastWorkDate) {
        const daysDiff = Math.floor((entry.date.getTime() - lastWorkDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          consecutiveDays++;
        } else if (daysDiff > 1) {
          consecutiveDays = 1;
        }
      } else {
        consecutiveDays = 1;
      }
      
      lastWorkDate = entry.date;
      breakdown.consecutiveDaysWorked = Math.max(breakdown.consecutiveDaysWorked, consecutiveDays);
      breakdown.totalHours += hours;
    }
    
    return breakdown;
  }
  
  /**
   * Apply overtime rules to calculate segments
   */
  private applyOvertimeRules(
    hoursBreakdown: any,
    rules: any[]
  ): OvertimeCalculationResult {
    const result: OvertimeCalculationResult = {
      regularHours: 0,
      overtimeSegments: [],
      totalOvertimeHours: 0,
      totalWeightedHours: 0,
      appliedRules: [],
      warnings: []
    };
    
    // Process each rule's thresholds
    for (const rule of rules) {
      const thresholds = rule.thresholds as OvertimeThreshold[];
      
      for (const threshold of thresholds) {
        if (threshold.basis === 'daily') {
          // Apply daily overtime
          for (const [date, hours] of hoursBreakdown.dailyHours.entries()) {
            if (hours > threshold.threshold_hours) {
              const overtimeHours = Math.min(
                hours - threshold.threshold_hours,
                threshold.cap_hours || Infinity
              );
              
              if (overtimeHours > 0) {
                result.overtimeSegments.push({
                  tierType: 'daily_ot',
                  thresholdHours: threshold.threshold_hours,
                  hoursApplied: overtimeHours,
                  rateMultiplier: threshold.rate_multiplier,
                  overtimeRuleId: rule.id
                });
              }
            }
          }
        } else if (threshold.basis === 'weekly') {
          // Apply weekly overtime
          for (const [week, hours] of hoursBreakdown.weeklyHours.entries()) {
            if (hours > threshold.threshold_hours) {
              const overtimeHours = Math.min(
                hours - threshold.threshold_hours,
                threshold.cap_hours || Infinity
              );
              
              // Avoid double counting daily overtime
              const dailyOvertimeThisWeek = result.overtimeSegments
                .filter(s => s.tierType === 'daily_ot')
                .reduce((sum, s) => sum + s.hoursApplied, 0);
              
              const adjustedOvertimeHours = Math.max(0, overtimeHours - dailyOvertimeThisWeek);
              
              if (adjustedOvertimeHours > 0) {
                result.overtimeSegments.push({
                  tierType: 'weekly_ot',
                  thresholdHours: threshold.threshold_hours,
                  hoursApplied: adjustedOvertimeHours,
                  rateMultiplier: threshold.rate_multiplier,
                  overtimeRuleId: rule.id
                });
              }
            }
          }
        } else if (threshold.basis === 'consecutive') {
          // Apply consecutive days overtime (e.g., 7th day premium)
          if (hoursBreakdown.consecutiveDaysWorked >= threshold.threshold_hours / 8) {
            result.warnings.push(
              `Consecutive days worked: ${hoursBreakdown.consecutiveDaysWorked}. ` +
              `Additional premium may apply per ${rule.ruleSource}.`
            );
          }
        }
      }
      
      if (result.overtimeSegments.length > 0) {
        result.appliedRules.push(rule.id);
      }
    }
    
    // Calculate totals
    result.totalOvertimeHours = result.overtimeSegments.reduce(
      (sum, segment) => sum + segment.hoursApplied,
      0
    );
    
    result.regularHours = Math.max(0, hoursBreakdown.totalHours - result.totalOvertimeHours);
    
    // Calculate weighted hours for cost purposes
    result.totalWeightedHours = result.regularHours + 
      result.overtimeSegments.reduce(
        (sum, segment) => sum + (segment.hoursApplied * segment.rateMultiplier),
        0
      );
    
    return result;
  }
  
  /**
   * Save overtime segments for audit trail
   */
  private async saveOvertimeSegments(
    timesheetId: number,
    segments: OvertimeSegment[]
  ): Promise<void> {
    // Delete existing segments for this timesheet (in case of recalculation)
    await db
      .delete(timesheetOvertimeSegments)
      .where(eq(timesheetOvertimeSegments.timesheetId, timesheetId));
    
    // Insert new segments
    if (segments.length > 0) {
      await db.insert(timesheetOvertimeSegments).values(
        segments.map(segment => ({
          timesheetId,
          overtimeRuleId: segment.overtimeRuleId,
          tierType: segment.tierType,
          thresholdHours: segment.thresholdHours.toString(),
          hoursApplied: segment.hoursApplied.toString(),
          rateMultiplier: segment.rateMultiplier.toString(),
          calculatedCost: segment.calculatedCost?.toString()
        }))
      );
    }
  }
  
  /**
   * Get overtime summary for analytics
   */
  async getOvertimeSummary(
    departmentId?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    // Build query conditions
    const conditions = [];
    if (startDate && endDate) {
      conditions.push(
        gte(timesheets.weekStartDate, startDate),
        lte(timesheets.weekEndDate, endDate)
      );
    }
    
    // Get overtime segments with aggregation
    const summary = await db
      .select({
        tierType: timesheetOvertimeSegments.tierType,
        totalHours: sql<number>`SUM(CAST(${timesheetOvertimeSegments.hoursApplied} AS NUMERIC))`,
        totalCost: sql<number>`SUM(CAST(${timesheetOvertimeSegments.calculatedCost} AS NUMERIC))`,
        segmentCount: sql<number>`COUNT(*)`,
        avgMultiplier: sql<number>`AVG(CAST(${timesheetOvertimeSegments.rateMultiplier} AS NUMERIC))`
      })
      .from(timesheetOvertimeSegments)
      .innerJoin(timesheets, eq(timesheets.id, timesheetOvertimeSegments.timesheetId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(timesheetOvertimeSegments.tierType);
    
    return {
      byTier: summary,
      totalOvertimeHours: summary.reduce((sum, tier) => sum + (tier.totalHours || 0), 0),
      totalOvertimeCost: summary.reduce((sum, tier) => sum + (tier.totalCost || 0), 0)
    };
  }
}

// Export singleton instance
export const overtimeService = new OvertimeCalculationService();
import { db } from "../db";
import { 
  timeClocks, complianceRules, complianceViolations, 
  timesheets, users, teamMembers 
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc, or, isNull } from "drizzle-orm";
import { differenceInHours, differenceInMinutes, addHours, format } from "date-fns";
import { 
  CLOCK_TYPES, 
  ClockType, 
  normalizeClockType,
  isBreakType,
  isMealType 
} from "@shared/constants/timeClock";
import { 
  ClockSessionBuilder,
  ShiftSession,
  ClockEvent,
  CLOCK_IN,
  CLOCK_OUT,
  BREAK_START,
  BREAK_END,
  MEAL_START,
  MEAL_END
} from "./utils/clockSessionBuilder";

interface ComplianceCheck {
  userId: number;
  date: Date;
  violations: ComplianceViolation[];
  compliant: boolean;
}

interface ComplianceViolation {
  type: 'break_violation' | 'meal_violation' | 'overtime_violation' | 'continuous_work_violation';
  description: string;
  severity: 'warning' | 'violation' | 'critical';
  timestamp?: Date;
  duration?: number;
}

interface ComplianceRule {
  id: number;
  ruleType: string;
  jurisdiction: string;
  thresholdHours?: number;
  thresholdMinutes?: number;
  requiredDuration?: number;
  description: string;
}

class ComplianceService {
  /**
   * Check compliance for a user on a specific date
   */
  async checkUserCompliance(userId: number, date: Date): Promise<ComplianceCheck> {
    const violations: ComplianceViolation[] = [];
    
    // Get the day's time clock records (ALL events, not just clock_in)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const clockEvents = await db
      .select()
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.userId, userId),
          gte(timeClocks.timestamp, startOfDay),
          lte(timeClocks.timestamp, endOfDay)
        )
      )
      .orderBy(timeClocks.timestamp);

    if (clockEvents.length === 0) {
      return { userId, date, violations: [], compliant: true };
    }

    // Build shift sessions from individual clock events
    const sessions = ClockSessionBuilder.buildSessions(clockEvents as ClockEvent[]);
    
    if (sessions.length === 0) {
      return { userId, date, violations: [], compliant: true };
    }

    // Check for break violations
    const breakViolations = await this.checkBreakCompliance(userId, sessions, date);
    violations.push(...breakViolations);

    // Check for meal period violations
    const mealViolations = await this.checkMealPeriodCompliance(userId, sessions, date);
    violations.push(...mealViolations);

    // Check for continuous work violations (no break for extended periods)
    const continuousWorkViolations = await this.checkContinuousWorkCompliance(userId, sessions);
    violations.push(...continuousWorkViolations);

    // Check for overtime violations
    const overtimeViolations = await this.checkOvertimeCompliance(userId, date);
    violations.push(...overtimeViolations);

    // Store violations in database
    if (violations.length > 0) {
      await this.storeViolations(userId, date, violations);
    }

    return {
      userId,
      date,
      violations,
      compliant: violations.length === 0
    };
  }

  /**
   * Check break compliance (typically 10-15 minute breaks)
   * Now works with ShiftSession objects from ClockSessionBuilder
   */
  private async checkBreakCompliance(
    userId: number, 
    sessions: ShiftSession[], 
    date: Date
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    
    // Get applicable break rules based on jurisdiction
    const breakRules = await this.getApplicableRules('break_required', userId);
    
    for (const rule of breakRules) {
      const thresholdHours = rule.thresholdHours || 4;
      const requiredBreakMinutes = rule.thresholdMinutes || 10;
      
      // Check each shift session
      for (const session of sessions) {
        // Skip incomplete sessions unless configured to check them
        if (!session.isComplete && !this.shouldCheckIncompleteShifts()) {
          continue;
        }
        
        const workDuration = session.totalHoursWorked || 0;
        
        if (workDuration >= thresholdHours) {
          // Check if any breaks were taken
          if (session.breaks.length === 0) {
            violations.push({
              type: 'break_violation',
              description: `No ${requiredBreakMinutes}-minute break taken during ${workDuration.toFixed(1)}-hour work period`,
              severity: 'violation',
              timestamp: session.clockInTime,
              duration: workDuration
            });
          } else {
            // Check each break for compliance
            let totalBreakMinutes = 0;
            
            for (const breakPeriod of session.breaks) {
              if (!breakPeriod.isComplete) {
                // Incomplete break - flag as violation
                violations.push({
                  type: 'break_violation',
                  description: `Break started but not ended properly`,
                  severity: 'warning',
                  timestamp: breakPeriod.startTime
                });
              } else if (breakPeriod.durationMinutes) {
                totalBreakMinutes += breakPeriod.durationMinutes;
                
                // Check if individual break was too short
                if (breakPeriod.durationMinutes < requiredBreakMinutes) {
                  violations.push({
                    type: 'break_violation',
                    description: `Break was only ${breakPeriod.durationMinutes} minutes (required: ${requiredBreakMinutes} minutes)`,
                    severity: 'warning',
                    timestamp: breakPeriod.startTime,
                    duration: breakPeriod.durationMinutes
                  });
                }
              }
            }
            
            // Check if total break time across all breaks meets requirement
            if (totalBreakMinutes < requiredBreakMinutes) {
              violations.push({
                type: 'break_violation',
                description: `Total break time of ${totalBreakMinutes} minutes is less than required ${requiredBreakMinutes} minutes`,
                severity: 'violation',
                timestamp: session.clockInTime,
                duration: totalBreakMinutes
              });
            }
          }
        }
      }
    }
    
    return violations;
  }
  
  /**
   * Helper method to determine if incomplete shifts should be checked
   * Can be configured based on business rules
   */
  private shouldCheckIncompleteShifts(): boolean {
    // TODO: Make this configurable via environment or settings
    return true; // For now, check all shifts including incomplete ones
  }

  /**
   * Check meal period compliance (typically 30-minute meal breaks)
   * Now works with ShiftSession objects from ClockSessionBuilder
   */
  private async checkMealPeriodCompliance(
    userId: number, 
    sessions: ShiftSession[], 
    date: Date
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    
    // Get applicable meal rules
    const mealRules = await this.getApplicableRules('meal_required', userId);
    
    // Calculate total hours across all sessions for the day
    const dayHours = sessions.reduce((sum, session) => 
      sum + (session.totalHoursWorked || 0), 0
    );
    
    for (const rule of mealRules) {
      const thresholdHours = rule.thresholdHours || 5;
      const requiredMealMinutes = rule.thresholdMinutes || 30;
      
      // Check each session for meal compliance
      for (const session of sessions) {
        // Skip incomplete sessions unless configured to check them
        if (!session.isComplete && !this.shouldCheckIncompleteShifts()) {
          continue;
        }
        
        const sessionHours = session.totalHoursWorked || 0;
        
        // Determine if this session requires a meal based on rule
        const requiresMeal = rule.jurisdiction === 'cumulative' ? 
          dayHours >= thresholdHours : 
          sessionHours >= thresholdHours;
        
        if (requiresMeal) {
          // Check meal violations for this session
          const sessionViolations = this.evaluateMealCompliance(
            session, 
            rule, 
            requiredMealMinutes
          );
          violations.push(...sessionViolations);
          
          // California-specific: Meal period must be before 5th hour
          if (rule.jurisdiction === 'CA' && sessionHours >= 5) {
            const caViolations = this.checkCaliforniaMealTiming(session, rule);
            violations.push(...caViolations);
          }
        }
      }
    }
    
    return violations;
  }
  
  /**
   * Evaluate meal compliance for a specific session
   */
  private evaluateMealCompliance(
    session: ShiftSession,
    rule: ComplianceRule,
    requiredMealMinutes: number
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const sessionHours = session.totalHoursWorked || 0;
    
    // Check if any meals were taken
    if (session.meals.length === 0) {
      violations.push({
        type: 'meal_violation',
        description: `No ${requiredMealMinutes}-minute meal period taken for ${sessionHours.toFixed(1)}-hour shift`,
        severity: 'violation',
        timestamp: session.clockInTime,
        duration: sessionHours
      });
      return violations;
    }
    
    // Check each meal period
    let totalMealMinutes = 0;
    let hasCompleteMeal = false;
    
    for (const meal of session.meals) {
      if (!meal.isComplete) {
        // Incomplete meal - severity depends on if shift is complete
        violations.push({
          type: 'meal_violation',
          description: `Meal period started but not ended properly`,
          severity: session.isComplete ? 'critical' : 'warning',
          timestamp: meal.startTime
        });
      } else {
        hasCompleteMeal = true;
        const mealMinutes = meal.durationMinutes || 0;
        totalMealMinutes += mealMinutes;
        
        // Check if individual meal was too short
        if (mealMinutes < requiredMealMinutes) {
          violations.push({
            type: 'meal_violation',
            description: `Meal period was only ${mealMinutes} minutes (required: ${requiredMealMinutes} minutes)`,
            severity: 'warning',
            timestamp: meal.startTime,
            duration: mealMinutes
          });
        }
      }
    }
    
    // Check total meal time if no complete meals meet the requirement
    if (!hasCompleteMeal || totalMealMinutes < requiredMealMinutes) {
      violations.push({
        type: 'meal_violation',
        description: `Total meal time of ${totalMealMinutes} minutes is insufficient (required: ${requiredMealMinutes} minutes)`,
        severity: 'violation',
        timestamp: session.clockInTime,
        duration: totalMealMinutes
      });
    }
    
    return violations;
  }
  
  /**
   * Check California-specific meal timing requirements
   */
  private checkCaliforniaMealTiming(
    session: ShiftSession,
    rule: ComplianceRule
  ): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];
    const fiveHourMark = addHours(session.clockInTime, 5);
    
    // Find the earliest complete meal
    const timelyMeal = session.meals.find(meal => 
      meal.isComplete && meal.startTime <= fiveHourMark
    );
    
    if (!timelyMeal) {
      // Check if shift is still ongoing
      if (!session.isComplete) {
        // Check if we've already passed the 5-hour mark
        if (new Date() > fiveHourMark) {
          violations.push({
            type: 'meal_violation',
            description: 'Meal period not provided before end of 5th hour of work (CA law) - OVERDUE',
            severity: 'critical',
            timestamp: fiveHourMark
          });
        }
      } else {
        // Shift is complete and no timely meal was taken
        violations.push({
          type: 'meal_violation',
          description: 'Meal period not provided before end of 5th hour of work (CA law)',
          severity: 'critical',
          timestamp: fiveHourMark
        });
      }
    }
    
    return violations;
  }

  /**
   * Check continuous work compliance
   * Now works with ShiftSession objects from ClockSessionBuilder
   */
  private async checkContinuousWorkCompliance(
    userId: number, 
    sessions: ShiftSession[]
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const MAX_CONTINUOUS_HOURS = 6; // Maximum continuous work without break
    
    for (const session of sessions) {
      // Skip incomplete sessions unless configured to check them
      if (!session.isComplete && !this.shouldCheckIncompleteShifts()) {
        continue;
      }
      
      // Build timeline of work/rest periods for this session
      const workPeriods = this.analyzeWorkPeriods(session);
      
      // Check each continuous work period
      for (const period of workPeriods) {
        if (period.durationHours > MAX_CONTINUOUS_HOURS) {
          violations.push({
            type: 'continuous_work_violation',
            description: `Worked ${period.durationHours.toFixed(1)} continuous hours without a break`,
            severity: period.durationHours > MAX_CONTINUOUS_HOURS + 1 ? 'critical' : 'violation',
            timestamp: period.startTime,
            duration: period.durationHours
          });
        }
      }
    }
    
    return violations;
  }
  
  /**
   * Analyze work periods between breaks/meals
   */
  private analyzeWorkPeriods(session: ShiftSession): Array<{
    startTime: Date;
    endTime: Date;
    durationHours: number;
  }> {
    const periods: Array<{
      startTime: Date;
      endTime: Date;
      durationHours: number;
    }> = [];
    
    // Combine and sort all rest periods (breaks and meals)
    const restPeriods = [
      ...session.breaks.map(b => ({ start: b.startTime, end: b.endTime, type: 'break' })),
      ...session.meals.map(m => ({ start: m.startTime, end: m.endTime, type: 'meal' }))
    ].sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Track continuous work periods
    let lastEndTime = session.clockInTime;
    
    for (const rest of restPeriods) {
      // Only count complete rest periods
      if (rest.end) {
        // Period from last end to this rest start
        const workHours = differenceInHours(rest.start, lastEndTime);
        if (workHours > 0) {
          periods.push({
            startTime: lastEndTime,
            endTime: rest.start,
            durationHours: workHours
          });
        }
        lastEndTime = rest.end;
      }
    }
    
    // Final period from last rest to clock out (or current time if incomplete)
    const endTime = session.clockOutTime || new Date();
    const finalHours = differenceInHours(endTime, lastEndTime);
    if (finalHours > 0) {
      periods.push({
        startTime: lastEndTime,
        endTime: endTime,
        durationHours: finalHours
      });
    }
    
    return periods;
  }

  /**
   * Check overtime compliance
   */
  private async checkOvertimeCompliance(userId: number, date: Date): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    
    // Get weekly hours
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const [weeklyHours] = await db
      .select({
        totalHours: sql`COALESCE(sum(${timesheets.hoursWorked}), 0)::float`
      })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.userId, userId),
          gte(timesheets.date, weekStart),
          lte(timesheets.date, date)
        )
      );
    
    // Check weekly overtime limits
    if (weeklyHours.totalHours > 40) {
      const overtimeHours = weeklyHours.totalHours - 40;
      
      if (overtimeHours > 20) {
        violations.push({
          type: 'overtime_violation',
          description: `Excessive overtime: ${overtimeHours.toFixed(1)} hours this week`,
          severity: 'critical',
          duration: overtimeHours
        });
      } else if (overtimeHours > 15) {
        violations.push({
          type: 'overtime_violation',
          description: `High overtime: ${overtimeHours.toFixed(1)} hours this week`,
          severity: 'warning',
          duration: overtimeHours
        });
      }
    }
    
    // Check daily overtime (over 8 hours)
    const [dailyHours] = await db
      .select({
        totalHours: sql`COALESCE(sum(
          EXTRACT(EPOCH FROM (
            COALESCE(${timeClocks.clockOutTimestamp}, now()) - ${timeClocks.timestamp}
          ))/3600
        ), 0)::float`
      })
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.userId, userId),
          eq(timeClocks.clockType, CLOCK_IN),
          gte(timeClocks.timestamp, date),
          lte(timeClocks.timestamp, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        )
      );
    
    if (dailyHours.totalHours > 12) {
      violations.push({
        type: 'overtime_violation',
        description: `Worked ${dailyHours.totalHours.toFixed(1)} hours in a single day (>12 hours)`,
        severity: 'critical',
        duration: dailyHours.totalHours
      });
    } else if (dailyHours.totalHours > 10) {
      violations.push({
        type: 'overtime_violation',
        description: `Worked ${dailyHours.totalHours.toFixed(1)} hours in a single day (>10 hours)`,
        severity: 'warning',
        duration: dailyHours.totalHours
      });
    }
    
    return violations;
  }

  /**
   * Get applicable compliance rules for a user
   */
  private async getApplicableRules(ruleType: string, userId: number): Promise<ComplianceRule[]> {
    // Get user's location/jurisdiction from team member data
    const [teamMember] = await db
      .select({ state: teamMembers.department }) // Using department as proxy for state
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .limit(1);
    
    const jurisdiction = teamMember?.state || 'federal';
    
    // Get rules for this jurisdiction
    const rules = await db
      .select()
      .from(complianceRules)
      .where(
        and(
          eq(complianceRules.ruleType, ruleType),
          or(
            eq(complianceRules.jurisdiction, jurisdiction),
            eq(complianceRules.jurisdiction, 'federal')
          ),
          eq(complianceRules.isActive, true)
        )
      )
      .orderBy(desc(complianceRules.effectiveDate));
    
    return rules;
  }

  /**
   * Store violations in database
   */
  private async storeViolations(
    userId: number, 
    date: Date, 
    violations: ComplianceViolation[]
  ): Promise<void> {
    const violationRecords = violations.map(violation => ({
      userId,
      violationDate: date,
      violationType: violation.type,
      description: violation.description,
      severity: violation.severity,
      resolved: false,
      createdAt: new Date()
    }));
    
    if (violationRecords.length > 0) {
      await db.insert(complianceViolations).values(violationRecords);
    }
  }

  /**
   * Run compliance check for all active employees
   */
  async runDailyComplianceCheck(date: Date = new Date()): Promise<{
    totalChecked: number;
    totalViolations: number;
    criticalViolations: number;
  }> {
    // Get all active employees
    const activeEmployees = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(eq(teamMembers.isActive, true));
    
    let totalViolations = 0;
    let criticalViolations = 0;
    
    for (const employee of activeEmployees) {
      const check = await this.checkUserCompliance(employee.userId!, date);
      totalViolations += check.violations.length;
      criticalViolations += check.violations.filter(v => v.severity === 'critical').length;
    }
    
    return {
      totalChecked: activeEmployees.length,
      totalViolations,
      criticalViolations
    };
  }

  /**
   * Get compliance summary for a period
   */
  async getComplianceSummary(
    startDate: Date, 
    endDate: Date
  ): Promise<{
    totalViolations: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    topViolators: Array<{ userId: number; name: string; violations: number }>;
  }> {
    const violations = await db
      .select({
        type: complianceViolations.violationType,
        severity: complianceViolations.severity,
        userId: complianceViolations.userId,
        count: sql`count(*)::int`
      })
      .from(complianceViolations)
      .where(
        and(
          gte(complianceViolations.violationDate, startDate),
          lte(complianceViolations.violationDate, endDate)
        )
      )
      .groupBy(
        complianceViolations.violationType,
        complianceViolations.severity,
        complianceViolations.userId
      );
    
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const userViolations: Record<number, number> = {};
    let totalViolations = 0;
    
    for (const violation of violations) {
      const count = violation.count || 0;
      totalViolations += count;
      
      byType[violation.type] = (byType[violation.type] || 0) + count;
      bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + count;
      userViolations[violation.userId] = (userViolations[violation.userId] || 0) + count;
    }
    
    // Get top violators
    const topViolatorIds = Object.entries(userViolations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId]) => parseInt(userId));
    
    const topViolators = [];
    for (const userId of topViolatorIds) {
      const [user] = await db
        .select({ name: users.username })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      topViolators.push({
        userId,
        name: user?.name || 'Unknown',
        violations: userViolations[userId]
      });
    }
    
    return {
      totalViolations,
      byType,
      bySeverity,
      topViolators
    };
  }
}

export const complianceService = new ComplianceService();
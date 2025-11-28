import { db } from './db';
import { 
  timesheets, 
  timeClocks,
  teamMembers,
  complianceRules,
  complianceViolations,
  auditEvents,
  payrollPeriods
} from '@shared/schema';
import { eq, and, gte, lte, sql, desc, ne } from 'drizzle-orm';

export interface ComplianceRule {
  id: number;
  name: string;
  type: 'overtime' | 'break' | 'rest' | 'hours' | 'wage' | 'minor' | 'rounding';
  config: Record<string, any>;
  severity: 'warning' | 'error' | 'critical';
  active: boolean;
}

export interface ComplianceViolation {
  ruleId: number;
  ruleName: string;
  severity: 'warning' | 'error' | 'critical';
  description: string;
  affectedEmployeeId: number;
  affectedDate: Date;
  details: Record<string, any>;
}

export interface ComplianceCheckResult {
  isCompliant: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceViolation[];
  summary: {
    totalViolations: number;
    criticalViolations: number;
    employees: number;
  };
}

// Check overtime compliance (daily and weekly)
async function checkOvertimeCompliance(
  userId: number,
  startDate: Date,
  endDate: Date,
  rule: ComplianceRule
): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = [];
  const config = rule.config as {
    dailyThreshold: number;
    weeklyThreshold: number;
    dailyMax: number;
    weeklyMax: number;
  };

  // Get all timesheets for the period
  const timesheetData = await db
    .select({
      id: timesheets.id,
      userId: timesheets.userId,
      date: timesheets.date,
      hoursWorked: timesheets.hoursWorked,
      overtimeHours: timesheets.overtimeHours
    })
    .from(timesheets)
    .where(
      and(
        eq(timesheets.userId, userId),
        gte(timesheets.date, startDate),
        lte(timesheets.date, endDate)
      )
    );

  // Check daily overtime
  for (const ts of timesheetData) {
    const totalHours = (ts.hoursWorked || 0) + (ts.overtimeHours || 0);
    
    if (totalHours > config.dailyMax) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: 'critical',
        description: `Daily hours exceed maximum allowed (${totalHours} > ${config.dailyMax})`,
        affectedEmployeeId: userId,
        affectedDate: ts.date,
        details: {
          hoursWorked: totalHours,
          limit: config.dailyMax,
          excess: totalHours - config.dailyMax
        }
      });
    } else if (totalHours > config.dailyThreshold && !ts.overtimeHours) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: 'warning',
        description: `Overtime not calculated for hours over ${config.dailyThreshold}`,
        affectedEmployeeId: userId,
        affectedDate: ts.date,
        details: {
          hoursWorked: totalHours,
          threshold: config.dailyThreshold,
          missingOvertime: totalHours - config.dailyThreshold
        }
      });
    }
  }

  // Check weekly overtime
  const weeklyHours = await db
    .select({
      week: sql<string>`DATE_TRUNC('week', ${timesheets.date})`,
      totalHours: sql<number>`SUM(${timesheets.hoursWorked} + COALESCE(${timesheets.overtimeHours}, 0))`
    })
    .from(timesheets)
    .where(
      and(
        eq(timesheets.userId, userId),
        gte(timesheets.date, startDate),
        lte(timesheets.date, endDate)
      )
    )
    .groupBy(sql`DATE_TRUNC('week', ${timesheets.date})`);

  for (const week of weeklyHours) {
    if (week.totalHours > config.weeklyMax) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: 'critical',
        description: `Weekly hours exceed maximum allowed (${week.totalHours} > ${config.weeklyMax})`,
        affectedEmployeeId: userId,
        affectedDate: new Date(week.week),
        details: {
          weekStart: week.week,
          hoursWorked: week.totalHours,
          limit: config.weeklyMax,
          excess: week.totalHours - config.weeklyMax
        }
      });
    }
  }

  return violations;
}

// Check break time compliance
async function checkBreakCompliance(
  userId: number,
  date: Date,
  rule: ComplianceRule
): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = [];
  const config = rule.config as {
    minBreakAfterHours: number;
    breakDurationMinutes: number;
    mealBreakAfterHours: number;
    mealBreakDurationMinutes: number;
  };

  // Get time clocks for the day
  const clocks = await db
    .select()
    .from(timeClocks)
    .where(
      and(
        eq(timeClocks.userId, userId),
        sql`DATE(${timeClocks.timestamp}) = DATE(${date})`
      )
    )
    .orderBy(timeClocks.timestamp);

  // Calculate working periods and breaks
  const workingPeriods: Array<{ start: Date; end: Date | null }> = [];
  let currentPeriod: { start: Date; end: Date | null } | null = null;

  for (const clock of clocks) {
    if (clock.clockType === 'clock_in' || clock.clockType === 'break_end') {
      currentPeriod = { start: clock.timestamp, end: null };
    } else if (clock.clockType === 'clock_out' || clock.clockType === 'break_start') {
      if (currentPeriod) {
        currentPeriod.end = clock.timestamp;
        workingPeriods.push(currentPeriod);
        currentPeriod = null;
      }
    }
  }

  // Check if required breaks were taken
  let totalWorkedMinutes = 0;
  for (const period of workingPeriods) {
    if (period.end) {
      const minutes = (period.end.getTime() - period.start.getTime()) / 1000 / 60;
      totalWorkedMinutes += minutes;
    }
  }

  const totalWorkedHours = totalWorkedMinutes / 60;

  // Check for meal break violation
  if (totalWorkedHours > config.mealBreakAfterHours) {
    const mealBreaks = clocks.filter(c => c.clockType === 'break_start');
    const mealBreakDuration = mealBreaks.reduce((total, breakStart, idx) => {
      const breakEnd = clocks.find((c, i) => 
        i > clocks.indexOf(breakStart) && c.clockType === 'break_end'
      );
      if (breakEnd) {
        return total + (breakEnd.timestamp.getTime() - breakStart.timestamp.getTime()) / 1000 / 60;
      }
      return total;
    }, 0);

    if (mealBreakDuration < config.mealBreakDurationMinutes) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: 'error',
        description: `Insufficient meal break time (${mealBreakDuration} < ${config.mealBreakDurationMinutes} minutes)`,
        affectedEmployeeId: userId,
        affectedDate: date,
        details: {
          hoursWorked: totalWorkedHours,
          mealBreakRequired: config.mealBreakDurationMinutes,
          mealBreakTaken: mealBreakDuration
        }
      });
    }
  }

  return violations;
}

// Check rest period compliance (minimum time between shifts)
async function checkRestPeriodCompliance(
  userId: number,
  date: Date,
  rule: ComplianceRule
): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = [];
  const config = rule.config as {
    minRestHours: number;
    consecutiveDaysLimit: number;
  };

  // Get clock-out from previous day and clock-in from current day
  const previousDayClockOut = await db
    .select()
    .from(timeClocks)
    .where(
      and(
        eq(timeClocks.userId, userId),
        eq(timeClocks.clockType, 'clock_out'),
        sql`DATE(${timeClocks.timestamp}) = DATE(${date}) - INTERVAL '1 day'`
      )
    )
    .orderBy(desc(timeClocks.timestamp))
    .limit(1);

  const currentDayClockIn = await db
    .select()
    .from(timeClocks)
    .where(
      and(
        eq(timeClocks.userId, userId),
        eq(timeClocks.clockType, 'clock_in'),
        sql`DATE(${timeClocks.timestamp}) = DATE(${date})`
      )
    )
    .orderBy(timeClocks.timestamp)
    .limit(1);

  if (previousDayClockOut[0] && currentDayClockIn[0]) {
    const restHours = (currentDayClockIn[0].timestamp.getTime() - previousDayClockOut[0].timestamp.getTime()) / 1000 / 60 / 60;
    
    if (restHours < config.minRestHours) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: 'error',
        description: `Insufficient rest period between shifts (${restHours.toFixed(1)} < ${config.minRestHours} hours)`,
        affectedEmployeeId: userId,
        affectedDate: date,
        details: {
          previousShiftEnd: previousDayClockOut[0].timestamp,
          currentShiftStart: currentDayClockIn[0].timestamp,
          restHours: restHours,
          requiredRestHours: config.minRestHours
        }
      });
    }
  }

  // Check consecutive days worked
  const consecutiveDays = await db
    .select({ date: timesheets.date })
    .from(timesheets)
    .where(
      and(
        eq(timesheets.userId, userId),
        lte(timesheets.date, date),
        gte(timesheets.date, new Date(date.getTime() - config.consecutiveDaysLimit * 24 * 60 * 60 * 1000))
      )
    )
    .orderBy(desc(timesheets.date));

  let consecutiveCount = 0;
  let lastDate = date;
  for (const day of consecutiveDays) {
    const dayDiff = (lastDate.getTime() - day.date.getTime()) / (24 * 60 * 60 * 1000);
    if (dayDiff <= 1) {
      consecutiveCount++;
      lastDate = day.date;
    } else {
      break;
    }
  }

  if (consecutiveCount > config.consecutiveDaysLimit) {
    violations.push({
      ruleId: rule.id,
      ruleName: rule.name,
      severity: 'warning',
      description: `Exceeded consecutive days worked limit (${consecutiveCount} > ${config.consecutiveDaysLimit})`,
      affectedEmployeeId: userId,
      affectedDate: date,
      details: {
        consecutiveDays: consecutiveCount,
        limit: config.consecutiveDaysLimit
      }
    });
  }

  return violations;
}

// Check minor employee compliance
async function checkMinorCompliance(
  userId: number,
  date: Date,
  rule: ComplianceRule
): Promise<ComplianceViolation[]> {
  const violations: ComplianceViolation[] = [];
  const config = rule.config as {
    maxDailyHours: number;
    maxWeeklyHours: number;
    latestEndTime: string; // HH:mm format
    schoolDayMaxHours: number;
  };

  // Get employee age
  const employee = await db
    .select({
      dateOfBirth: teamMembers.dateOfBirth
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .limit(1);

  if (!employee[0]?.dateOfBirth) {
    return violations;
  }

  const age = Math.floor((date.getTime() - employee[0].dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  // Only check if employee is a minor (under 18)
  if (age >= 18) {
    return violations;
  }

  // Get timesheet for the day
  const dayTimesheet = await db
    .select()
    .from(timesheets)
    .where(
      and(
        eq(timesheets.userId, userId),
        eq(timesheets.date, date)
      )
    )
    .limit(1);

  if (dayTimesheet[0]) {
    const hoursWorked = dayTimesheet[0].hoursWorked || 0;
    
    // Check daily hours limit
    if (hoursWorked > config.maxDailyHours) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: 'critical',
        description: `Minor employee exceeded daily hours limit (${hoursWorked} > ${config.maxDailyHours})`,
        affectedEmployeeId: userId,
        affectedDate: date,
        details: {
          age,
          hoursWorked,
          limit: config.maxDailyHours
        }
      });
    }

    // Check end time
    if (dayTimesheet[0].endTime) {
      const endHour = dayTimesheet[0].endTime.getHours();
      const endMinute = dayTimesheet[0].endTime.getMinutes();
      const [maxHour, maxMinute] = config.latestEndTime.split(':').map(Number);
      
      if (endHour > maxHour || (endHour === maxHour && endMinute > maxMinute)) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: 'error',
          description: `Minor employee worked past allowed time (${endHour}:${endMinute} > ${config.latestEndTime})`,
          affectedEmployeeId: userId,
          affectedDate: date,
          details: {
            age,
            endTime: `${endHour}:${endMinute}`,
            latestAllowed: config.latestEndTime
          }
        });
      }
    }
  }

  return violations;
}

// Main compliance check function
export async function checkCompliance(
  periodId?: number,
  userId?: number,
  date?: Date
): Promise<ComplianceCheckResult> {
  const allViolations: ComplianceViolation[] = [];
  const allWarnings: ComplianceViolation[] = [];
  const affectedEmployees = new Set<number>();

  // Get active compliance rules
  const rules = await db
    .select()
    .from(complianceRules)
    .where(eq(complianceRules.isActive, true));

  // Determine scope of check
  let startDate: Date;
  let endDate: Date;
  let userIds: number[] = [];

  if (periodId) {
    // Check entire payroll period
    const period = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, periodId))
      .limit(1);
    
    if (!period[0]) {
      throw new Error('Payroll period not found');
    }
    
    startDate = period[0].payPeriodStart;
    endDate = period[0].payPeriodEnd;
    
    // Get all employees with timesheets in this period
    const employees = await db
      .selectDistinct({ userId: timesheets.userId })
      .from(timesheets)
      .where(
        and(
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate)
        )
      );
    
    userIds = employees.map(e => e.userId);
  } else if (userId && date) {
    // Check specific user and date
    startDate = date;
    endDate = date;
    userIds = [userId];
  } else {
    throw new Error('Must provide either periodId or userId+date');
  }

  // Run checks for each user
  for (const uid of userIds) {
    for (const rule of rules) {
      let violations: ComplianceViolation[] = [];

      switch (rule.type) {
        case 'overtime':
          violations = await checkOvertimeCompliance(uid, startDate, endDate, rule);
          break;
        case 'break':
          // Check each day in the period
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            violations.push(...await checkBreakCompliance(uid, new Date(d), rule));
          }
          break;
        case 'rest':
          // Check each day in the period
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            violations.push(...await checkRestPeriodCompliance(uid, new Date(d), rule));
          }
          break;
        case 'minor':
          // Check each day in the period
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            violations.push(...await checkMinorCompliance(uid, new Date(d), rule));
          }
          break;
      }

      // Categorize violations
      for (const violation of violations) {
        affectedEmployees.add(violation.affectedEmployeeId);
        
        if (violation.severity === 'warning') {
          allWarnings.push(violation);
        } else {
          allViolations.push(violation);
        }
      }
    }
  }

  // Save violations to database
  if (allViolations.length > 0 || allWarnings.length > 0) {
    const violationsToSave = [...allViolations, ...allWarnings].map(v => ({
      ruleId: v.ruleId,
      employeeId: v.affectedEmployeeId,
      periodId: periodId || null,
      violationDate: v.affectedDate,
      severity: v.severity,
      description: v.description,
      details: v.details,
      status: 'open' as const,
      createdAt: new Date()
    }));

    await db.insert(complianceViolations).values(violationsToSave);
  }

  return {
    isCompliant: allViolations.length === 0,
    violations: allViolations,
    warnings: allWarnings,
    summary: {
      totalViolations: allViolations.length,
      criticalViolations: allViolations.filter(v => v.severity === 'critical').length,
      employees: affectedEmployees.size
    }
  };
}

// Create or update compliance rule
export async function upsertComplianceRule(
  rule: Omit<ComplianceRule, 'id'> & { id?: number },
  userId: number
): Promise<ComplianceRule> {
  if (rule.id) {
    // Update existing rule
    await db
      .update(complianceRules)
      .set({
        name: rule.name,
        type: rule.type,
        config: rule.config,
        severity: rule.severity,
        isActive: rule.active,
        updatedAt: new Date()
      })
      .where(eq(complianceRules.id, rule.id));
    
    const updated = await db
      .select()
      .from(complianceRules)
      .where(eq(complianceRules.id, rule.id))
      .limit(1);
    
    return updated[0] as ComplianceRule;
  } else {
    // Create new rule
    const inserted = await db
      .insert(complianceRules)
      .values({
        name: rule.name,
        type: rule.type,
        config: rule.config,
        severity: rule.severity,
        isActive: rule.active,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return inserted[0] as ComplianceRule;
  }
}

// Get compliance violations
export async function getComplianceViolations(
  filters: {
    periodId?: number;
    employeeId?: number;
    severity?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<any[]> {
  let query = db
    .select({
      id: complianceViolations.id,
      ruleName: complianceRules.name,
      ruleType: complianceRules.type,
      employeeId: complianceViolations.employeeId,
      employeeName: teamMembers.name,
      violationDate: complianceViolations.violationDate,
      severity: complianceViolations.severity,
      description: complianceViolations.description,
      details: complianceViolations.details,
      status: complianceViolations.status,
      resolution: complianceViolations.resolution,
      resolvedBy: complianceViolations.resolvedBy,
      resolvedAt: complianceViolations.resolvedAt,
      createdAt: complianceViolations.createdAt
    })
    .from(complianceViolations)
    .leftJoin(complianceRules, eq(complianceViolations.ruleId, complianceRules.id))
    .leftJoin(teamMembers, eq(complianceViolations.employeeId, teamMembers.userId))
    .$dynamic();

  const conditions: any[] = [];
  
  if (filters.periodId) {
    conditions.push(eq(complianceViolations.periodId, filters.periodId));
  }
  
  if (filters.employeeId) {
    conditions.push(eq(complianceViolations.employeeId, filters.employeeId));
  }
  
  if (filters.severity) {
    conditions.push(eq(complianceViolations.severity, filters.severity));
  }
  
  if (filters.status) {
    conditions.push(eq(complianceViolations.status, filters.status));
  }
  
  if (filters.startDate) {
    conditions.push(gte(complianceViolations.violationDate, filters.startDate));
  }
  
  if (filters.endDate) {
    conditions.push(lte(complianceViolations.violationDate, filters.endDate));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }
  
  return await query.orderBy(desc(complianceViolations.violationDate));
}

// Resolve compliance violation
export async function resolveViolation(
  violationId: number,
  resolution: string,
  userId: number
): Promise<void> {
  await db
    .update(complianceViolations)
    .set({
      status: 'resolved',
      resolution,
      resolvedBy: userId,
      resolvedAt: new Date()
    })
    .where(eq(complianceViolations.id, violationId));
  
  // Create audit log
  await db.insert(auditEvents).values({
    userId,
    action: 'RESOLVE_COMPLIANCE_VIOLATION',
    resourceType: 'compliance_violation',
    resourceId: violationId.toString(),
    organizationId: 1, // TODO: Get from context
    details: {
      resolution
    }
  });
}

// Get compliance rules
export async function getComplianceRules(
  activeOnly: boolean = false
): Promise<ComplianceRule[]> {
  let query = db.select().from(complianceRules).$dynamic();
  
  if (activeOnly) {
    query = query.where(eq(complianceRules.isActive, true));
  }
  
  const rules = await query.orderBy(complianceRules.name);
  
  return rules.map(r => ({
    id: r.id,
    name: r.name,
    type: r.type as any,
    config: r.config as any,
    severity: r.severity as any,
    active: r.isActive
  }));
}
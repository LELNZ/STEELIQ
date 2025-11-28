import { db } from "../db";
import { 
  timesheets, timeClocks, timeEntries, teamMembers, laborRates, 
  payrollPeriods, complianceViolations 
} from "@shared/schema";
import { eq, and, gte, lte, isNull, isNotNull, sql, desc, gt } from "drizzle-orm";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subDays } from "date-fns";

interface TimeAnalytics {
  overview: {
    totalEmployees: number;
    activeToday: number;
    onTime: number;
    late: number;
    absent: number;
    onBreak: number;
    totalHoursToday: number;
    totalHoursWeek: number;
    totalHoursMonth: number;
    overtimeHours: number;
    averageHoursPerDay: number;
  };
  payroll: {
    currentPeriodCost: number;
    projectedCost: number;
    overtimeCost: number;
    regularCost: number;
    averageCostPerHour: number;
    costVariance: number;
    budgetUtilization: number;
  };
  compliance: {
    overtimeViolations: number;
    breakViolations: number;
    lateClockIns: number;
    missedClockOuts: number;
    complianceScore: number;
  };
  productivity: {
    utilizationRate: number;
    billableHours: number;
    nonBillableHours: number;
    idleTime: number;
    productivityScore: number;
  };
  trends: {
    daily: Array<{ date: string; hours: number; cost: number; employees: number }>;
    weekly: Array<{ week: string; hours: number; cost: number; overtime: number }>;
    departmental: Array<{ department: string; hours: number; cost: number; efficiency: number }>;
  };
}

class TimeAnalyticsService {
  /**
   * Get comprehensive analytics for the Time & Payroll dashboard
   */
  async getAnalytics(
    period: 'today' | 'week' | 'month' | 'quarter' = 'week',
    department: string = 'all'
  ): Promise<TimeAnalytics> {
    // Calculate date ranges based on period
    const { startDate, endDate } = this.calculateDateRange(period);
    
    // Fetch all metrics in parallel for efficiency
    const [
      overviewMetrics,
      payrollMetrics,
      complianceMetrics,
      productivityMetrics,
      trendData
    ] = await Promise.all([
      this.getOverviewMetrics(startDate, endDate, department),
      this.getPayrollMetrics(startDate, endDate, department),
      this.getComplianceMetrics(startDate, endDate, department),
      this.getProductivityMetrics(startDate, endDate, department),
      this.getTrendData(startDate, endDate, department)
    ]);

    return {
      overview: overviewMetrics,
      payroll: payrollMetrics,
      compliance: complianceMetrics,
      productivity: productivityMetrics,
      trends: trendData
    };
  }

  /**
   * Calculate date range based on period
   */
  private calculateDateRange(period: string): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate = now;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'quarter':
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterMonth, 1);
        endDate = new Date(now.getFullYear(), quarterMonth + 3, 0);
        break;
      default:
        startDate = startOfWeek(now, { weekStartsOn: 1 });
    }
    
    return { startDate, endDate };
  }

  /**
   * Get overview metrics (employees, hours, attendance)
   */
  private async getOverviewMetrics(startDate: Date, endDate: Date, department: string) {
    // Get total active employees
    const totalEmployeesQuery = db
      .select({ count: sql`count(*)::int` })
      .from(teamMembers)
      .where(eq(teamMembers.isActive, true));
    
    if (department !== 'all') {
      totalEmployeesQuery.where(and(
        eq(teamMembers.isActive, true),
        eq(teamMembers.department, department)
      ));
    }
    
    const [totalEmployees] = await totalEmployeesQuery;

    // Get active employees today (currently clocked in)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [activeToday] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${timeClocks.userId})::int`.as('count') })
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.clockType, 'clock_in'),
          gte(timeClocks.timestamp, today),
          isNull(timeClocks.clockOutTimestamp)
        )
      );

    // Get late clock-ins (after 9 AM)
    const [lateClockIns] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${timeClocks.userId})::int`.as('count') })
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.clockType, 'clock_in'),
          gte(timeClocks.timestamp, today),
          sql`extract(hour from ${timeClocks.timestamp}) > 9`
        )
      );

    // Get employees on break
    const [onBreak] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${timeClocks.userId})::int`.as('count') })
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.clockType, 'break_start'),
          gte(timeClocks.timestamp, today),
          isNull(timeClocks.breakEndTimestamp)
        )
      );

    // Get hours data from timesheets
    const hoursQuery = db
      .select({
        totalHours: sql`COALESCE(sum(${timesheets.hoursWorked}), 0)::float`,
        overtimeHours: sql`COALESCE(sum(${timesheets.overtimeHours}), 0)::float`,
        dayCount: sql`count(distinct date(${timesheets.date}))::int`
      })
      .from(timesheets);
    
    if (department !== 'all') {
      hoursQuery
        .leftJoin(teamMembers, eq(timesheets.userId, teamMembers.userId))
        .where(
          and(
            gte(timesheets.date, startDate),
            lte(timesheets.date, endDate),
            eq(teamMembers.department, department)
          )
        );
    } else {
      hoursQuery.where(
        and(
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate)
        )
      );
    }
    
    const [hoursData] = await hoursQuery;
    const avgHoursPerDay = hoursData.dayCount > 0 
      ? hoursData.totalHours / hoursData.dayCount 
      : 0;

    // Calculate today's hours specifically
    const [todayHours] = await db
      .select({
        hours: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(${timeClocks.clockOutTimestamp}, now()) - ${timeClocks.timestamp}))/3600), 0)::float`.as('hours')
      })
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.clockType, 'clock_in'),
          gte(timeClocks.timestamp, today)
        )
      );

    return {
      totalEmployees: totalEmployees?.count || 0,
      activeToday: activeToday?.count || 0,
      onTime: Math.max(0, (activeToday?.count || 0) - (lateClockIns?.count || 0)),
      late: lateClockIns?.count || 0,
      absent: Math.max(0, (totalEmployees?.count || 0) - (activeToday?.count || 0)),
      onBreak: onBreak?.count || 0,
      totalHoursToday: todayHours?.hours || 0,
      totalHoursWeek: hoursData?.totalHours || 0,
      totalHoursMonth: hoursData?.totalHours || 0,
      overtimeHours: hoursData?.overtimeHours || 0,
      averageHoursPerDay: Math.round(avgHoursPerDay * 10) / 10
    };
  }

  /**
   * Get payroll metrics (costs, overtime, budget)
   */
  private async getPayrollMetrics(startDate: Date, endDate: Date, department: string) {
    // Get current payroll period if exists
    const [currentPeriod] = await db
      .select()
      .from(payrollPeriods)
      .where(
        and(
          lte(payrollPeriods.payPeriodStart, endDate),
          gte(payrollPeriods.payPeriodEnd, startDate),
          eq(payrollPeriods.status, 'open')
        )
      )
      .limit(1);

    // Calculate costs from timesheets with labor rates
    // Build WHERE conditions
    const whereConditions = department !== 'all' 
      ? and(
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate),
          eq(teamMembers.department, department)
        )
      : and(
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate)
        );

    const costQuery = db
      .select({
        totalCost: sql<number>`COALESCE(SUM((${timesheets.hoursWorked} - ${timesheets.overtimeHours}) * COALESCE(${laborRates.standardRate}, 75.0) + ${timesheets.overtimeHours} * COALESCE(${laborRates.overtimeRate}, ${laborRates.standardRate} * 1.5, 112.5)), 0)::float`.as('totalCost'),
        overtimeCost: sql<number>`COALESCE(SUM(${timesheets.overtimeHours} * COALESCE(${laborRates.overtimeRate}, ${laborRates.standardRate} * 1.5, 112.5)), 0)::float`.as('overtimeCost'),
        regularCost: sql<number>`COALESCE(SUM((${timesheets.hoursWorked} - ${timesheets.overtimeHours}) * COALESCE(${laborRates.standardRate}, 75.0)), 0)::float`.as('regularCost'),
        avgRate: sql<number>`COALESCE(AVG(${laborRates.standardRate}), 75.0)::float`.as('avgRate'),
        totalHours: sql<number>`COALESCE(SUM(${timesheets.hoursWorked}), 0)::float`.as('totalHours')
      })
      .from(timesheets)
      .leftJoin(teamMembers, eq(timesheets.userId, teamMembers.userId))
      .leftJoin(laborRates, eq(teamMembers.roleId, laborRates.roleId))
      .where(whereConditions);
    
    const [costData] = await costQuery;
    
    // Calculate projected cost (current + estimated remaining)
    const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const projectionFactor = daysElapsed > 0 ? daysInPeriod / daysElapsed : 1;
    const projectedCost = (costData?.totalCost || 0) * Math.min(projectionFactor, 2); // Cap at 2x
    
    // Calculate average cost per hour
    const avgCostPerHour = costData.totalHours > 0 
      ? costData.totalCost / costData.totalHours 
      : costData.avgRate;

    // Budget utilization (assuming budget is 110% of projected)
    const budget = projectedCost * 1.1;
    const budgetUtilization = budget > 0 
      ? Math.round((costData.totalCost / budget) * 100) 
      : 0;

    return {
      currentPeriodCost: Math.round(costData?.totalCost || 0),
      projectedCost: Math.round(projectedCost),
      overtimeCost: Math.round(costData?.overtimeCost || 0),
      regularCost: Math.round(costData?.regularCost || 0),
      averageCostPerHour: Math.round(avgCostPerHour * 100) / 100,
      costVariance: Math.round((costData.totalCost - projectedCost) / projectedCost * 100) || 0,
      budgetUtilization: budgetUtilization
    };
  }

  /**
   * Get compliance metrics (violations, score)
   */
  private async getComplianceMetrics(startDate: Date, endDate: Date, department: string) {
    // Get overtime violations (>60 hours/week)
    const [overtimeViolations] = await db
      .select({ count: sql`count(*)::int` })
      .from(timesheets)
      .where(
        and(
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate),
          gt(timesheets.overtimeHours, 20) // More than 20 hours OT
        )
      );

    // Get stored compliance violations
    const [storedViolations] = await db
      .select({
        breakViolations: sql`count(case when ${complianceViolations.violationType} = 'break_violation' then 1 end)::int`,
        mealViolations: sql`count(case when ${complianceViolations.violationType} = 'meal_violation' then 1 end)::int`,
        overtimeViolations: sql`count(case when ${complianceViolations.violationType} = 'overtime_violation' then 1 end)::int`
      })
      .from(complianceViolations)
      .where(
        and(
          gte(complianceViolations.violationDate, startDate),
          lte(complianceViolations.violationDate, endDate)
        )
      );

    // Get late clock-ins count
    const [lateClockIns] = await db
      .select({ count: sql`count(*)::int` })
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.clockType, 'clock_in'),
          gte(timeClocks.timestamp, startDate),
          lte(timeClocks.timestamp, endDate),
          sql`extract(hour from ${timeClocks.timestamp}) > 9`
        )
      );

    // Get missed clock-outs (clock-ins without corresponding clock-outs)
    const [missedClockOuts] = await db
      .select({ count: sql`count(*)::int` })
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.clockType, 'clock_in'),
          gte(timeClocks.timestamp, startDate),
          lte(timeClocks.timestamp, endDate),
          isNull(timeClocks.clockOutTimestamp)
        )
      );

    // Calculate compliance score
    const totalViolations = 
      (overtimeViolations?.count || 0) +
      (storedViolations?.breakViolations || 0) +
      (storedViolations?.mealViolations || 0) +
      (lateClockIns?.count || 0) +
      (missedClockOuts?.count || 0);
    
    // Score decreases by 2% per violation, minimum 0
    const complianceScore = Math.max(0, Math.min(100, 100 - (totalViolations * 2)));

    return {
      overtimeViolations: (overtimeViolations?.count || 0) + (storedViolations?.overtimeViolations || 0),
      breakViolations: storedViolations?.breakViolations || 0,
      lateClockIns: lateClockIns?.count || 0,
      missedClockOuts: missedClockOuts?.count || 0,
      complianceScore: Math.round(complianceScore)
    };
  }

  /**
   * Get productivity metrics (utilization, billable hours)
   */
  private async getProductivityMetrics(startDate: Date, endDate: Date, department: string) {
    // Get employee count and hours worked
    const employeeQuery = db
      .select({ count: sql`count(distinct ${teamMembers.userId})::int` })
      .from(teamMembers)
      .where(eq(teamMembers.isActive, true));
    
    if (department !== 'all') {
      employeeQuery.where(and(
        eq(teamMembers.isActive, true),
        eq(teamMembers.department, department)
      ));
    }
    
    const [employeeCount] = await employeeQuery;

    // Get total hours worked
    const hoursQuery = db
      .select({
        totalHours: sql`COALESCE(sum(${timesheets.hoursWorked}), 0)::float`,
        billableHours: sql`COALESCE(sum(
          case when ${timesheets.jobId} is not null 
          then ${timesheets.hoursWorked} 
          else 0 end
        ), 0)::float`
      })
      .from(timesheets);
    
    if (department !== 'all') {
      hoursQuery
        .leftJoin(teamMembers, eq(timesheets.userId, teamMembers.userId))
        .where(
          and(
            gte(timesheets.date, startDate),
            lte(timesheets.date, endDate),
            eq(teamMembers.department, department)
          )
        );
    } else {
      hoursQuery.where(
        and(
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate)
        )
      );
    }
    
    const [hoursData] = await hoursQuery;

    // Calculate utilization
    const workDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekdays = Math.floor(workDays * 5 / 7); // Rough estimate of weekdays
    const totalPossibleHours = (employeeCount?.count || 0) * weekdays * 8;
    
    const utilizationRate = totalPossibleHours > 0 
      ? (hoursData.totalHours / totalPossibleHours) * 100 
      : 0;

    // Calculate productivity score based on utilization and billable ratio
    const billableRatio = hoursData.totalHours > 0 
      ? hoursData.billableHours / hoursData.totalHours 
      : 0;
    const productivityScore = (utilizationRate * 0.6) + (billableRatio * 100 * 0.4);

    return {
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      billableHours: Math.round(hoursData.billableHours * 10) / 10,
      nonBillableHours: Math.round((hoursData.totalHours - hoursData.billableHours) * 10) / 10,
      idleTime: Math.max(0, totalPossibleHours - hoursData.totalHours),
      productivityScore: Math.round(Math.min(100, productivityScore))
    };
  }

  /**
   * Get trend data (daily, weekly, departmental)
   */
  private async getTrendData(startDate: Date, endDate: Date, department: string) {
    // Get daily trends for last 7 days
    const dailyTrends = await db
      .select({
        date: sql`date(${timeClocks.timestamp})`.as('date'),
        hours: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(${timeClocks.clockOutTimestamp}, now()) - ${timeClocks.timestamp}))/3600), 0)::float`.as('hours'),
        employees: sql<number>`COUNT(DISTINCT ${timeClocks.userId})::int`.as('employees')
      })
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.clockType, 'clock_in'),
          gte(timeClocks.timestamp, subDays(new Date(), 7))
        )
      )
      .groupBy(sql`date(${timeClocks.timestamp})`)
      .orderBy(sql`date(${timeClocks.timestamp})`)
      .limit(7);

    // Get weekly trends for last 4 weeks
    const weeklyTrends = await db
      .select({
        weekStart: timesheets.weekStartDate,
        hours: sql<number>`COALESCE(SUM(${timesheets.hoursWorked}), 0)::float`.as('hours'),
        overtime: sql<number>`COALESCE(SUM(${timesheets.overtimeHours}), 0)::float`.as('overtime'),
        cost: sql<number>`COALESCE(SUM((${timesheets.hoursWorked} - ${timesheets.overtimeHours}) * 75.0 + ${timesheets.overtimeHours} * 112.5), 0)::float`.as('cost')
      })
      .from(timesheets)
      .where(gte(timesheets.weekStartDate, subDays(new Date(), 28)))
      .groupBy(timesheets.weekStartDate)
      .orderBy(timesheets.weekStartDate)
      .limit(4);

    // Get departmental breakdown
    const departmentalData = await db
      .select({
        department: teamMembers.department,
        hours: sql<number>`COALESCE(SUM(${timesheets.hoursWorked}), 0)::float`.as('hours'),
        cost: sql<number>`COALESCE(SUM(${timesheets.hoursWorked} * COALESCE(${laborRates.standardRate}, 75.0)), 0)::float`.as('cost'),
        employees: sql<number>`COUNT(DISTINCT ${timesheets.userId})::int`.as('employees')
      })
      .from(timesheets)
      .leftJoin(teamMembers, eq(timesheets.userId, teamMembers.userId))
      .leftJoin(laborRates, eq(teamMembers.roleId, laborRates.roleId))
      .where(
        and(
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate),
          isNotNull(teamMembers.department)
        )
      )
      .groupBy(teamMembers.department)
      .orderBy(desc(sql`sum(${timesheets.hoursWorked})`))
      .limit(5);

    return {
      daily: dailyTrends.map(d => ({
        date: format(d.date, 'yyyy-MM-dd'),
        hours: Math.round(d.hours * 10) / 10,
        cost: Math.round(d.hours * 75), // Using default rate for trends
        employees: d.employees
      })),
      weekly: weeklyTrends.map(w => ({
        week: format(w.weekStart, 'MMM dd'),
        hours: Math.round(w.hours * 10) / 10,
        cost: Math.round(w.cost),
        overtime: Math.round(w.overtime * 10) / 10
      })),
      departmental: departmentalData.map(d => ({
        department: d.department || 'Unknown',
        hours: Math.round(d.hours * 10) / 10,
        cost: Math.round(d.cost),
        efficiency: d.employees > 0 ? Math.round((d.hours / (d.employees * 40)) * 100) : 0
      }))
    };
  }
}

export const timeAnalyticsService = new TimeAnalyticsService();
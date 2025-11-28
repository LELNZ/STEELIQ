import { db } from "../db";
import { 
  timesheets, timeClocks, teamMembers, laborRates, departments
} from "@shared/schema";
import { eq, and, gte, lte, lt, sql, count, isNull } from "drizzle-orm";
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

class TimeAnalyticsServiceSimple {
  async getAnalytics(
    period: string = 'week',
    department: string = 'all'
  ): Promise<TimeAnalytics> {
    console.log('TimeAnalyticsServiceSimple.getAnalytics called with:', { period, department });
    
    try {
      const now = new Date();
      let startDate: Date;
      let endDate = new Date();
      
      switch(period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
          break;
        case 'week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'quarter':
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterMonth, 1);
          endDate = new Date(now.getFullYear(), quarterMonth + 3, 0, 23, 59, 59, 999);
          break;
        default:
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
      }
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const deptCondition = department && department !== 'all' 
        ? eq(teamMembers.departmentId, Number(department)) 
        : undefined;
      
      const employeeCountQuery = deptCondition 
        ? db.select({ count: count() }).from(teamMembers).where(deptCondition)
        : db.select({ count: count() }).from(teamMembers);
      
      const employeeCountResult = await employeeCountQuery;
      const employeeCount = employeeCountResult[0]?.count || 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      let activeEmployees = 0;
      if (deptCondition) {
        const withDeptFilter = await db
          .select({ count: sql<number>`COUNT(DISTINCT ${timeClocks.userId})::int` })
          .from(timeClocks)
          .innerJoin(teamMembers, eq(timeClocks.userId, teamMembers.userId))
          .where(
            and(
              eq(timeClocks.clockType, 'clock_in'),
              gte(timeClocks.timestamp, today),
              isNull(timeClocks.clockOutTimestamp),
              deptCondition
            )
          );
        activeEmployees = withDeptFilter[0]?.count || 0;
      } else {
        const activeClocksResult = await db
          .select({ count: sql<number>`COUNT(DISTINCT ${timeClocks.userId})::int` })
          .from(timeClocks)
          .where(
            and(
              eq(timeClocks.clockType, 'clock_in'),
              gte(timeClocks.timestamp, today),
              isNull(timeClocks.clockOutTimestamp)
            )
          );
        activeEmployees = activeClocksResult[0]?.count || 0;
      }
      
      let hoursQuery;
      if (department && department !== 'all') {
        hoursQuery = db
          .select({ 
            totalHours: sql<number>`COALESCE(SUM(${timesheets.hoursWorked}), 0)::float`,
            overtimeHours: sql<number>`COALESCE(SUM(${timesheets.overtimeHours}), 0)::float`,
            dayCount: sql<number>`GREATEST(COUNT(DISTINCT DATE(${timesheets.date})), 1)::int`
          })
          .from(timesheets)
          .innerJoin(teamMembers, eq(timesheets.userId, teamMembers.userId))
          .where(
            and(
              gte(timesheets.date, startDateStr),
              lte(timesheets.date, endDateStr),
              eq(teamMembers.departmentId, Number(department))
            )
          );
      } else {
        hoursQuery = db
          .select({ 
            totalHours: sql<number>`COALESCE(SUM(${timesheets.hoursWorked}), 0)::float`,
            overtimeHours: sql<number>`COALESCE(SUM(${timesheets.overtimeHours}), 0)::float`,
            dayCount: sql<number>`GREATEST(COUNT(DISTINCT DATE(${timesheets.date})), 1)::int`
          })
          .from(timesheets)
          .where(
            and(
              gte(timesheets.date, startDateStr),
              lte(timesheets.date, endDateStr)
            )
          );
      }
      
      const hoursResult = await hoursQuery;
      const totalHours = hoursResult[0]?.totalHours || 0;
      const overtimeHours = hoursResult[0]?.overtimeHours || 0;
      const dayCount = hoursResult[0]?.dayCount || 1;
      
      let costQuery;
      if (department && department !== 'all') {
        costQuery = db
          .select({
            totalCost: sql<number>`COALESCE(SUM((${timesheets.hoursWorked} - ${timesheets.overtimeHours}) * COALESCE(${laborRates.standardRate}, 75.0) + ${timesheets.overtimeHours} * COALESCE(${laborRates.overtimeRate}, ${laborRates.standardRate} * 1.5, 112.5)), 0)::float`,
            overtimeCost: sql<number>`COALESCE(SUM(${timesheets.overtimeHours} * COALESCE(${laborRates.overtimeRate}, ${laborRates.standardRate} * 1.5, 112.5)), 0)::float`,
            regularCost: sql<number>`COALESCE(SUM((${timesheets.hoursWorked} - ${timesheets.overtimeHours}) * COALESCE(${laborRates.standardRate}, 75.0)), 0)::float`
          })
          .from(timesheets)
          .leftJoin(teamMembers, eq(timesheets.userId, teamMembers.userId))
          .leftJoin(laborRates, eq(teamMembers.roleId, laborRates.roleId))
          .where(
            and(
              gte(timesheets.date, startDateStr),
              lte(timesheets.date, endDateStr),
              eq(teamMembers.departmentId, Number(department))
            )
          );
      } else {
        costQuery = db
          .select({
            totalCost: sql<number>`COALESCE(SUM((${timesheets.hoursWorked} - ${timesheets.overtimeHours}) * COALESCE(${laborRates.standardRate}, 75.0) + ${timesheets.overtimeHours} * COALESCE(${laborRates.overtimeRate}, ${laborRates.standardRate} * 1.5, 112.5)), 0)::float`,
            overtimeCost: sql<number>`COALESCE(SUM(${timesheets.overtimeHours} * COALESCE(${laborRates.overtimeRate}, ${laborRates.standardRate} * 1.5, 112.5)), 0)::float`,
            regularCost: sql<number>`COALESCE(SUM((${timesheets.hoursWorked} - ${timesheets.overtimeHours}) * COALESCE(${laborRates.standardRate}, 75.0)), 0)::float`
          })
          .from(timesheets)
          .leftJoin(teamMembers, eq(timesheets.userId, teamMembers.userId))
          .leftJoin(laborRates, eq(teamMembers.roleId, laborRates.roleId))
          .where(
            and(
              gte(timesheets.date, startDateStr),
              lte(timesheets.date, endDateStr)
            )
          );
      }
      
      const costResult = await costQuery;
      const totalCost = costResult[0]?.totalCost || 0;
      const overtimeCost = costResult[0]?.overtimeCost || 0;
      const regularCost = costResult[0]?.regularCost || 0;
      
      let todayHours = 0;
      if (startDate <= today && endDate >= today) {
        const [todayData] = await db
          .select({
            hours: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(${timeClocks.clockOutTimestamp}, NOW()) - ${timeClocks.timestamp}))/3600), 0)::float`
          })
          .from(timeClocks)
          .where(
            and(
              eq(timeClocks.clockType, 'clock_in'),
              gte(timeClocks.timestamp, today),
              lt(timeClocks.timestamp, tomorrow)
            )
          );
        todayHours = todayData?.hours || 0;
      }
      
      const [lateCountResult] = await db
        .select({ count: count() })
        .from(timeClocks)
        .where(
          and(
            eq(timeClocks.clockType, 'clock_in'),
            gte(timeClocks.timestamp, today),
            lt(timeClocks.timestamp, tomorrow),
            sql`EXTRACT(HOUR FROM ${timeClocks.timestamp}) > 9`
          )
        );
      const lateClockInCount = lateCountResult?.count || 0;
      
      const [breakCountResult] = await db
        .select({ count: count() })
        .from(timeClocks)
        .where(
          and(
            eq(timeClocks.clockType, 'break_start'),
            gte(timeClocks.timestamp, today),
            lt(timeClocks.timestamp, tomorrow),
            isNull(timeClocks.clockOutTimestamp)
          )
        );
      const onBreakCount = breakCountResult?.count || 0;
      
      const avgHoursPerDay = dayCount > 0 ? totalHours / dayCount : 0;
      const avgCostPerHour = totalHours > 0 ? totalCost / totalHours : 75;
      
      const [overtimeViolationsResult] = await db
        .select({ count: count() })
        .from(timesheets)
        .where(
          and(
            gte(timesheets.date, startDateStr),
            lte(timesheets.date, endDateStr),
            sql`${timesheets.overtimeHours} > 0`
          )
        );
      const overtimeViolations = overtimeViolationsResult?.count || 0;
      
      const [missedClockOutsResult] = await db
        .select({ count: count() })
        .from(timeClocks)
        .where(
          and(
            eq(timeClocks.clockType, 'clock_in'),
            gte(timeClocks.timestamp, startDate),
            lte(timeClocks.timestamp, endDate),
            isNull(timeClocks.clockOutTimestamp),
            sql`${timeClocks.timestamp} < NOW() - INTERVAL '12 hours'`
          )
        );
      const missedClockOuts = missedClockOutsResult?.count || 0;
      
      const maxViolations = Math.max(employeeCount * 5, 1);
      const actualViolations = overtimeViolations + lateClockInCount + missedClockOuts;
      const complianceScore = Math.max(0, Math.round(100 - (actualViolations / maxViolations * 100)));
      
      const expectedHoursPerDay = 8;
      const expectedTotalHours = employeeCount * expectedHoursPerDay * dayCount;
      const utilizationRate = expectedTotalHours > 0 ? Math.min(100, (totalHours / expectedTotalHours) * 100) : 0;
      const billableHours = totalHours * 0.85;
      const nonBillableHours = totalHours * 0.15;
      const onTimePercentage = activeEmployees > 0 ? ((activeEmployees - lateClockInCount) / activeEmployees) * 100 : 100;
      const productivityScore = Math.round((utilizationRate * 0.7) + (onTimePercentage * 0.3));
      
      const sevenDaysAgo = subDays(today, 6).toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      
      const dailyTrendsResult = await db
        .select({
          date: timesheets.date,
          hours: sql<number>`COALESCE(SUM(${timesheets.hoursWorked}), 0)::float`,
          employees: sql<number>`COUNT(DISTINCT ${timesheets.userId})::int`
        })
        .from(timesheets)
        .where(
          and(
            gte(timesheets.date, sevenDaysAgo),
            lte(timesheets.date, todayStr)
          )
        )
        .groupBy(timesheets.date)
        .orderBy(timesheets.date);
      
      const dailyTrends = dailyTrendsResult.map(row => ({
        date: String(row.date),
        hours: row.hours || 0,
        cost: (row.hours || 0) * avgCostPerHour,
        employees: row.employees || 0
      }));
      
      const fourWeeksAgo = subDays(today, 28).toISOString().split('T')[0];
      
      const weeklyTrendsResult = await db
        .select({
          weekNum: sql<number>`EXTRACT(WEEK FROM ${timesheets.date})::int`,
          hours: sql<number>`COALESCE(SUM(${timesheets.hoursWorked}), 0)::float`,
          overtime: sql<number>`COALESCE(SUM(${timesheets.overtimeHours}), 0)::float`
        })
        .from(timesheets)
        .where(
          and(
            gte(timesheets.date, fourWeeksAgo),
            lte(timesheets.date, todayStr)
          )
        )
        .groupBy(sql`EXTRACT(WEEK FROM ${timesheets.date})`)
        .orderBy(sql`EXTRACT(WEEK FROM ${timesheets.date})`);
      
      const weeklyTrends = weeklyTrendsResult.map((row, idx) => ({
        week: idx === weeklyTrendsResult.length - 1 ? 'Current' : `Week ${idx + 1}`,
        hours: row.hours || 0,
        cost: (row.hours || 0) * avgCostPerHour,
        overtime: row.overtime || 0
      }));
      
      const departmentalResult = await db
        .select({
          departmentName: departments.name,
          hours: sql<number>`COALESCE(SUM(${timesheets.hoursWorked}), 0)::float`,
          employees: sql<number>`COUNT(DISTINCT ${timesheets.userId})::int`
        })
        .from(timesheets)
        .leftJoin(teamMembers, eq(timesheets.userId, teamMembers.userId))
        .leftJoin(departments, eq(teamMembers.departmentId, departments.id))
        .where(
          and(
            gte(timesheets.date, startDateStr),
            lte(timesheets.date, endDateStr)
          )
        )
        .groupBy(departments.name);
      
      const departmentalTrends = departmentalResult.map(row => {
        const deptEmployees = row.employees || 1;
        const expectedDeptHours = deptEmployees * expectedHoursPerDay * dayCount;
        const efficiency = expectedDeptHours > 0 ? Math.round((row.hours / expectedDeptHours) * 100) : 0;
        return {
          department: row.departmentName || 'Unassigned',
          hours: row.hours || 0,
          cost: (row.hours || 0) * avgCostPerHour,
          efficiency: Math.min(100, efficiency)
        };
      });
      
      return {
        overview: {
          totalEmployees: employeeCount,
          activeToday: activeEmployees,
          onTime: Math.max(0, activeEmployees - lateClockInCount),
          late: lateClockInCount,
          absent: Math.max(0, employeeCount - activeEmployees),
          onBreak: onBreakCount,
          totalHoursToday: todayHours,
          totalHoursWeek: period === 'week' ? totalHours : totalHours,
          totalHoursMonth: period === 'month' ? totalHours : totalHours,
          overtimeHours,
          averageHoursPerDay: Math.round(avgHoursPerDay * 10) / 10
        },
        payroll: {
          currentPeriodCost: totalCost,
          projectedCost: totalCost * 52 / 12,
          overtimeCost,
          regularCost,
          averageCostPerHour: Math.round(avgCostPerHour * 100) / 100,
          costVariance: 0,
          budgetUtilization: Math.round(utilizationRate * 10) / 10
        },
        compliance: {
          overtimeViolations,
          breakViolations: 0,
          lateClockIns: lateClockInCount,
          missedClockOuts,
          complianceScore
        },
        productivity: {
          utilizationRate: Math.round(utilizationRate * 10) / 10,
          billableHours: Math.round(billableHours * 10) / 10,
          nonBillableHours: Math.round(nonBillableHours * 10) / 10,
          idleTime: Math.max(0, expectedTotalHours - totalHours),
          productivityScore
        },
        trends: {
          daily: dailyTrends.length > 0 ? dailyTrends : [],
          weekly: weeklyTrends.length > 0 ? weeklyTrends : [],
          departmental: departmentalTrends.length > 0 ? departmentalTrends : []
        }
      };
    } catch (error) {
      console.error('Error in TimeAnalyticsServiceSimple.getAnalytics:', error);
      return this.getDefaultAnalytics();
    }
  }
  
  private getDefaultAnalytics(): TimeAnalytics {
    return {
      overview: {
        totalEmployees: 0,
        activeToday: 0,
        onTime: 0,
        late: 0,
        absent: 0,
        onBreak: 0,
        totalHoursToday: 0,
        totalHoursWeek: 0,
        totalHoursMonth: 0,
        overtimeHours: 0,
        averageHoursPerDay: 0
      },
      payroll: {
        currentPeriodCost: 0,
        projectedCost: 0,
        overtimeCost: 0,
        regularCost: 0,
        averageCostPerHour: 0,
        costVariance: 0,
        budgetUtilization: 0
      },
      compliance: {
        overtimeViolations: 0,
        breakViolations: 0,
        lateClockIns: 0,
        missedClockOuts: 0,
        complianceScore: 100
      },
      productivity: {
        utilizationRate: 0,
        billableHours: 0,
        nonBillableHours: 0,
        idleTime: 0,
        productivityScore: 0
      },
      trends: {
        daily: [],
        weekly: [],
        departmental: []
      }
    };
  }
}

export const timeAnalyticsServiceSimple = new TimeAnalyticsServiceSimple();

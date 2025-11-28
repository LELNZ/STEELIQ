import { db } from "../db";
import { 
  timesheets, teamMembers, laborRates, departments, roles, costCenters
} from "@shared/schema";
import { eq, and, gte, lte, sql, count, desc, asc, isNull, isNotNull, or } from "drizzle-orm";
import { subWeeks, startOfWeek, endOfWeek, format, addWeeks, differenceInDays } from "date-fns";

interface WeeklyLaborData {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  totalCost: number;
  regularCost: number;
  overtimeCost: number;
  employeeCount: number;
  avgHoursPerEmployee: number;
  avgCostPerHour: number;
}

interface LaborForecast {
  forecastPeriod: string;
  predictedCost: number;
  predictedHours: number;
  predictedOvertimeHours: number;
  confidenceLevel: number;
  lowerBound: number;
  upperBound: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
}

interface BudgetVariance {
  currentPeriodCost: number;
  budgetAmount: number;
  variance: number;
  variancePercentage: number;
  status: 'under_budget' | 'on_track' | 'warning' | 'over_budget';
  projectedEndOfPeriodCost: number;
  projectedVariance: number;
  daysRemaining: number;
}

interface OvertimeAlert {
  alertType: 'approaching_limit' | 'exceeded_limit' | 'cost_threshold' | 'trend_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedEmployees: number;
  currentValue: number;
  threshold: number;
  departmentId?: number;
  departmentName?: string;
  recommendedAction: string;
}

interface PredictiveLaborAnalytics {
  historicalData: WeeklyLaborData[];
  forecasts: LaborForecast[];
  budgetAnalysis: BudgetVariance;
  overtimeAlerts: OvertimeAlert[];
  summary: {
    avgWeeklyCost: number;
    avgWeeklyHours: number;
    avgOvertimePercentage: number;
    costTrend: 'increasing' | 'decreasing' | 'stable';
    costTrendPercentage: number;
    seasonalPattern: string;
    projectedNextQuarterCost: number;
  };
}

class PredictiveLaborService {
  private readonly WEEKS_OF_HISTORY = 12;
  private readonly FORECAST_WEEKS = 4;
  private readonly FALLBACK_HOURLY_RATE = 75; // Only used when no database rates exist
  private readonly FALLBACK_OVERTIME_MULTIPLIER = 1.5; // Only used when no database rates exist
  private readonly WEEKLY_OVERTIME_THRESHOLD = 40;
  private readonly FALLBACK_DEPARTMENT_BUDGET = 50000; // Only used when no budget configured

  private async getCompanyAverageHourlyRate(): Promise<{ regularRate: number; overtimeMultiplier: number }> {
    try {
      const teamMemberRates = await db
        .select({
          avgRate: sql<number>`COALESCE(AVG(NULLIF(${teamMembers.hourlyRate}::numeric, 0)), 0)::float`,
          avgOTRate: sql<number>`COALESCE(AVG(NULLIF(${teamMembers.overtimeRate}::numeric, 0)), 0)::float`,
          count: sql<number>`COUNT(*)::int`
        })
        .from(teamMembers)
        .where(eq(teamMembers.isActive, true));

      const roleRates = await db
        .select({
          avgRate: sql<number>`COALESCE(AVG(NULLIF(${roles.hourlyRate}::numeric, 0)), 0)::float`,
          count: sql<number>`COUNT(*)::int`
        })
        .from(roles);

      const laborRateData = await db
        .select({
          avgRate: sql<number>`COALESCE(AVG(NULLIF(${laborRates.baseRate}::numeric, 0)), 0)::float`,
          avgOTMultiplier: sql<number>`COALESCE(AVG(NULLIF(${laborRates.overtimeMultiplier}::numeric, 0)), 1.5)::float`,
          count: sql<number>`COUNT(*)::int`
        })
        .from(laborRates)
        .where(eq(laborRates.isActive, true));

      let regularRate = this.FALLBACK_HOURLY_RATE;
      let overtimeMultiplier = this.FALLBACK_OVERTIME_MULTIPLIER;

      if (teamMemberRates[0]?.avgRate && teamMemberRates[0].avgRate > 0) {
        regularRate = teamMemberRates[0].avgRate;
        if (teamMemberRates[0].avgOTRate && teamMemberRates[0].avgOTRate > 0 && regularRate > 0) {
          overtimeMultiplier = teamMemberRates[0].avgOTRate / regularRate;
        }
      } else if (laborRateData[0]?.avgRate && laborRateData[0].avgRate > 0) {
        regularRate = laborRateData[0].avgRate;
        if (laborRateData[0].avgOTMultiplier && laborRateData[0].avgOTMultiplier > 0) {
          overtimeMultiplier = laborRateData[0].avgOTMultiplier;
        }
      } else if (roleRates[0]?.avgRate && roleRates[0].avgRate > 0) {
        regularRate = roleRates[0].avgRate;
      }

      console.log('[PredictiveLaborService] Using rates from database:', { regularRate, overtimeMultiplier });
      return { regularRate, overtimeMultiplier };
    } catch (error) {
      console.error('[PredictiveLaborService] Error fetching rates, using fallback:', error);
      return { regularRate: this.FALLBACK_HOURLY_RATE, overtimeMultiplier: this.FALLBACK_OVERTIME_MULTIPLIER };
    }
  }

  private async getDepartmentBudget(departmentId?: number): Promise<number> {
    try {
      try {
        if (departmentId) {
          const costCenterBudget = await db
            .select({
              monthlyBudget: sql<number>`COALESCE(${costCenters.budgetMonthly}::numeric, 0)::float`,
              annualBudget: sql<number>`COALESCE(${costCenters.budgetAnnual}::numeric, 0)::float`,
              costCenterName: costCenters.name
            })
            .from(costCenters)
            .innerJoin(teamMembers, eq(teamMembers.id, costCenters.managerId))
            .where(and(
              eq(costCenters.isActive, true),
              eq(teamMembers.departmentId, departmentId)
            ))
            .limit(1);

          if (costCenterBudget[0]?.monthlyBudget && costCenterBudget[0].monthlyBudget > 0) {
            console.log('[PredictiveLaborService] Using department monthly budget from costCenters:', {
              costCenter: costCenterBudget[0].costCenterName,
              budget: costCenterBudget[0].monthlyBudget
            });
            return costCenterBudget[0].monthlyBudget;
          }
          if (costCenterBudget[0]?.annualBudget && costCenterBudget[0].annualBudget > 0) {
            const monthlyBudget = costCenterBudget[0].annualBudget / 12;
            console.log('[PredictiveLaborService] Using department annual budget / 12:', {
              costCenter: costCenterBudget[0].costCenterName,
              budget: monthlyBudget
            });
            return monthlyBudget;
          }
        }

        const companyBudget = await db
          .select({
            totalMonthly: sql<number>`COALESCE(SUM(${costCenters.budgetMonthly}::numeric), 0)::float`,
            totalAnnual: sql<number>`COALESCE(SUM(${costCenters.budgetAnnual}::numeric), 0)::float`
          })
          .from(costCenters)
          .where(eq(costCenters.isActive, true));

        if (companyBudget[0]?.totalMonthly && companyBudget[0].totalMonthly > 0) {
          console.log('[PredictiveLaborService] Using company-wide monthly budget:', companyBudget[0].totalMonthly);
          return companyBudget[0].totalMonthly;
        }
        if (companyBudget[0]?.totalAnnual && companyBudget[0].totalAnnual > 0) {
          const monthlyBudget = companyBudget[0].totalAnnual / 12;
          console.log('[PredictiveLaborService] Using company-wide annual budget / 12:', monthlyBudget);
          return monthlyBudget;
        }
      } catch (costCenterError) {
        console.log('[PredictiveLaborService] cost_centers table not available, calculating estimated budget');
      }

      const estimatedBudget = await this.calculateEstimatedBudget(departmentId);
      if (estimatedBudget > 0) {
        console.log('[PredictiveLaborService] Using estimated budget from labor data:', estimatedBudget);
        return estimatedBudget;
      }

      console.log('[PredictiveLaborService] No budget found, using fallback:', this.FALLBACK_DEPARTMENT_BUDGET);
      return this.FALLBACK_DEPARTMENT_BUDGET;
    } catch (error) {
      console.error('[PredictiveLaborService] Error fetching budget, using fallback:', error);
      return this.FALLBACK_DEPARTMENT_BUDGET;
    }
  }

  private async calculateEstimatedBudget(departmentId?: number): Promise<number> {
    try {
      const conditions = [eq(teamMembers.isActive, true)];
      if (departmentId) {
        conditions.push(eq(teamMembers.departmentId, departmentId));
      }

      const employeeData = await db
        .select({
          employeeCount: sql<number>`COUNT(*)::int`,
          avgHourlyRate: sql<number>`COALESCE(AVG(NULLIF(${teamMembers.hourlyRate}::numeric, 0)), 0)::float`
        })
        .from(teamMembers)
        .where(and(...conditions));
      
      if (employeeData[0]?.employeeCount && employeeData[0].employeeCount > 0) {
        const count = employeeData[0].employeeCount;
        const avgRate = employeeData[0].avgHourlyRate > 0 
          ? employeeData[0].avgHourlyRate 
          : this.FALLBACK_HOURLY_RATE;
        
        const workingHoursPerMonth = 160;
        const bufferMultiplier = 1.15;
        const estimatedMonthlyBudget = count * avgRate * workingHoursPerMonth * bufferMultiplier;
        
        console.log('[PredictiveLaborService] Calculated estimated budget:', {
          departmentId,
          employees: count,
          avgRate,
          estimatedBudget: estimatedMonthlyBudget
        });
        return estimatedMonthlyBudget;
      }
      
      return 0;
    } catch (error) {
      console.error('[PredictiveLaborService] Error calculating estimated budget:', error);
      return 0;
    }
  }

  private async getEmployeeSpecificRates(userIds: number[]): Promise<Map<number, { hourlyRate: number; overtimeRate: number }>> {
    const rateMap = new Map<number, { hourlyRate: number; overtimeRate: number }>();
    
    if (userIds.length === 0) return rateMap;

    try {
      const employeeRates = await db
        .select({
          userId: teamMembers.userId,
          hourlyRate: sql<number>`COALESCE(${teamMembers.hourlyRate}::numeric, 0)::float`,
          overtimeRate: sql<number>`COALESCE(${teamMembers.overtimeRate}::numeric, 0)::float`,
          roleHourlyRate: sql<number>`COALESCE(${roles.hourlyRate}::numeric, 0)::float`
        })
        .from(teamMembers)
        .leftJoin(roles, eq(teamMembers.roleId, roles.id))
        .where(sql`${teamMembers.userId} = ANY(ARRAY[${sql.raw(userIds.join(','))}]::int[])`);

      for (const emp of employeeRates) {
        const hourlyRate = emp.hourlyRate > 0 ? emp.hourlyRate : 
                          (emp.roleHourlyRate > 0 ? emp.roleHourlyRate : this.FALLBACK_HOURLY_RATE);
        const overtimeRate = emp.overtimeRate > 0 ? emp.overtimeRate : hourlyRate * this.FALLBACK_OVERTIME_MULTIPLIER;
        rateMap.set(emp.userId, { hourlyRate, overtimeRate });
      }
    } catch (error) {
      console.error('[PredictiveLaborService] Error fetching employee rates:', error);
    }

    return rateMap;
  }

  async getPredictiveAnalytics(
    departmentId?: number,
    budgetAmount?: number
  ): Promise<PredictiveLaborAnalytics> {
    console.log('[PredictiveLaborService] Getting predictive analytics', { departmentId, budgetAmount });

    try {
      const rates = await this.getCompanyAverageHourlyRate();
      const budget = budgetAmount || await this.getDepartmentBudget(departmentId);
      
      const historicalData = await this.getHistoricalLaborData(departmentId, rates);
      const forecasts = this.generateForecasts(historicalData);
      const budgetAnalysis = this.analyzeBudgetVariance(historicalData, budget);
      const overtimeAlerts = await this.generateOvertimeAlerts(historicalData, departmentId);
      const summary = this.generateSummary(historicalData, forecasts);

      return {
        historicalData,
        forecasts,
        budgetAnalysis,
        overtimeAlerts,
        summary
      };
    } catch (error) {
      console.error('[PredictiveLaborService] Error in getPredictiveAnalytics:', error);
      throw error;
    }
  }

  private async getHistoricalLaborData(
    departmentId?: number,
    rates?: { regularRate: number; overtimeMultiplier: number }
  ): Promise<WeeklyLaborData[]> {
    const now = new Date();
    const weeklyData: WeeklyLaborData[] = [];
    
    const { regularRate, overtimeMultiplier } = rates || 
      { regularRate: this.FALLBACK_HOURLY_RATE, overtimeMultiplier: this.FALLBACK_OVERTIME_MULTIPLIER };

    for (let i = this.WEEKS_OF_HISTORY - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });

      let query = db
        .select({
          totalHours: sql<number>`COALESCE(SUM(${timesheets.hoursWorked}::numeric), 0)::float`,
          overtimeHours: sql<number>`COALESCE(SUM(${timesheets.overtimeHours}::numeric), 0)::float`,
          employeeCount: sql<number>`COUNT(DISTINCT ${timesheets.userId})::int`
        })
        .from(timesheets);

      if (departmentId) {
        query = query
          .innerJoin(teamMembers, eq(timesheets.userId, teamMembers.userId))
          .where(
            and(
              gte(timesheets.date, weekStart.toISOString().split('T')[0]),
              lte(timesheets.date, weekEnd.toISOString().split('T')[0]),
              eq(teamMembers.departmentId, departmentId)
            )
          ) as typeof query;
      } else {
        query = query.where(
          and(
            gte(timesheets.date, weekStart.toISOString().split('T')[0]),
            lte(timesheets.date, weekEnd.toISOString().split('T')[0])
          )
        ) as typeof query;
      }

      const result = await query;
      const data = result[0] || { totalHours: 0, overtimeHours: 0, employeeCount: 0 };

      const regularHours = Math.max(0, data.totalHours - data.overtimeHours);
      const regularCost = regularHours * regularRate;
      const overtimeCost = data.overtimeHours * regularRate * overtimeMultiplier;
      const totalCost = regularCost + overtimeCost;

      weeklyData.push({
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        weekEnd: format(weekEnd, 'yyyy-MM-dd'),
        weekNumber: this.WEEKS_OF_HISTORY - i,
        totalHours: data.totalHours,
        regularHours,
        overtimeHours: data.overtimeHours,
        totalCost,
        regularCost,
        overtimeCost,
        employeeCount: data.employeeCount,
        avgHoursPerEmployee: data.employeeCount > 0 ? data.totalHours / data.employeeCount : 0,
        avgCostPerHour: data.totalHours > 0 ? totalCost / data.totalHours : regularRate
      });
    }

    return weeklyData;
  }

  private generateForecasts(historicalData: WeeklyLaborData[]): LaborForecast[] {
    const forecasts: LaborForecast[] = [];
    const now = new Date();

    if (historicalData.length === 0) {
      return forecasts;
    }

    const weights = this.calculateExponentialWeights(historicalData.length);
    const costs = historicalData.map(d => d.totalCost);
    const hours = historicalData.map(d => d.totalHours);
    const overtimeHours = historicalData.map(d => d.overtimeHours);

    const { slope: costSlope, intercept: costIntercept } = this.linearRegression(costs, weights);
    const { slope: hoursSlope, intercept: hoursIntercept } = this.linearRegression(hours, weights);
    const { slope: otSlope, intercept: otIntercept } = this.linearRegression(overtimeHours, weights);

    const costStdDev = this.calculateStdDev(costs);
    const trend = this.determineTrend(costs);

    for (let i = 1; i <= this.FORECAST_WEEKS; i++) {
      const futureWeekStart = startOfWeek(addWeeks(now, i), { weekStartsOn: 1 });
      const futureWeekEnd = endOfWeek(addWeeks(now, i), { weekStartsOn: 1 });
      const x = historicalData.length + i;

      const predictedCost = Math.max(0, costSlope * x + costIntercept);
      const predictedHours = Math.max(0, hoursSlope * x + hoursIntercept);
      const predictedOT = Math.max(0, otSlope * x + otIntercept);

      const confidenceLevel = Math.max(50, 95 - (i * 5));
      const confidenceMultiplier = 1.96 * (1 + (i * 0.1));
      const lowerBound = Math.max(0, predictedCost - (costStdDev * confidenceMultiplier));
      const upperBound = predictedCost + (costStdDev * confidenceMultiplier);

      forecasts.push({
        forecastPeriod: `${format(futureWeekStart, 'MMM d')} - ${format(futureWeekEnd, 'MMM d, yyyy')}`,
        predictedCost: Math.round(predictedCost * 100) / 100,
        predictedHours: Math.round(predictedHours * 10) / 10,
        predictedOvertimeHours: Math.round(predictedOT * 10) / 10,
        confidenceLevel,
        lowerBound: Math.round(lowerBound * 100) / 100,
        upperBound: Math.round(upperBound * 100) / 100,
        trend: trend.direction,
        trendPercentage: Math.round(trend.percentage * 100) / 100
      });
    }

    return forecasts;
  }

  private analyzeBudgetVariance(
    historicalData: WeeklyLaborData[],
    budgetAmount: number
  ): BudgetVariance {
    const now = new Date();
    const currentMonth = now.getMonth();
    const daysInMonth = new Date(now.getFullYear(), currentMonth + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysRemaining = daysInMonth - dayOfMonth;

    const monthStart = new Date(now.getFullYear(), currentMonth, 1);
    const currentWeekData = historicalData.filter(week => {
      const weekStart = new Date(week.weekStart);
      return weekStart >= monthStart;
    });

    const currentPeriodCost = currentWeekData.reduce((sum, week) => sum + week.totalCost, 0);

    const dailyRate = currentPeriodCost / dayOfMonth;
    const projectedEndOfPeriodCost = dailyRate * daysInMonth;

    const variance = budgetAmount - currentPeriodCost;
    const variancePercentage = (variance / budgetAmount) * 100;
    const projectedVariance = budgetAmount - projectedEndOfPeriodCost;

    let status: BudgetVariance['status'];
    if (variancePercentage > 20) {
      status = 'under_budget';
    } else if (variancePercentage >= 0) {
      status = 'on_track';
    } else if (variancePercentage >= -10) {
      status = 'warning';
    } else {
      status = 'over_budget';
    }

    return {
      currentPeriodCost: Math.round(currentPeriodCost * 100) / 100,
      budgetAmount,
      variance: Math.round(variance * 100) / 100,
      variancePercentage: Math.round(variancePercentage * 100) / 100,
      status,
      projectedEndOfPeriodCost: Math.round(projectedEndOfPeriodCost * 100) / 100,
      projectedVariance: Math.round(projectedVariance * 100) / 100,
      daysRemaining
    };
  }

  private async generateOvertimeAlerts(
    historicalData: WeeklyLaborData[],
    departmentId?: number
  ): Promise<OvertimeAlert[]> {
    const alerts: OvertimeAlert[] = [];

    if (historicalData.length === 0) {
      return alerts;
    }

    const currentWeek = historicalData[historicalData.length - 1];
    const previousWeek = historicalData.length > 1 ? historicalData[historicalData.length - 2] : null;

    if (currentWeek.overtimeHours > 0) {
      const avgOT = historicalData.reduce((sum, w) => sum + w.overtimeHours, 0) / historicalData.length;
      
      if (currentWeek.overtimeHours > avgOT * 1.5) {
        alerts.push({
          alertType: 'trend_warning',
          severity: currentWeek.overtimeHours > avgOT * 2 ? 'high' : 'medium',
          message: `Overtime hours (${currentWeek.overtimeHours.toFixed(1)}) are ${Math.round((currentWeek.overtimeHours / avgOT - 1) * 100)}% above the 12-week average`,
          affectedEmployees: currentWeek.employeeCount,
          currentValue: currentWeek.overtimeHours,
          threshold: avgOT,
          departmentId,
          recommendedAction: 'Review workload distribution and consider temporary staffing or deadline adjustments'
        });
      }
    }

    const avgOvertimeCost = historicalData.reduce((sum, w) => sum + w.overtimeCost, 0) / historicalData.length;
    const overtimeCostThreshold = avgOvertimeCost * 1.25;

    if (currentWeek.overtimeCost > overtimeCostThreshold) {
      alerts.push({
        alertType: 'cost_threshold',
        severity: currentWeek.overtimeCost > avgOvertimeCost * 1.5 ? 'critical' : 'high',
        message: `Overtime costs ($${currentWeek.overtimeCost.toFixed(2)}) exceed the warning threshold of $${overtimeCostThreshold.toFixed(2)}`,
        affectedEmployees: currentWeek.employeeCount,
        currentValue: currentWeek.overtimeCost,
        threshold: overtimeCostThreshold,
        departmentId,
        recommendedAction: 'Review overtime approvals and consider redistributing workload to reduce premium labor costs'
      });
    }

    if (previousWeek) {
      const costIncrease = ((currentWeek.totalCost - previousWeek.totalCost) / previousWeek.totalCost) * 100;
      
      if (costIncrease > 15) {
        alerts.push({
          alertType: 'trend_warning',
          severity: costIncrease > 25 ? 'high' : 'medium',
          message: `Week-over-week labor costs increased by ${costIncrease.toFixed(1)}%`,
          affectedEmployees: currentWeek.employeeCount,
          currentValue: costIncrease,
          threshold: 15,
          departmentId,
          recommendedAction: 'Investigate sudden cost increase - check for project ramp-ups, rate changes, or scheduling issues'
        });
      }
    }

    const lastFourWeeks = historicalData.slice(-4);
    const consecutiveOTIncreases = lastFourWeeks.every((week, i) => {
      if (i === 0) return true;
      return week.overtimeHours >= lastFourWeeks[i - 1].overtimeHours;
    });

    if (consecutiveOTIncreases && lastFourWeeks[lastFourWeeks.length - 1].overtimeHours > 0) {
      alerts.push({
        alertType: 'approaching_limit',
        severity: 'medium',
        message: 'Overtime hours have been increasing for 4 consecutive weeks',
        affectedEmployees: currentWeek.employeeCount,
        currentValue: currentWeek.overtimeHours,
        threshold: this.WEEKLY_OVERTIME_THRESHOLD,
        departmentId,
        recommendedAction: 'Proactive intervention recommended - review project timelines and consider resource augmentation'
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private generateSummary(
    historicalData: WeeklyLaborData[],
    forecasts: LaborForecast[]
  ): PredictiveLaborAnalytics['summary'] {
    if (historicalData.length === 0) {
      return {
        avgWeeklyCost: 0,
        avgWeeklyHours: 0,
        avgOvertimePercentage: 0,
        costTrend: 'stable',
        costTrendPercentage: 0,
        seasonalPattern: 'insufficient_data',
        projectedNextQuarterCost: 0
      };
    }

    const avgWeeklyCost = historicalData.reduce((sum, w) => sum + w.totalCost, 0) / historicalData.length;
    const avgWeeklyHours = historicalData.reduce((sum, w) => sum + w.totalHours, 0) / historicalData.length;
    
    const totalHours = historicalData.reduce((sum, w) => sum + w.totalHours, 0);
    const totalOT = historicalData.reduce((sum, w) => sum + w.overtimeHours, 0);
    const avgOvertimePercentage = totalHours > 0 ? (totalOT / totalHours) * 100 : 0;

    const costs = historicalData.map(d => d.totalCost);
    const trend = this.determineTrend(costs);

    const seasonalPattern = this.detectSeasonalPattern(historicalData);

    const projectedNextQuarterCost = forecasts.length > 0
      ? forecasts.reduce((sum, f) => sum + f.predictedCost, 0) * 3
      : avgWeeklyCost * 13;

    return {
      avgWeeklyCost: Math.round(avgWeeklyCost * 100) / 100,
      avgWeeklyHours: Math.round(avgWeeklyHours * 10) / 10,
      avgOvertimePercentage: Math.round(avgOvertimePercentage * 100) / 100,
      costTrend: trend.direction,
      costTrendPercentage: Math.round(trend.percentage * 100) / 100,
      seasonalPattern,
      projectedNextQuarterCost: Math.round(projectedNextQuarterCost * 100) / 100
    };
  }

  private calculateExponentialWeights(length: number): number[] {
    const alpha = 0.3;
    const weights: number[] = [];
    let sum = 0;
    
    for (let i = 0; i < length; i++) {
      const weight = Math.pow(1 - alpha, length - 1 - i);
      weights.push(weight);
      sum += weight;
    }
    
    return weights.map(w => w / sum);
  }

  private linearRegression(values: number[], weights: number[]): { slope: number; intercept: number } {
    const n = values.length;
    if (n === 0) return { slope: 0, intercept: 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumW = 0;

    for (let i = 0; i < n; i++) {
      const x = i + 1;
      const y = values[i];
      const w = weights[i] || (1 / n);

      sumX += w * x;
      sumY += w * y;
      sumXY += w * x * y;
      sumX2 += w * x * x;
      sumW += w;
    }

    const denominator = sumW * sumX2 - sumX * sumX;
    if (Math.abs(denominator) < 0.0001) {
      return { slope: 0, intercept: sumY / sumW };
    }

    const slope = (sumW * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / sumW;

    return { slope, intercept };
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private determineTrend(values: number[]): { direction: 'increasing' | 'decreasing' | 'stable'; percentage: number } {
    if (values.length < 2) {
      return { direction: 'stable', percentage: 0 };
    }

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    if (firstAvg === 0) {
      return secondAvg > 0 ? { direction: 'increasing', percentage: 100 } : { direction: 'stable', percentage: 0 };
    }

    const percentageChange = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (percentageChange > 5) {
      return { direction: 'increasing', percentage: percentageChange };
    } else if (percentageChange < -5) {
      return { direction: 'decreasing', percentage: Math.abs(percentageChange) };
    }
    
    return { direction: 'stable', percentage: Math.abs(percentageChange) };
  }

  private detectSeasonalPattern(data: WeeklyLaborData[]): string {
    if (data.length < 8) {
      return 'insufficient_data';
    }

    const avgByWeekOfMonth: { [key: number]: number[] } = { 1: [], 2: [], 3: [], 4: [] };
    
    data.forEach(week => {
      const weekStart = new Date(week.weekStart);
      const weekOfMonth = Math.ceil(weekStart.getDate() / 7);
      if (weekOfMonth <= 4) {
        avgByWeekOfMonth[weekOfMonth].push(week.totalCost);
      }
    });

    const weekAvgs = Object.entries(avgByWeekOfMonth).map(([week, costs]) => ({
      week: parseInt(week),
      avg: costs.length > 0 ? costs.reduce((s, c) => s + c, 0) / costs.length : 0
    }));

    const overallAvg = weekAvgs.reduce((s, w) => s + w.avg, 0) / weekAvgs.length;
    const maxDeviation = Math.max(...weekAvgs.map(w => Math.abs(w.avg - overallAvg) / overallAvg));

    if (maxDeviation > 0.15) {
      const highWeeks = weekAvgs.filter(w => w.avg > overallAvg * 1.1);
      if (highWeeks.length > 0) {
        const weekNames = highWeeks.map(w => {
          switch(w.week) {
            case 1: return 'first';
            case 2: return 'second';
            case 3: return 'third';
            case 4: return 'fourth';
            default: return '';
          }
        });
        return `higher_costs_${weekNames.join('_')}_week`;
      }
    }

    return 'no_significant_pattern';
  }

  async getForecastByDepartment(): Promise<Map<number, LaborForecast[]>> {
    const deptResult = await db.select({ id: departments.id, name: departments.name }).from(departments);
    const forecastsByDept = new Map<number, LaborForecast[]>();
    const rates = await this.getCompanyAverageHourlyRate();

    for (const dept of deptResult) {
      const historicalData = await this.getHistoricalLaborData(dept.id, rates);
      const forecasts = this.generateForecasts(historicalData);
      forecastsByDept.set(dept.id, forecasts);
    }

    return forecastsByDept;
  }

  async getOvertimeRiskAssessment(): Promise<{
    highRiskDepartments: Array<{ departmentId: number; departmentName: string; riskScore: number; alerts: OvertimeAlert[] }>;
    companyWideRisk: 'low' | 'medium' | 'high';
    overallRiskLevel: 'low' | 'medium' | 'high';
    breachProbability: number;
    potentialOvertimeCost: number;
    recommendedActions: string[];
  }> {
    const deptResult = await db
      .select({ id: departments.id, name: departments.name })
      .from(departments);
    
    const rates = await this.getCompanyAverageHourlyRate();

    const highRiskDepartments: Array<{
      departmentId: number;
      departmentName: string;
      riskScore: number;
      alerts: OvertimeAlert[];
    }> = [];

    let totalOvertimeCost = 0;
    let totalAlerts = 0;

    for (const dept of deptResult) {
      const historicalData = await this.getHistoricalLaborData(dept.id, rates);
      const alerts = await this.generateOvertimeAlerts(historicalData, dept.id);
      
      const weeklyOTCost = historicalData.length > 0 
        ? historicalData[historicalData.length - 1].overtimeCost 
        : 0;
      totalOvertimeCost += weeklyOTCost;
      totalAlerts += alerts.length;
      
      const riskScore = alerts.reduce((score, alert) => {
        const severityPoints = { low: 1, medium: 2, high: 4, critical: 8 };
        return score + severityPoints[alert.severity];
      }, 0);

      if (riskScore > 5) {
        highRiskDepartments.push({
          departmentId: dept.id,
          departmentName: dept.name,
          riskScore,
          alerts
        });
      }
    }

    highRiskDepartments.sort((a, b) => b.riskScore - a.riskScore);

    const totalRisk = highRiskDepartments.reduce((sum, d) => sum + d.riskScore, 0);
    const avgRisk = deptResult.length > 0 ? totalRisk / deptResult.length : 0;

    let companyWideRisk: 'low' | 'medium' | 'high';
    if (avgRisk < 3) {
      companyWideRisk = 'low';
    } else if (avgRisk < 7) {
      companyWideRisk = 'medium';
    } else {
      companyWideRisk = 'high';
    }

    const recommendedActions: string[] = [];
    if (highRiskDepartments.length > 0) {
      recommendedActions.push(`Focus on ${highRiskDepartments[0].departmentName} - highest overtime risk score`);
    }
    if (companyWideRisk === 'high') {
      recommendedActions.push('Consider company-wide overtime policy review');
      recommendedActions.push('Evaluate temporary staffing options for peak periods');
    }
    if (companyWideRisk !== 'low') {
      recommendedActions.push('Schedule proactive resource planning meetings with department managers');
    }

    const breachProbability = await this.calculateHistoricalBreachProbability(8);
    const potentialOvertimeCost = totalOvertimeCost * 1.2;

    return {
      highRiskDepartments,
      companyWideRisk,
      overallRiskLevel: companyWideRisk,
      breachProbability: Math.round(breachProbability),
      potentialOvertimeCost: Math.round(potentialOvertimeCost * 100) / 100,
      recommendedActions
    };
  }

  private async calculateHistoricalBreachProbability(weeks: number = 8): Promise<number> {
    try {
      const endDate = new Date();
      const startDate = subWeeks(endDate, weeks);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const overtimeData = await db
        .select({
          totalTimesheets: sql<number>`COUNT(*)::int`,
          breachCount: sql<number>`SUM(CASE WHEN ${timesheets.overtimeHours}::numeric > 0 THEN 1 ELSE 0 END)::int`
        })
        .from(timesheets)
        .where(
          and(
            gte(timesheets.date, startDateStr),
            lte(timesheets.date, endDateStr),
            eq(timesheets.approved, true)
          )
        );

      if (!overtimeData[0] || overtimeData[0].totalTimesheets === 0) {
        console.log('[PredictiveLaborService] No approved timesheet data for breach probability, defaulting to 0%');
        return 0;
      }

      const totalTimesheets = overtimeData[0].totalTimesheets;
      const breachCount = overtimeData[0].breachCount || 0;
      const breachRate = totalTimesheets > 0 ? (breachCount / totalTimesheets) * 100 : 0;

      console.log('[PredictiveLaborService] Historical breach probability from overtimeHours:', {
        weeks,
        totalApprovedTimesheets: totalTimesheets,
        timesheetsWithOvertime: breachCount,
        breachRate: Math.round(breachRate * 10) / 10,
        source: 'timesheets.overtimeHours > 0 AND approved = true'
      });

      return Math.round(breachRate * 10) / 10;
    } catch (error) {
      console.error('[PredictiveLaborService] Error calculating breach probability:', error);
      return 0;
    }
  }
}

export const predictiveLaborService = new PredictiveLaborService();

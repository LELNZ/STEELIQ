import { db } from "../db";
import { 
  timesheets, teamMembers, departments, roles, laborRates
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { 
  subDays, subWeeks, subMonths, subYears, 
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  format, differenceInDays, getWeek, getYear, getMonth
} from "date-fns";

interface MovingAverageData {
  period: string;
  value: number;
  ma7: number | null;
  ma30: number | null;
  ma90: number | null;
  trend: 'up' | 'down' | 'stable';
}

interface ComparisonData {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: 'improving' | 'declining' | 'stable';
  currentPeriodDays: number;
  previousPeriodDays: number;
  dataQuality: 'high' | 'medium' | 'low' | 'insufficient';
}

interface AnomalyFlag {
  date: string;
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;
  deviationStdDev: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  departmentId?: number;
  departmentName?: string;
}

interface SeasonalPattern {
  patternType: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  description: string;
  peakPeriods: string[];
  lowPeriods: string[];
  variationPercentage: number;
  constructionIndustryNote?: string;
}

interface TrendAnalytics {
  movingAverages: {
    hours: MovingAverageData[];
    costs: MovingAverageData[];
    overtime: MovingAverageData[];
  };
  comparisons: {
    weekOverWeek: ComparisonData[];
    monthOverMonth: ComparisonData[];
    yearOverYear: ComparisonData[];
  };
  anomalies: AnomalyFlag[];
  seasonalPatterns: SeasonalPattern[];
  summary: {
    overallTrend: 'increasing' | 'decreasing' | 'stable';
    volatilityIndex: number;
    predictabilityScore: number;
    seasonalityStrength: number;
    recommendedActions: string[];
  };
}

interface DailyMetric {
  date: Date;
  hours: number;
  cost: number;
  overtime: number;
  employees: number;
}

class TrendAnalysisService {
  private readonly FALLBACK_HOURLY_RATE = 75; // Only used when no database rates exist
  private readonly FALLBACK_OVERTIME_MULTIPLIER = 1.5; // Only used when no database rates exist
  private readonly ANOMALY_THRESHOLD_STD_DEV = 2;

  private async getCompanyAverageHourlyRate(): Promise<{ regularRate: number; overtimeMultiplier: number }> {
    try {
      const teamMemberRates = await db
        .select({
          avgRate: sql<number>`COALESCE(AVG(NULLIF(${teamMembers.hourlyRate}::numeric, 0)), 0)::float`,
          avgOTRate: sql<number>`COALESCE(AVG(NULLIF(${teamMembers.overtimeRate}::numeric, 0)), 0)::float`
        })
        .from(teamMembers)
        .where(eq(teamMembers.isActive, true));

      const laborRateData = await db
        .select({
          avgRate: sql<number>`COALESCE(AVG(NULLIF(${laborRates.baseRate}::numeric, 0)), 0)::float`,
          avgOTMultiplier: sql<number>`COALESCE(AVG(NULLIF(${laborRates.overtimeMultiplier}::numeric, 0)), 1.5)::float`
        })
        .from(laborRates)
        .where(eq(laborRates.isActive, true));

      const roleRates = await db
        .select({
          avgRate: sql<number>`COALESCE(AVG(NULLIF(${roles.hourlyRate}::numeric, 0)), 0)::float`
        })
        .from(roles);

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

      console.log('[TrendAnalysisService] Using rates from database:', { regularRate, overtimeMultiplier });
      return { regularRate, overtimeMultiplier };
    } catch (error) {
      console.error('[TrendAnalysisService] Error fetching rates, using fallback:', error);
      return { regularRate: this.FALLBACK_HOURLY_RATE, overtimeMultiplier: this.FALLBACK_OVERTIME_MULTIPLIER };
    }
  }

  async getAdvancedTrendAnalytics(
    departmentId?: number,
    lookbackDays: number = 90
  ): Promise<TrendAnalytics> {
    console.log('[TrendAnalysisService] Getting advanced trend analytics', { departmentId, lookbackDays });

    try {
      const rates = await this.getCompanyAverageHourlyRate();
      const historicalData = await this.getHistoricalDailyData(departmentId, lookbackDays, rates);
      
      const movingAverages = this.calculateMovingAverages(historicalData);
      const comparisons = this.calculateComparisons(historicalData);
      const anomalies = await this.detectAnomalies(historicalData, departmentId);
      const seasonalPatterns = this.analyzeSeasonalPatterns(historicalData);
      const summary = this.generateTrendSummary(historicalData, movingAverages, anomalies, seasonalPatterns);

      return {
        movingAverages,
        comparisons,
        anomalies,
        seasonalPatterns,
        summary
      };
    } catch (error) {
      console.error('[TrendAnalysisService] Error in getAdvancedTrendAnalytics:', error);
      throw error;
    }
  }

  private async getHistoricalDailyData(
    departmentId?: number, 
    days: number = 90,
    rates?: { regularRate: number; overtimeMultiplier: number }
  ): Promise<DailyMetric[]> {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    const { regularRate, overtimeMultiplier } = rates || 
      { regularRate: this.FALLBACK_HOURLY_RATE, overtimeMultiplier: this.FALLBACK_OVERTIME_MULTIPLIER };
    
    let query = db
      .select({
        date: timesheets.date,
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
            gte(timesheets.date, startDate.toISOString().split('T')[0]),
            lte(timesheets.date, endDate.toISOString().split('T')[0]),
            eq(teamMembers.departmentId, departmentId)
          )
        ) as typeof query;
    } else {
      query = query.where(
        and(
          gte(timesheets.date, startDate.toISOString().split('T')[0]),
          lte(timesheets.date, endDate.toISOString().split('T')[0])
        )
      ) as typeof query;
    }

    const result = await query.groupBy(timesheets.date).orderBy(timesheets.date);

    return result.map(row => {
      const regularHours = Math.max(0, row.totalHours - row.overtimeHours);
      const regularCost = regularHours * regularRate;
      const overtimeCost = row.overtimeHours * regularRate * overtimeMultiplier;
      
      return {
        date: new Date(row.date as string),
        hours: row.totalHours,
        cost: regularCost + overtimeCost,
        overtime: row.overtimeHours,
        employees: row.employeeCount
      };
    });
  }

  private calculateMovingAverages(data: DailyMetric[]): TrendAnalytics['movingAverages'] {
    const calculateMA = (values: number[], period: number): (number | null)[] => {
      return values.map((_, i) => {
        if (i < period - 1) return null;
        const slice = values.slice(i - period + 1, i + 1);
        return slice.reduce((sum, v) => sum + v, 0) / period;
      });
    };

    const determineTrend = (current: number, ma: number | null): 'up' | 'down' | 'stable' => {
      if (ma === null) return 'stable';
      const diff = ((current - ma) / ma) * 100;
      if (diff > 5) return 'up';
      if (diff < -5) return 'down';
      return 'stable';
    };

    const hours = data.map(d => d.hours);
    const costs = data.map(d => d.cost);
    const overtime = data.map(d => d.overtime);

    const hoursMA7 = calculateMA(hours, 7);
    const hoursMA30 = calculateMA(hours, 30);
    const hoursMA90 = calculateMA(hours, 90);

    const costsMA7 = calculateMA(costs, 7);
    const costsMA30 = calculateMA(costs, 30);
    const costsMA90 = calculateMA(costs, 90);

    const overtimeMA7 = calculateMA(overtime, 7);
    const overtimeMA30 = calculateMA(overtime, 30);
    const overtimeMA90 = calculateMA(overtime, 90);

    const formatMovingAverageData = (
      data: DailyMetric[],
      values: number[],
      ma7: (number | null)[],
      ma30: (number | null)[],
      ma90: (number | null)[]
    ): MovingAverageData[] => {
      const recent = data.slice(-30);
      const startIdx = data.length - 30;
      
      return recent.map((d, i) => {
        const idx = startIdx + i;
        return {
          period: format(d.date, 'yyyy-MM-dd'),
          value: values[idx],
          ma7: ma7[idx] ? Math.round(ma7[idx]! * 100) / 100 : null,
          ma30: ma30[idx] ? Math.round(ma30[idx]! * 100) / 100 : null,
          ma90: ma90[idx] ? Math.round(ma90[idx]! * 100) / 100 : null,
          trend: determineTrend(values[idx], ma7[idx])
        };
      });
    };

    return {
      hours: formatMovingAverageData(data, hours, hoursMA7, hoursMA30, hoursMA90),
      costs: formatMovingAverageData(data, costs, costsMA7, costsMA30, costsMA90),
      overtime: formatMovingAverageData(data, overtime, overtimeMA7, overtimeMA30, overtimeMA90)
    };
  }

  private calculateComparisons(data: DailyMetric[]): TrendAnalytics['comparisons'] {
    const now = new Date();
    
    const calculatePeriodMetrics = (periodData: DailyMetric[]) => ({
      totalHours: periodData.reduce((sum, d) => sum + d.hours, 0),
      totalCost: periodData.reduce((sum, d) => sum + d.cost, 0),
      totalOvertime: periodData.reduce((sum, d) => sum + d.overtime, 0),
      avgEmployees: periodData.length > 0 
        ? periodData.reduce((sum, d) => sum + d.employees, 0) / periodData.length 
        : 0,
      daysWithData: periodData.length
    });

    const assessDataQuality = (currentDays: number, previousDays: number, expectedDays: number): 'high' | 'medium' | 'low' | 'insufficient' => {
      const currentRatio = currentDays / expectedDays;
      const previousRatio = previousDays / expectedDays;
      const minRatio = Math.min(currentRatio, previousRatio);
      
      if (previousDays === 0) return 'insufficient';
      if (minRatio >= 0.7) return 'high';
      if (minRatio >= 0.4) return 'medium';
      if (minRatio >= 0.1) return 'low';
      return 'insufficient';
    };

    const createComparison = (
      metric: string,
      current: number,
      previous: number,
      currentDays: number,
      previousDays: number,
      expectedDays: number
    ): ComparisonData => {
      const change = current - previous;
      const changePercentage = previous !== 0 ? ((change / previous) * 100) : 0;
      
      let trend: 'improving' | 'declining' | 'stable';
      if (Math.abs(changePercentage) < 3) {
        trend = 'stable';
      } else if (metric.includes('Cost') || metric.includes('Overtime')) {
        trend = change < 0 ? 'improving' : 'declining';
      } else {
        trend = change > 0 ? 'improving' : 'declining';
      }

      return {
        metric,
        current: Math.round(current * 100) / 100,
        previous: Math.round(previous * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercentage: Math.round(changePercentage * 100) / 100,
        trend,
        currentPeriodDays: currentDays,
        previousPeriodDays: previousDays,
        dataQuality: assessDataQuality(currentDays, previousDays, expectedDays)
      };
    };

    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = subWeeks(thisWeekStart, 1);
    const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

    const thisWeekData = data.filter(d => d.date >= thisWeekStart);
    const lastWeekData = data.filter(d => d.date >= lastWeekStart && d.date <= lastWeekEnd);

    const thisWeekMetrics = calculatePeriodMetrics(thisWeekData);
    const lastWeekMetrics = calculatePeriodMetrics(lastWeekData);
    const expectedWeekDays = 5;

    const weekOverWeek: ComparisonData[] = [
      createComparison('Total Hours', thisWeekMetrics.totalHours, lastWeekMetrics.totalHours, thisWeekMetrics.daysWithData, lastWeekMetrics.daysWithData, expectedWeekDays),
      createComparison('Labor Cost', thisWeekMetrics.totalCost, lastWeekMetrics.totalCost, thisWeekMetrics.daysWithData, lastWeekMetrics.daysWithData, expectedWeekDays),
      createComparison('Overtime Hours', thisWeekMetrics.totalOvertime, lastWeekMetrics.totalOvertime, thisWeekMetrics.daysWithData, lastWeekMetrics.daysWithData, expectedWeekDays),
      createComparison('Avg Employees', thisWeekMetrics.avgEmployees, lastWeekMetrics.avgEmployees, thisWeekMetrics.daysWithData, lastWeekMetrics.daysWithData, expectedWeekDays)
    ];

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = subMonths(thisMonthStart, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthData = data.filter(d => d.date >= thisMonthStart);
    const lastMonthData = data.filter(d => d.date >= lastMonthStart && d.date <= lastMonthEnd);

    const thisMonthMetrics = calculatePeriodMetrics(thisMonthData);
    const lastMonthMetrics = calculatePeriodMetrics(lastMonthData);
    const expectedMonthDays = 20;

    const monthOverMonth: ComparisonData[] = [
      createComparison('Total Hours', thisMonthMetrics.totalHours, lastMonthMetrics.totalHours, thisMonthMetrics.daysWithData, lastMonthMetrics.daysWithData, expectedMonthDays),
      createComparison('Labor Cost', thisMonthMetrics.totalCost, lastMonthMetrics.totalCost, thisMonthMetrics.daysWithData, lastMonthMetrics.daysWithData, expectedMonthDays),
      createComparison('Overtime Hours', thisMonthMetrics.totalOvertime, lastMonthMetrics.totalOvertime, thisMonthMetrics.daysWithData, lastMonthMetrics.daysWithData, expectedMonthDays),
      createComparison('Avg Employees', thisMonthMetrics.avgEmployees, lastMonthMetrics.avgEmployees, thisMonthMetrics.daysWithData, lastMonthMetrics.daysWithData, expectedMonthDays)
    ];

    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = subYears(thisYearStart, 1);
    const lastYearSameDate = subYears(now, 1);

    const thisYearData = data.filter(d => d.date >= thisYearStart);
    const lastYearData = data.filter(d => d.date >= lastYearStart && d.date <= lastYearSameDate);

    const thisYearMetrics = calculatePeriodMetrics(thisYearData);
    const lastYearMetrics = calculatePeriodMetrics(lastYearData);
    const expectedYearDays = differenceInDays(now, thisYearStart);

    const yearOverYear: ComparisonData[] = [
      createComparison('Total Hours (YTD)', thisYearMetrics.totalHours, lastYearMetrics.totalHours, thisYearMetrics.daysWithData, lastYearMetrics.daysWithData, expectedYearDays),
      createComparison('Labor Cost (YTD)', thisYearMetrics.totalCost, lastYearMetrics.totalCost, thisYearMetrics.daysWithData, lastYearMetrics.daysWithData, expectedYearDays),
      createComparison('Overtime Hours (YTD)', thisYearMetrics.totalOvertime, lastYearMetrics.totalOvertime, thisYearMetrics.daysWithData, lastYearMetrics.daysWithData, expectedYearDays),
      createComparison('Avg Employees', thisYearMetrics.avgEmployees, lastYearMetrics.avgEmployees, thisYearMetrics.daysWithData, lastYearMetrics.daysWithData, expectedYearDays)
    ];

    return {
      weekOverWeek,
      monthOverMonth,
      yearOverYear
    };
  }

  private async detectAnomalies(data: DailyMetric[], departmentId?: number): Promise<AnomalyFlag[]> {
    const anomalies: AnomalyFlag[] = [];

    if (data.length < 14) {
      return anomalies;
    }

    const detectForMetric = (
      values: number[],
      dates: Date[],
      metricName: string
    ) => {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) return;

      const recentDays = 14;
      const recentData = values.slice(-recentDays);
      const recentDates = dates.slice(-recentDays);

      recentData.forEach((value, i) => {
        const deviation = value - mean;
        const deviationStdDev = Math.abs(deviation / stdDev);

        if (deviationStdDev >= this.ANOMALY_THRESHOLD_STD_DEV) {
          let severity: AnomalyFlag['severity'];
          if (deviationStdDev >= 4) {
            severity = 'critical';
          } else if (deviationStdDev >= 3) {
            severity = 'high';
          } else if (deviationStdDev >= 2.5) {
            severity = 'medium';
          } else {
            severity = 'low';
          }

          const direction = deviation > 0 ? 'above' : 'below';
          
          anomalies.push({
            date: format(recentDates[i], 'yyyy-MM-dd'),
            metric: metricName,
            value: Math.round(value * 100) / 100,
            expectedValue: Math.round(mean * 100) / 100,
            deviation: Math.round(deviation * 100) / 100,
            deviationStdDev: Math.round(deviationStdDev * 100) / 100,
            severity,
            description: `${metricName} is ${deviationStdDev.toFixed(1)} standard deviations ${direction} the mean`,
            departmentId
          });
        }
      });
    };

    const dates = data.map(d => d.date);
    detectForMetric(data.map(d => d.hours), dates, 'Total Hours');
    detectForMetric(data.map(d => d.cost), dates, 'Labor Cost');
    detectForMetric(data.map(d => d.overtime), dates, 'Overtime Hours');
    detectForMetric(data.map(d => d.employees), dates, 'Employee Count');

    anomalies.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return anomalies.slice(0, 20);
  }

  private analyzeSeasonalPatterns(data: DailyMetric[]): SeasonalPattern[] {
    const patterns: SeasonalPattern[] = [];

    if (data.length < 30) {
      return patterns;
    }

    const dayOfWeekAvg: { [key: number]: number[] } = {};
    for (let i = 0; i < 7; i++) {
      dayOfWeekAvg[i] = [];
    }

    data.forEach(d => {
      const dayOfWeek = d.date.getDay();
      dayOfWeekAvg[dayOfWeek].push(d.hours);
    });

    const weeklyAverages = Object.entries(dayOfWeekAvg).map(([day, hours]) => ({
      day: parseInt(day),
      avg: hours.length > 0 ? hours.reduce((s, h) => s + h, 0) / hours.length : 0
    }));

    const overallWeeklyAvg = weeklyAverages.reduce((s, d) => s + d.avg, 0) / 7;
    const weeklyVariation = Math.max(...weeklyAverages.map(d => Math.abs(d.avg - overallWeeklyAvg) / overallWeeklyAvg)) * 100;

    if (weeklyVariation > 15) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const peakDays = weeklyAverages.filter(d => d.avg > overallWeeklyAvg * 1.1).map(d => dayNames[d.day]);
      const lowDays = weeklyAverages.filter(d => d.avg < overallWeeklyAvg * 0.9).map(d => dayNames[d.day]);

      patterns.push({
        patternType: 'weekly',
        description: `Weekly variation of ${weeklyVariation.toFixed(1)}% detected in hours worked`,
        peakPeriods: peakDays,
        lowPeriods: lowDays,
        variationPercentage: Math.round(weeklyVariation * 10) / 10,
        constructionIndustryNote: 'Steel fabrication typically peaks mid-week with reduced activity on weekends'
      });
    }

    if (data.length >= 60) {
      const monthlyData: { [key: number]: number[] } = {};
      data.forEach(d => {
        const month = d.date.getMonth();
        if (!monthlyData[month]) monthlyData[month] = [];
        monthlyData[month].push(d.hours);
      });

      const monthlyAverages = Object.entries(monthlyData).map(([month, hours]) => ({
        month: parseInt(month),
        avg: hours.reduce((s, h) => s + h, 0) / hours.length
      }));

      if (monthlyAverages.length >= 3) {
        const overallMonthlyAvg = monthlyAverages.reduce((s, d) => s + d.avg, 0) / monthlyAverages.length;
        const monthlyVariation = Math.max(...monthlyAverages.map(d => Math.abs(d.avg - overallMonthlyAvg) / overallMonthlyAvg)) * 100;

        if (monthlyVariation > 20) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const peakMonths = monthlyAverages.filter(d => d.avg > overallMonthlyAvg * 1.15).map(d => monthNames[d.month]);
          const lowMonths = monthlyAverages.filter(d => d.avg < overallMonthlyAvg * 0.85).map(d => monthNames[d.month]);

          patterns.push({
            patternType: 'monthly',
            description: `Monthly variation of ${monthlyVariation.toFixed(1)}% detected`,
            peakPeriods: peakMonths,
            lowPeriods: lowMonths,
            variationPercentage: Math.round(monthlyVariation * 10) / 10,
            constructionIndustryNote: 'Construction activity typically peaks in warmer months (Sep-Mar in NZ) with project deadlines driving overtime'
          });
        }
      }
    }

    return patterns;
  }

  private generateTrendSummary(
    data: DailyMetric[],
    movingAverages: TrendAnalytics['movingAverages'],
    anomalies: AnomalyFlag[],
    seasonalPatterns: SeasonalPattern[]
  ): TrendAnalytics['summary'] {
    const upCount = movingAverages.hours.filter(d => d.trend === 'up').length;
    const downCount = movingAverages.hours.filter(d => d.trend === 'down').length;
    const stableCount = movingAverages.hours.filter(d => d.trend === 'stable').length;

    let overallTrend: 'increasing' | 'decreasing' | 'stable';
    if (upCount > downCount + stableCount) {
      overallTrend = 'increasing';
    } else if (downCount > upCount + stableCount) {
      overallTrend = 'decreasing';
    } else {
      overallTrend = 'stable';
    }

    const hours = data.map(d => d.hours);
    const mean = hours.reduce((s, h) => s + h, 0) / hours.length;
    const variance = hours.reduce((s, h) => s + Math.pow(h - mean, 2), 0) / hours.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;
    const volatilityIndex = Math.min(100, Math.max(0, coefficientOfVariation));

    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length;
    const predictabilityScore = Math.max(0, 100 - (criticalAnomalies * 10) - (volatilityIndex / 2));

    const seasonalityStrength = seasonalPatterns.reduce((max, p) => Math.max(max, p.variationPercentage), 0);

    const recommendedActions: string[] = [];

    if (overallTrend === 'increasing') {
      recommendedActions.push('Monitor capacity constraints - hours trending upward may indicate need for additional staff');
    }
    if (volatilityIndex > 30) {
      recommendedActions.push('High volatility detected - review scheduling practices to improve consistency');
    }
    if (criticalAnomalies > 0) {
      recommendedActions.push(`Investigate ${criticalAnomalies} critical anomaly flags for potential issues`);
    }
    if (seasonalityStrength > 25) {
      recommendedActions.push('Significant seasonal patterns detected - consider seasonal staffing adjustments');
    }

    const overtimeTrend = movingAverages.overtime.slice(-7);
    const recentOTUp = overtimeTrend.filter(d => d.trend === 'up').length;
    if (recentOTUp >= 5) {
      recommendedActions.push('Overtime trending up for the past week - review workload distribution');
    }

    if (recommendedActions.length === 0) {
      recommendedActions.push('No immediate actions required - trends are stable and within expected ranges');
    }

    return {
      overallTrend,
      volatilityIndex: Math.round(volatilityIndex * 10) / 10,
      predictabilityScore: Math.round(predictabilityScore),
      seasonalityStrength: Math.round(seasonalityStrength * 10) / 10,
      recommendedActions
    };
  }

  async getDepartmentTrendComparison(): Promise<{
    departments: Array<{
      departmentId: number;
      departmentName: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      avgHours: number;
      avgCost: number;
      volatility: number;
      anomalyCount: number;
    }>;
    bestPerforming: string;
    needsAttention: string[];
  }> {
    const deptResult = await db.select({ id: departments.id, name: departments.name }).from(departments);
    
    const departmentStats: Array<{
      departmentId: number;
      departmentName: string;
      trend: 'increasing' | 'decreasing' | 'stable';
      avgHours: number;
      avgCost: number;
      volatility: number;
      anomalyCount: number;
    }> = [];

    for (const dept of deptResult) {
      try {
        const analytics = await this.getAdvancedTrendAnalytics(dept.id, 30);
        
        const hours = analytics.movingAverages.hours.map(d => d.value);
        const avgHours = hours.reduce((s, h) => s + h, 0) / hours.length;
        
        const costs = analytics.movingAverages.costs.map(d => d.value);
        const avgCost = costs.reduce((s, c) => s + c, 0) / costs.length;

        departmentStats.push({
          departmentId: dept.id,
          departmentName: dept.name,
          trend: analytics.summary.overallTrend,
          avgHours: Math.round(avgHours * 10) / 10,
          avgCost: Math.round(avgCost * 100) / 100,
          volatility: analytics.summary.volatilityIndex,
          anomalyCount: analytics.anomalies.filter(a => a.severity === 'high' || a.severity === 'critical').length
        });
      } catch (error) {
        console.error(`[TrendAnalysisService] Error analyzing department ${dept.id}:`, error);
      }
    }

    departmentStats.sort((a, b) => a.volatility - b.volatility);
    
    const bestPerforming = departmentStats.length > 0 ? departmentStats[0].departmentName : 'N/A';
    const needsAttention = departmentStats
      .filter(d => d.volatility > 30 || d.anomalyCount > 2)
      .map(d => d.departmentName);

    return {
      departments: departmentStats,
      bestPerforming,
      needsAttention
    };
  }
}

export const trendAnalysisService = new TrendAnalysisService();

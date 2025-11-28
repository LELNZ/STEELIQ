import { db } from "../db";
import { timesheets, timeClocks, timeEntries, users, jobs, laborRates, teamMembers, payrollPeriods } from "@shared/schema";
import { eq, and, gte, lte, isNull, sql } from "drizzle-orm";
import { startOfWeek, endOfWeek, format, differenceInHours, parseISO, addWeeks } from "date-fns";
import { overtimeService } from "./overtimeCalculationService";
import { payrollPeriodService } from "./payrollPeriodService";
import { timeManagementStorage } from "../timeManagement";
import type { InsertTimesheet } from "@shared/schema";

export interface TimesheetGenerationOptions {
  userId: number;
  weekStartDate: Date;
  weekEndDate?: Date;
  autoApprove?: boolean;
  generateDraft?: boolean;
  includeOvertime?: boolean;
}

export interface AggregatedTimeEntry {
  date: Date;
  hoursWorked: number;
  jobId: number | null;
  jobName?: string;
  taskDescription?: string;
  breakMinutes: number;
  clockEntries: {
    clockIn: Date;
    clockOut: Date;
    hours: number;
  }[];
}

export interface TimesheetSummary {
  userId: number;
  userName: string;
  weekStart: Date;
  weekEnd: Date;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  totalCost: number;
  entriesByDay: AggregatedTimeEntry[];
  status: string;
  timesheetId?: number;
}

export class TimesheetAggregationService {
  
  /**
   * Generate or update timesheet for a user for a specific week
   */
  async generateTimesheet(
    options: TimesheetGenerationOptions
  ): Promise<TimesheetSummary> {
    const {
      userId,
      weekStartDate,
      weekEndDate = endOfWeek(weekStartDate),
      generateDraft = true,
      includeOvertime = true
    } = options;
    
    // Ensure dates are at start/end of week
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 }); // Sunday
    
    // Check if timesheet already exists
    console.log('generateTimesheet: Checking for existing timesheet...');
    let existingTimesheet = await this.findExistingTimesheet(userId, weekStart, weekEnd);
    console.log('generateTimesheet: Existing timesheet check complete');
    
    // Get aggregated time entries
    console.log('generateTimesheet: Calling aggregateTimeEntries...');
    const aggregatedEntries = await this.aggregateTimeEntries(userId, weekStart, weekEnd);
    console.log(`generateTimesheet: Got ${aggregatedEntries.length} aggregated entries`);
    
    // Calculate hours
    console.log('generateTimesheet: Calculating hours summary...');
    const hoursSummary = this.calculateHoursSummary(aggregatedEntries);
    console.log('generateTimesheet: Hours summary calculated');
    
    // Calculate overtime if enabled
    let overtimeResult = null;
    if (includeOvertime) {
      console.log('generateTimesheet: Calculating overtime...');
      overtimeResult = await overtimeService.calculateOvertimeForTimesheet(
        existingTimesheet?.id || 0,
        userId,
        weekStart,
        weekEnd
      );
      console.log('generateTimesheet: Overtime calculated');
    }
    
    // Get user's hourly rate
    console.log('generateTimesheet: Getting user hourly rate...');
    const hourlyRate = await this.getUserHourlyRate(userId);
    console.log(`generateTimesheet: User hourly rate: ${hourlyRate}`);
    
    // Calculate costs
    const regularCost = hoursSummary.regularHours * hourlyRate;
    const overtimeCost = overtimeResult 
      ? overtimeResult.overtimeSegments.reduce((sum, segment) => 
          sum + (segment.hoursApplied * hourlyRate * segment.rateMultiplier), 0)
      : 0;
    const totalCost = regularCost + overtimeCost;
    
    // Get the payroll period for this week
    const [payrollPeriod] = await db
      .select({ id: payrollPeriods.id })
      .from(payrollPeriods)
      .where(
        and(
          lte(payrollPeriods.payPeriodStart, weekStart),
          gte(payrollPeriods.payPeriodEnd, weekEnd)
        )
      )
      .limit(1);
    
    // Calculate regular hours (total - overtime)
    const regularHours = overtimeResult?.regularHours || 
                        (hoursSummary.totalHours - (overtimeResult?.totalOvertimeHours || 0));
    
    // Create or update timesheet - only include fields that exist in the schema
    const timesheetData = {
      userId,
      payrollPeriodId: payrollPeriod?.id || 1,  // Use actual payroll period ID
      date: weekStart.toISOString().split('T')[0],  // Date field required by timesheets table
      jobId: aggregatedEntries[0]?.jobId || null,  // Use first job if multiple
      totalHours: hoursSummary.totalHours,  // Keep as number
      overtimeHours: overtimeResult?.totalOvertimeHours || 0,  // Keep as number
      status: generateDraft ? 'draft' : 'submitted',
      notes: overtimeResult?.warnings?.length ? `Warnings: ${overtimeResult.warnings.join(', ')}` : undefined,
      // Store aggregation metadata in deviceInfo field (JSONB)
      deviceInfo: {
        aggregatedAt: new Date().toISOString(),
        overtimeRules: overtimeResult?.appliedRules || [],
        warnings: overtimeResult?.warnings || [],
        source: 'timesheet_aggregation'
      }
    };
    
    // Add regularHours for the return object (not stored in DB directly)
    const timesheetDataWithRegular = {
      ...timesheetData,
      regularHours
    };
    
    let timesheetId: number;
    
    if (existingTimesheet) {
      // Update existing timesheet only if it's in draft status
      if (existingTimesheet.status !== 'draft') {
        throw new Error(`Cannot update timesheet in ${existingTimesheet.status} status`);
      }
      
      // Use TimeManagementStorage to update with proper validation and audit
      const updatedTimesheet = await timeManagementStorage.updateTimesheet(
        existingTimesheet.id,
        timesheetData as Partial<InsertTimesheet>,
        userId // User updating their own timesheet
      );
      
      timesheetId = updatedTimesheet.id;
    } else {
      // Create new timesheet using TimeManagementStorage
      const newTimesheet = await timeManagementStorage.createTimesheet(
        timesheetData as InsertTimesheet
      );
      
      timesheetId = newTimesheet.id;
    }
    
    // Use transactional replaceTimeEntries from TimeManagementStorage
    const timeEntriesData = aggregatedEntries.map(entry => ({
      userId, // Include userId for time_entries table
      timesheetId,
      entryDate: entry.date,
      hoursWorked: entry.hoursWorked.toFixed(2),
      jobId: entry.jobId,
      description: entry.jobName || 'Time worked',
      entryType: 'regular' as const,
      createdAt: new Date()
    }));
    
    await timeManagementStorage.replaceTimeEntries(timesheetId, timeEntriesData);
    
    // Get user info
    const userInfo = await this.getUserInfo(userId);
    
    return {
      userId,
      userName: userInfo.name,
      weekStart,
      weekEnd,
      regularHours: regularHours,  // Use the calculated regularHours
      overtimeHours: timesheetData.overtimeHours,  // Already a number
      totalHours: timesheetData.totalHours,  // Already a number
      totalCost,
      entriesByDay: aggregatedEntries,
      status: timesheetData.status,
      timesheetId
    };
  }
  
  /**
   * Generate timesheets for all active users for current week
   */
  async generateWeeklyTimesheets(
    weekStartDate?: Date
  ): Promise<{ success: number; failed: number; results: TimesheetSummary[] }> {
    const weekStart = weekStartDate || startOfWeek(new Date(), { weekStartsOn: 1 });
    
    // Get all active users
    const activeUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(eq(users.isActive, true));
    
    const results: TimesheetSummary[] = [];
    let success = 0;
    let failed = 0;
    
    for (const user of activeUsers) {
      try {
        const summary = await this.generateTimesheet({
          userId: user.id,
          weekStartDate: weekStart,
          generateDraft: true,
          includeOvertime: true
        });
        
        results.push(summary);
        success++;
      } catch (error) {
        console.error(`Failed to generate timesheet for user ${user.id}:`, error);
        failed++;
      }
    }
    
    return { success, failed, results };
  }
  
  /**
   * Aggregate time clock entries for a user within a date range
   * Uses event-based schema and ClockSessionBuilder
   */
  private async aggregateTimeEntries(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<AggregatedTimeEntry[]> {
    try {
      // Import the shared fetcher and session builder
      const { fetchClockEvents } = await import('./utils/clockEventsFetcher');
      const { ClockSessionBuilder } = await import('./utils/clockSessionBuilder');
      const { format } = await import('date-fns');
      const { inArray } = await import('drizzle-orm');
      
      console.log(`aggregateTimeEntries: Fetching events for user ${userId} from ${startDate} to ${endDate}`);
      
      // Get all clock events for the period
      const clockEvents = await fetchClockEvents(userId, startDate, endDate);
      console.log(`aggregateTimeEntries: Found ${clockEvents.length} clock events`);
    
    // Build shift sessions from events
    const sessions = ClockSessionBuilder.buildSessions(clockEvents);
    console.log(`aggregateTimeEntries: Built ${sessions.length} sessions`);
    
    // Filter to only complete sessions (has both clock in and out)
    const completeSessions = sessions.filter(s => s.isComplete);
    console.log(`aggregateTimeEntries: ${completeSessions.length} complete sessions`);
    
    // Log incomplete sessions for telemetry
    const incompleteSessions = sessions.filter(s => !s.isComplete);
    if (incompleteSessions.length > 0) {
      console.warn(`Skipping ${incompleteSessions.length} incomplete sessions for user ${userId}`);
    }
    
    // Get unique job IDs from all sessions
    const jobIds = [...new Set(completeSessions
      .filter(s => s.jobId)
      .map(s => s.jobId!)
    )];
    console.log(`aggregateTimeEntries: Found job IDs: ${jobIds}`);
    
    // Fetch job details in a single query
    const jobDetails = new Map<number, string>();
    if (jobIds.length > 0) {
      console.log(`aggregateTimeEntries: Fetching job details for ${jobIds.length} jobs`);
      const jobRecords = await db
        .select({
          id: jobs.id,
          name: jobs.clientName  // Fixed: jobs table has clientName, not jobTitle
        })
        .from(jobs)
        .where(inArray(jobs.id, jobIds));
      console.log(`aggregateTimeEntries: Found ${jobRecords.length} job records`);
      
      jobRecords.forEach(job => jobDetails.set(job.id, job.name || 'Unknown Job'));
    }
    
    // Group sessions by date
    const aggregatedByDate = new Map<string, AggregatedTimeEntry>();
    
    for (const session of completeSessions) {
      // Use clockInTime date as the grouping key
      const dateKey = format(session.clockInTime, 'yyyy-MM-dd');
      
      // Check for sessions spanning midnight
      const clockOutDate = session.clockOutTime ? 
        format(session.clockOutTime, 'yyyy-MM-dd') : dateKey;
      if (clockOutDate !== dateKey) {
        console.warn(`Session spans midnight for user ${userId}: ${dateKey} to ${clockOutDate}`);
      }
      
      // Initialize day entry if doesn't exist
      if (!aggregatedByDate.has(dateKey)) {
        aggregatedByDate.set(dateKey, {
          date: new Date(dateKey),
          hoursWorked: 0,
          jobId: session.jobId || null,
          jobName: session.jobId ? jobDetails.get(session.jobId) : undefined,
          breakMinutes: 0,
          clockEntries: []
        });
      }
      
      const dayEntry = aggregatedByDate.get(dateKey)!;
      
      // Add hours worked (prefer netHoursWorked over totalHoursWorked)
      const hoursToAdd = session.netHoursWorked ?? session.totalHoursWorked ?? 0;
      dayEntry.hoursWorked += hoursToAdd;
      
      // Add break minutes (combine breaks and meals)
      const totalBreakMinutes = (session.breakMinutes ?? 0) + (session.mealMinutes ?? 0);
      dayEntry.breakMinutes += totalBreakMinutes;
      
      // Add clock entry for this session
      if (session.clockOutTime) {
        dayEntry.clockEntries.push({
          clockIn: session.clockInTime,
          clockOut: session.clockOutTime,
          hours: hoursToAdd
        });
      }
      
      // Handle multiple jobs in the same day
      if (dayEntry.jobId && session.jobId && dayEntry.jobId !== session.jobId) {
        dayEntry.jobId = null;
        dayEntry.jobName = 'Multiple Jobs';
      } else if (!dayEntry.jobId && session.jobId) {
        // Update job if this is the first one we've seen for the day
        dayEntry.jobId = session.jobId;
        dayEntry.jobName = jobDetails.get(session.jobId);
      }
    }
    
    // Convert to array and sort by date
    return Array.from(aggregatedByDate.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      console.error('Error in aggregateTimeEntries:', error);
      throw error;
    }
  }
  
  /**
   * Calculate hours summary from aggregated entries
   */
  private calculateHoursSummary(entries: AggregatedTimeEntry[]): {
    totalHours: number;
    regularHours: number;
    breakMinutes: number;
    daysWorked: number;
  } {
    const totalHours = entries.reduce((sum, entry) => sum + entry.hoursWorked, 0);
    const breakMinutes = entries.reduce((sum, entry) => sum + entry.breakMinutes, 0);
    const daysWorked = entries.length;
    
    // Basic 40-hour week calculation (overtime service will refine this)
    const regularHours = Math.min(totalHours, 40);
    
    return {
      totalHours,
      regularHours,
      breakMinutes,
      daysWorked
    };
  }
  
  /**
   * Find existing timesheet for a user and week
   */
  private async findExistingTimesheet(
    userId: number,
    weekStart: Date,
    weekEnd: Date
  ): Promise<any | null> {
    // Timesheets are daily records, so we look for any timesheet in the week range
    const existing = await db
      .select()
      .from(timesheets)
      .where(
        and(
          eq(timesheets.userId, userId),
          gte(timesheets.date, weekStart.toISOString().split('T')[0]),
          lte(timesheets.date, weekEnd.toISOString().split('T')[0])
        )
      )
      .limit(1);
    
    return existing[0] || null;
  }
  
  /**
   * Get user's hourly rate
   */
  private async getUserHourlyRate(userId: number): Promise<number> {
    // Try to get from team member labor rates
    const [teamMember] = await db
      .select({
        roleId: teamMembers.roleId
      })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId))
      .limit(1);
    
    if (teamMember?.roleId) {
      const [rate] = await db
        .select({
          hourlyRate: laborRates.baseRate  // Fixed: column is baseRate not hourlyRate
        })
        .from(laborRates)
        .where(
          and(
            eq(laborRates.roleId, teamMember.roleId),
            eq(laborRates.isActive, true)
          )
        )
        .orderBy(sql`${laborRates.effectiveDate} DESC`)  // Fixed: column is effectiveDate not effectiveFrom
        .limit(1);
      
      if (rate) {
        return Number(rate.hourlyRate);
      }
    }
    
    // Default rate if not found
    return 25.00; // Default hourly rate
  }
  
  /**
   * Get user information
   */
  private async getUserInfo(userId: number): Promise<{ name: string; email: string }> {
    const [user] = await db
      .select({
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return user || { name: 'Unknown User', email: '' };
  }
  
  
  /**
   * Get timesheet analytics for dashboard
   */
  async getTimesheetAnalytics(
    startDate?: Date,
    endDate?: Date,
    departmentId?: number
  ): Promise<{
    totalHours: number;
    totalCost: number;
    overtimeHours: number;
    averageHoursPerWeek: number;
    pendingApprovals: number;
    completionRate: number;
  }> {
    const conditions = [];
    
    if (startDate && endDate) {
      conditions.push(
        gte(timesheets.weekStartDate, startDate),
        lte(timesheets.weekEndDate, endDate)
      );
    }
    
    const stats = await db
      .select({
        totalHours: sql<number>`COALESCE(SUM(CAST(total_hours AS NUMERIC)), 0)`,
        totalCost: sql<number>`COALESCE(SUM(CAST(total_cost AS NUMERIC)), 0)`,
        overtimeHours: sql<number>`COALESCE(SUM(CAST(overtime_hours AS NUMERIC)), 0)`,
        totalSheets: sql<number>`COUNT(*)`,
        pendingApprovals: sql<number>`COUNT(*) FILTER (WHERE status = 'submitted')`,
        approvedSheets: sql<number>`COUNT(*) FILTER (WHERE status = 'approved')`
      })
      .from(timesheets)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const result = stats[0] || {
      totalHours: 0,
      totalCost: 0,
      overtimeHours: 0,
      totalSheets: 0,
      pendingApprovals: 0,
      approvedSheets: 0
    };
    
    // Calculate weeks in range
    const weeksInRange = startDate && endDate
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
      : 1;
    
    return {
      totalHours: result.totalHours,
      totalCost: result.totalCost,
      overtimeHours: result.overtimeHours,
      averageHoursPerWeek: result.totalHours / weeksInRange,
      pendingApprovals: result.pendingApprovals,
      completionRate: result.totalSheets > 0 
        ? (result.approvedSheets / result.totalSheets) * 100
        : 0
    };
  }
}

// Export singleton instance
export const timesheetAggregationService = new TimesheetAggregationService();
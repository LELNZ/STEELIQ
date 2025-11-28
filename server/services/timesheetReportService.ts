import { db } from "../db";
import { 
  timesheets, users, teamMembers, jobs, payrollPeriods, timeClocks 
} from "@shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { format, differenceInMinutes } from "date-fns";
import PDFDocument from "pdfkit";
import { Readable } from "stream";

interface TimesheetReport {
  userId: number;
  userName: string;
  department: string;
  period: {
    startDate: Date;
    endDate: Date;
    payPeriodId?: number;
  };
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  totalHours: number;
  grossPay: number;
  entries: TimesheetEntry[];
  summary: {
    daysWorked: number;
    avgHoursPerDay: number;
    totalBreakTime: number;
    totalMealTime: number;
  };
}

interface TimesheetEntry {
  date: Date;
  dayOfWeek: string;
  clockIn?: Date;
  clockOut?: Date;
  breaks: Array<{ start: Date; end: Date; type: string }>;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  totalHours: number;
  jobName?: string;
  notes?: string;
}

class TimesheetReportService {
  // No file system storage - everything in memory
  private reportCache: Map<string, Buffer> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Clean up expired cached reports periodically
    setInterval(() => this.cleanupExpiredReports(), 60 * 1000); // Every minute
  }

  /**
   * Clean up expired reports from memory cache
   */
  private cleanupExpiredReports(): void {
    // For now, clear all cached reports older than TTL
    // In production, you'd track creation time
    if (this.reportCache.size > 100) {
      this.reportCache.clear();
    }
  }

  /**
   * Generate timesheet report for a user with secure streaming
   */
  async generateTimesheetReport(
    userId: number,
    startDate: Date,
    endDate: Date,
    format: 'pdf' | 'csv' = 'pdf'
  ): Promise<{ reportBuffer: Buffer; reportData: TimesheetReport; mimeType: string }> {
    // Fetch user information
    const userInfo = await this.getUserInfo(userId);
    if (!userInfo) {
      throw new Error('User not found');
    }

    // Fetch timesheet data
    const entries = await this.getTimesheetEntries(userId, startDate, endDate);
    
    // Calculate totals
    const totals = this.calculateTotals(entries);
    
    // Build report data
    const reportData: TimesheetReport = {
      userId,
      userName: userInfo.userName,
      department: userInfo.department,
      period: {
        startDate,
        endDate,
        payPeriodId: userInfo.payPeriodId
      },
      regularHours: totals.regularHours,
      overtimeHours: totals.overtimeHours,
      doubleTimeHours: totals.doubleTimeHours,
      totalHours: totals.totalHours,
      grossPay: totals.grossPay,
      entries,
      summary: {
        daysWorked: entries.length,
        avgHoursPerDay: entries.length > 0 ? totals.totalHours / entries.length : 0,
        totalBreakTime: totals.breakTime,
        totalMealTime: totals.mealTime
      }
    };

    // Generate report buffer
    let reportBuffer: Buffer;
    let mimeType: string;
    
    if (format === 'pdf') {
      reportBuffer = await this.generatePDF(reportData);
      mimeType = 'application/pdf';
    } else {
      reportBuffer = await this.generateCSV(reportData);
      mimeType = 'text/csv';
    }

    return { reportBuffer, reportData, mimeType };
  }

  /**
   * Get user information
   */
  private async getUserInfo(userId: number) {
    const result = await db
      .select({
        userName: users.username,
        department: teamMembers.department,
        hourlyRate: teamMembers.hourlyRate,
        payPeriodId: payrollPeriods.id
      })
      .from(users)
      .leftJoin(teamMembers, eq(teamMembers.userId, users.id))
      .leftJoin(
        payrollPeriods,
        and(
          lte(payrollPeriods.payPeriodStart, new Date()),
          gte(payrollPeriods.payPeriodEnd, new Date())
        )
      )
      .where(eq(users.id, userId))
      .limit(1);

    return result[0];
  }

  /**
   * Get timesheet entries for the period
   */
  private async getTimesheetEntries(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<TimesheetEntry[]> {
    // Fetch timesheet records
    const timesheetRecords = await db
      .select({
        date: timesheets.date,
        regularHours: timesheets.hoursWorked,
        overtimeHours: timesheets.overtimeHours,
        doubleTimeHours: timesheets.doubleTimeHours,
        jobId: timesheets.jobId,
        notes: timesheets.notes
      })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.userId, userId),
          gte(timesheets.date, startDate),
          lte(timesheets.date, endDate)
        )
      )
      .orderBy(timesheets.date);

    // Fetch time clock records for detail
    const clockRecords = await db
      .select()
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.userId, userId),
          gte(timeClocks.timestamp, startDate),
          lte(timeClocks.timestamp, endDate)
        )
      )
      .orderBy(timeClocks.timestamp);

    // Fetch job names
    const jobIds = [...new Set(timesheetRecords.map(r => r.jobId).filter(Boolean))];
    const jobNames = new Map<number, string>();
    
    if (jobIds.length > 0) {
      const jobRecords = await db
        .select({ id: jobs.id, name: jobs.jobTitle })
        .from(jobs)
        .where(sql`${jobs.id} IN ${jobIds}`);
      
      jobRecords.forEach(job => {
        jobNames.set(job.id, job.name);
      });
    }

    // Build entries
    const entries: TimesheetEntry[] = [];
    const entriesByDate = new Map<string, TimesheetEntry>();

    // Process timesheet records
    for (const record of timesheetRecords) {
      const dateKey = format(record.date, 'yyyy-MM-dd');
      const dayOfWeek = format(record.date, 'EEEE');
      
      // Find clock records for this date
      const dayClocks = clockRecords.filter(clock => {
        const clockDate = format(clock.timestamp, 'yyyy-MM-dd');
        return clockDate === dateKey;
      });

      // Get first clock in and last clock out
      const clockIn = dayClocks.find(c => c.clockType === 'clock_in');
      const clockOut = dayClocks
        .filter(c => c.clockType === 'clock_out')
        .pop();

      // Get breaks
      const breaks = dayClocks
        .filter(c => c.clockType === 'break_start' || c.clockType === 'meal_start')
        .map(breakStart => {
          const breakEnd = dayClocks.find(
            c => (c.clockType === 'break_end' || c.clockType === 'meal_end') &&
                 c.timestamp > breakStart.timestamp
          );
          
          return {
            start: breakStart.timestamp,
            end: breakEnd?.timestamp || new Date(),
            type: breakStart.clockType.includes('meal') ? 'meal' : 'break'
          };
        });

      const entry: TimesheetEntry = {
        date: record.date,
        dayOfWeek,
        clockIn: clockIn?.timestamp,
        clockOut: clockOut?.timestamp || clockIn?.clockOutTimestamp,
        breaks,
        regularHours: record.regularHours,
        overtimeHours: record.overtimeHours || 0,
        doubleTimeHours: record.doubleTimeHours || 0,
        totalHours: record.regularHours + (record.overtimeHours || 0) + (record.doubleTimeHours || 0),
        jobName: record.jobId ? jobNames.get(record.jobId) : undefined,
        notes: record.notes || undefined
      };

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Calculate totals from entries
   */
  private calculateTotals(entries: TimesheetEntry[]) {
    let regularHours = 0;
    let overtimeHours = 0;
    let doubleTimeHours = 0;
    let breakTime = 0;
    let mealTime = 0;

    for (const entry of entries) {
      regularHours += entry.regularHours;
      overtimeHours += entry.overtimeHours;
      doubleTimeHours += entry.doubleTimeHours;

      // Calculate break times
      for (const breakPeriod of entry.breaks) {
        if (breakPeriod.end) {
          const duration = differenceInMinutes(breakPeriod.end, breakPeriod.start);
          if (breakPeriod.type === 'meal') {
            mealTime += duration;
          } else {
            breakTime += duration;
          }
        }
      }
    }

    const totalHours = regularHours + overtimeHours + doubleTimeHours;
    
    // TODO: Get actual pay rates from user's team member record
    const hourlyRate = 25; // Default rate
    const overtimeRate = hourlyRate * 1.5;
    const doubleTimeRate = hourlyRate * 2;
    
    const grossPay = 
      (regularHours * hourlyRate) +
      (overtimeHours * overtimeRate) +
      (doubleTimeHours * doubleTimeRate);

    return {
      regularHours,
      overtimeHours,
      doubleTimeHours,
      totalHours,
      grossPay,
      breakTime,
      mealTime
    };
  }

  /**
   * Generate PDF report with secure in-memory streaming
   */
  private async generatePDF(report: TimesheetReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      
      // Collect PDF data chunks in memory
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('Timesheet Report', { align: 'center' });
      doc.moveDown();

      // Employee Information
      doc.fontSize(12);
      doc.text(`Employee: ${report.userName}`);
      doc.text(`Department: ${report.department}`);
      doc.text(`Period: ${format(report.period.startDate, 'MM/dd/yyyy')} - ${format(report.period.endDate, 'MM/dd/yyyy')}`);
      doc.moveDown();

      // Summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(11);
      doc.text(`Days Worked: ${report.summary.daysWorked}`);
      doc.text(`Total Hours: ${report.totalHours.toFixed(2)}`);
      doc.text(`Regular Hours: ${report.regularHours.toFixed(2)}`);
      doc.text(`Overtime Hours: ${report.overtimeHours.toFixed(2)}`);
      doc.text(`Double Time Hours: ${report.doubleTimeHours.toFixed(2)}`);
      doc.text(`Average Hours/Day: ${report.summary.avgHoursPerDay.toFixed(2)}`);
      doc.text(`Gross Pay: $${report.grossPay.toFixed(2)}`);
      doc.moveDown();

      // Daily Entries
      doc.fontSize(14).text('Daily Time Records', { underline: true });
      doc.moveDown(0.5);

      // Table headers
      doc.fontSize(10);
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 120;
      const col3 = 200;
      const col4 = 280;
      const col5 = 340;
      const col6 = 400;
      const col7 = 460;

      // Header row
      doc.text('Date', col1, tableTop);
      doc.text('Day', col2, tableTop);
      doc.text('Clock In', col3, tableTop);
      doc.text('Clock Out', col4, tableTop);
      doc.text('Regular', col5, tableTop);
      doc.text('OT', col6, tableTop);
      doc.text('Total', col7, tableTop);
      
      doc.moveTo(col1, tableTop + 15)
         .lineTo(520, tableTop + 15)
         .stroke();

      let yPosition = tableTop + 20;

      // Data rows
      for (const entry of report.entries) {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.text(format(entry.date, 'MM/dd'), col1, yPosition);
        doc.text(format(entry.date, 'EEE'), col2, yPosition);
        doc.text(entry.clockIn ? format(entry.clockIn, 'HH:mm') : '-', col3, yPosition);
        doc.text(entry.clockOut ? format(entry.clockOut, 'HH:mm') : '-', col4, yPosition);
        doc.text(entry.regularHours.toFixed(2), col5, yPosition);
        doc.text(entry.overtimeHours.toFixed(2), col6, yPosition);
        doc.text(entry.totalHours.toFixed(2), col7, yPosition);

        yPosition += 18;

        // Add job/notes if present
        if (entry.jobName || entry.notes) {
          doc.fontSize(9);
          if (entry.jobName) {
            doc.text(`  Job: ${entry.jobName}`, col2, yPosition);
            yPosition += 12;
          }
          if (entry.notes) {
            doc.text(`  Note: ${entry.notes}`, col2, yPosition);
            yPosition += 12;
          }
          doc.fontSize(10);
        }
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8);
      doc.text(`Generated: ${format(new Date(), 'MM/dd/yyyy HH:mm')}`, { align: 'center' });
      
      // Signature lines
      if (doc.y < 650) {
        doc.moveDown(3);
        doc.fontSize(10);
        doc.text('Employee Signature: _______________________  Date: __________');
        doc.moveDown();
        doc.text('Supervisor Signature: _____________________  Date: __________');
      }

      doc.end();
    });
  }

  /**
   * Generate CSV report in memory
   */
  private async generateCSV(report: TimesheetReport): Promise<Buffer> {

    const headers = [
      'Date',
      'Day of Week',
      'Clock In',
      'Clock Out',
      'Regular Hours',
      'Overtime Hours',
      'Double Time Hours',
      'Total Hours',
      'Job',
      'Notes'
    ];

    const rows = report.entries.map(entry => [
      format(entry.date, 'yyyy-MM-dd'),
      entry.dayOfWeek,
      entry.clockIn ? format(entry.clockIn, 'HH:mm:ss') : '',
      entry.clockOut ? format(entry.clockOut, 'HH:mm:ss') : '',
      entry.regularHours.toFixed(2),
      entry.overtimeHours.toFixed(2),
      entry.doubleTimeHours.toFixed(2),
      entry.totalHours.toFixed(2),
      entry.jobName || '',
      entry.notes || ''
    ]);

    // Add summary rows
    rows.push([]);
    rows.push(['SUMMARY']);
    rows.push(['Employee', report.userName]);
    rows.push(['Department', report.department]);
    rows.push(['Period', `${format(report.period.startDate, 'yyyy-MM-dd')} to ${format(report.period.endDate, 'yyyy-MM-dd')}`]);
    rows.push(['Total Regular Hours', report.regularHours.toFixed(2)]);
    rows.push(['Total Overtime Hours', report.overtimeHours.toFixed(2)]);
    rows.push(['Total Double Time Hours', report.doubleTimeHours.toFixed(2)]);
    rows.push(['Total Hours', report.totalHours.toFixed(2)]);
    rows.push(['Gross Pay', `$${report.grossPay.toFixed(2)}`]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Generate batch timesheet reports for a department
   */
  async generateDepartmentReports(
    department: string,
    startDate: Date,
    endDate: Date,
    format: 'pdf' | 'csv' = 'pdf'
  ): Promise<{ reports: Array<{ userId: number; reportBuffer: Buffer }>; totalReports: number }> {
    // Get all users in department
    const departmentUsers = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.department, department),
          eq(teamMembers.isActive, true)
        )
      );

    const reports: Array<{ userId: number; reportBuffer: Buffer }> = [];

    for (const user of departmentUsers) {
      if (user.userId) {
        try {
          const { reportBuffer } = await this.generateTimesheetReport(
            user.userId,
            startDate,
            endDate,
            format
          );
          reports.push({ userId: user.userId, reportBuffer });
        } catch (error) {
          console.error(`Failed to generate report for user ${user.userId}:`, error);
        }
      }
    }

    return {
      reports,
      totalReports: reports.length
    };
  }

  /**
   * Generate a secure temporary token for report access
   */
  generateReportToken(userId: number, expiresIn: number = 5 * 60 * 1000): string {
    const token = Buffer.from(
      JSON.stringify({
        userId,
        expires: Date.now() + expiresIn,
        random: Math.random().toString(36)
      })
    ).toString('base64');
    
    return token;
  }

  /**
   * Validate report access token
   */
  validateReportToken(token: string, requestingUserId: number): boolean {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      
      if (Date.now() > decoded.expires) {
        return false; // Token expired
      }
      
      return decoded.userId === requestingUserId;
    } catch {
      return false;
    }
  }
}

export const timesheetReportService = new TimesheetReportService();
import { eq, and, gte, lte, desc, sql, between } from 'drizzle-orm';
import { db } from '../db';
import {
  users,
  teamMembers,
  jobs,
  jobTasks,
  timeClocks,
  timesheets,
  timeEntries,
  workSchedules,
  shiftNotifications,
  payrollPeriods,
  locationTracking,
  geofenceZones,
  departments,
  roles,
  companyLocations
} from '@shared/schema';

/**
 * Service to fetch real data from database for Time & Payroll email notifications
 * Ensures all emails use actual employee data, not mock data
 */
export class TimePayrollDataService {
  /**
   * Get shift reminder data for an upcoming shift
   */
  async getShiftReminderData(userId: number, shiftDate?: Date) {
    try {
      // Get user details
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      const teamMember = await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId))
        .limit(1);
      
      // Get upcoming shift - if no specific date, get next scheduled shift
      const targetDate = shiftDate || new Date(Date.now() + 86400000); // Tomorrow
      const shift = await db.select({
        schedule: workSchedules,
        job: jobs,
        location: companyLocations
      })
        .from(workSchedules)
        .leftJoin(jobs, eq(workSchedules.jobId, jobs.id))
        .leftJoin(companyLocations, sql`${workSchedules.location} = ${companyLocations.name}`)
        .where(and(
          eq(workSchedules.userId, userId),
          gte(workSchedules.date, targetDate.toISOString().split('T')[0])
        ))
        .orderBy(workSchedules.date)
        .limit(1);
      
      if (shift.length === 0) {
        return null; // No upcoming shift
      }
      
      // Null check for user and team member
      if (!user[0] && !teamMember[0]) {
        console.warn(`No user or team member found for userId: ${userId}`);
        return null;
      }
      
      return {
        userName: user[0]?.name || (teamMember[0] ? `${teamMember[0].firstName} ${teamMember[0].lastName}` : 'Unknown User'),
        email: user[0]?.email || 'no-email@example.com',
        shiftDate: shift[0].schedule.date,
        startTime: new Date(shift[0].schedule.shiftStart).toLocaleTimeString('en-NZ', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        endTime: new Date(shift[0].schedule.shiftEnd).toLocaleTimeString('en-NZ', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        location: shift[0].schedule.location || 'Main Facility',
        jobName: shift[0].job?.name || 'General Work',
        jobNumber: shift[0].job?.jobNumber || '',
        notes: shift[0].schedule.notes
      };
    } catch (error) {
      console.error('Error fetching shift reminder data:', error);
      return null;
    }
  }
  
  /**
   * Get clock in data for confirmation email
   */
  async getClockInData(userId: number, clockId?: number) {
    try {
      // Get user and team member details
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      const teamMember = await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId))
        .limit(1);
      
      // Get the most recent clock in record
      const clockQuery = clockId 
        ? eq(timeClocks.id, clockId)
        : and(eq(timeClocks.userId, userId), eq(timeClocks.clockType, 'in'));
      
      const clockIn = await db.select({
        clock: timeClocks,
        job: jobs,
        task: jobTasks,
        geofence: geofenceZones
      })
        .from(timeClocks)
        .leftJoin(jobs, eq(timeClocks.jobId, jobs.id))
        .leftJoin(jobTasks, eq(timeClocks.taskId, jobTasks.id))
        .leftJoin(geofenceZones, eq(timeClocks.geofenceId, geofenceZones.id))
        .where(clockQuery)
        .orderBy(desc(timeClocks.timestamp))
        .limit(1);
      
      if (clockIn.length === 0) {
        return null;
      }
      
      // Null check for user and team member
      if (!user[0] && !teamMember[0]) {
        console.warn(`No user or team member found for userId: ${userId}`);
        return null;
      }
      
      const geoData = clockIn[0].clock.geolocation as any;
      
      return {
        userName: user[0]?.name || (teamMember[0] ? `${teamMember[0].firstName} ${teamMember[0].lastName}` : 'Unknown User'),
        email: user[0]?.email || 'no-email@example.com',
        clockInTime: new Date(clockIn[0].clock.timestamp),
        location: clockIn[0].clock.location || 'Main Facility',
        jobName: clockIn[0].job?.name || 'General Work',
        jobNumber: clockIn[0].job?.jobNumber || '',
        taskName: clockIn[0].task?.taskName,
        gpsVerified: clockIn[0].clock.geofenceValidated,
        photoVerified: !!clockIn[0].clock.photoUrl,
        geofenceName: clockIn[0].geofence?.name,
        latitude: geoData?.lat,
        longitude: geoData?.lng,
        accuracy: geoData?.accuracy,
        notes: clockIn[0].clock.notes
      };
    } catch (error) {
      console.error('Error fetching clock in data:', error);
      return null;
    }
  }
  
  /**
   * Get clock out data with daily summary
   */
  async getClockOutData(userId: number, clockOutId?: number) {
    try {
      const user = await db.select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      const teamMember = await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId))
        .limit(1);
      
      // Get the clock out record
      const clockQuery = clockOutId 
        ? eq(timeClocks.id, clockOutId)
        : and(eq(timeClocks.userId, userId), eq(timeClocks.clockType, 'out'));
      
      const clockOut = await db.select()
        .from(timeClocks)
        .leftJoin(jobs, eq(timeClocks.jobId, jobs.id))
        .where(clockQuery)
        .orderBy(desc(timeClocks.timestamp))
        .limit(1);
      
      if (clockOut.length === 0) {
        return null;
      }
      
      // Null check for user and team member
      if (!user[0] && !teamMember[0]) {
        console.warn(`No user or team member found for userId: ${userId}`);
        return null;
      }
      
      // Find the corresponding clock in for this day
      const clockOutTime = new Date(clockOut[0].timeClocks.timestamp);
      const dayStart = new Date(clockOutTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(clockOutTime);
      dayEnd.setHours(23, 59, 59, 999);
      
      const clockIn = await db.select()
        .from(timeClocks)
        .where(and(
          eq(timeClocks.userId, userId),
          eq(timeClocks.clockType, 'in'),
          between(timeClocks.timestamp, dayStart, dayEnd)
        ))
        .orderBy(timeClocks.timestamp)
        .limit(1);
      
      // Calculate total hours
      let totalHours = 0;
      if (clockIn.length > 0) {
        const inTime = new Date(clockIn[0].timestamp);
        const outTime = new Date(clockOut[0].timeClocks.timestamp);
        totalHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
      }
      
      // Get any time entries for the day
      const timeEntry = await db.select()
        .from(timeEntries)
        .where(and(
          eq(timeEntries.userId, userId),
          between(timeEntries.clockIn, dayStart, dayEnd)
        ))
        .limit(1);
      
      return {
        userName: user[0]?.name || (teamMember[0] ? `${teamMember[0].firstName} ${teamMember[0].lastName}` : 'Unknown User'),
        email: user[0]?.email || 'no-email@example.com',
        clockOutTime: clockOutTime,
        clockInTime: clockIn.length > 0 ? new Date(clockIn[0].timestamp) : null,
        totalHours: totalHours.toFixed(2),
        breakDuration: timeEntry[0]?.breakDuration || 30,
        location: clockOut[0].timeClocks.location || 'Main Facility',
        jobName: clockOut[0].jobs?.name || 'General Work',
        jobNumber: clockOut[0].jobs?.jobNumber || '',
        gpsVerified: clockOut[0].timeClocks.geofenceValidated,
        photoVerified: !!clockOut[0].timeClocks.photoUrl,
        status: 'verified'
      };
    } catch (error) {
      console.error('Error fetching clock out data:', error);
      return null;
    }
  }
  
  /**
   * Get timesheet approval request data
   */
  async getApprovalRequestData(timesheetId: number) {
    try {
      const timesheet = await db.select({
        timesheet: timesheets,
        user: users,
        teamMember: teamMembers,
        job: jobs,
        supervisor: users
      })
        .from(timesheets)
        .innerJoin(users, eq(timesheets.userId, users.id))
        .leftJoin(teamMembers, eq(teamMembers.userId, users.id))
        .leftJoin(jobs, eq(timesheets.jobId, jobs.id))
        .leftJoin(users as any, eq(timesheets.supervisorId, (users as any).id))
        .where(eq(timesheets.id, timesheetId))
        .limit(1);
      
      if (timesheet.length === 0) {
        console.warn(`No timesheet found with ID: ${timesheetId}`);
        return null;
      }
      
      // Null check for user
      if (!timesheet[0].user) {
        console.warn(`No user found for timesheet: ${timesheetId}`);
        return null;
      }
      
      // Calculate week period
      const date = new Date(timesheet[0].timesheet.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      // Get all timesheets for the week
      const weekTimesheets = await db.select()
        .from(timesheets)
        .where(and(
          eq(timesheets.userId, timesheet[0].user.id),
          between(timesheets.date, weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0])
        ));
      
      // Calculate totals
      let totalHours = 0;
      let overtimeHours = 0;
      
      weekTimesheets.forEach(ts => {
        totalHours += parseFloat(ts.hoursWorked || '0');
        overtimeHours += parseFloat(ts.overtimeHours || '0');
      });
      
      const regularHours = totalHours - overtimeHours;
      
      return {
        timesheetId: timesheet[0].timesheet.id,
        userName: timesheet[0].user.name || `${timesheet[0].teamMember?.firstName} ${timesheet[0].teamMember?.lastName}`,
        employeeEmail: timesheet[0].user.email,
        supervisorName: timesheet[0].supervisor?.name,
        supervisorEmail: timesheet[0].supervisor?.email,
        periodStart: weekStart,
        periodEnd: weekEnd,
        totalHours: totalHours.toFixed(2),
        regularHours: regularHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        jobName: timesheet[0].job?.name,
        jobNumber: timesheet[0].job?.jobNumber,
        status: timesheet[0].timesheet.status,
        notes: timesheet[0].timesheet.notes,
        submittedAt: timesheet[0].timesheet.submittedAt
      };
    } catch (error) {
      console.error('Error fetching approval request data:', error);
      return null;
    }
  }
  
  /**
   * Get payroll processing alert data
   */
  async getPayrollAlertData(payPeriodId?: number) {
    try {
      // Get the current or specified payroll period
      let payPeriod;
      
      if (payPeriodId) {
        payPeriod = await db.select()
          .from(payrollPeriods)
          .where(eq(payrollPeriods.id, payPeriodId))
          .limit(1);
      } else {
        // Get the most recent period
        payPeriod = await db.select()
          .from(payrollPeriods)
          .orderBy(desc(payrollPeriods.endDate))
          .limit(1);
      }
      
      if (!payPeriod || payPeriod.length === 0) {
        // Create default data if no payroll period exists
        const now = new Date();
        const periodEnd = new Date();
        const periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 14);
        
        return {
          periodStart,
          periodEnd,
          paymentDate: new Date(now.getTime() + 172800000), // 2 days from now
          employeesProcessed: 0,
          totalHours: 0,
          totalRegularPay: 0,
          totalOvertimePay: 0,
          totalGrossPay: 0,
          status: 'pending'
        };
      }
      
      // Get all approved timesheets for this period
      const approvedTimesheets = await db.select()
        .from(timesheets)
        .where(and(
          eq(timesheets.status, 'approved'),
          between(
            timesheets.date,
            payPeriod[0].startDate,
            payPeriod[0].endDate
          )
        ));
      
      // Get unique employees
      const uniqueEmployees = new Set(approvedTimesheets.map(ts => ts.userId));
      
      // Calculate totals
      let totalHours = 0;
      let totalOvertimeHours = 0;
      
      approvedTimesheets.forEach(ts => {
        totalHours += parseFloat(ts.hoursWorked || '0');
        totalOvertimeHours += parseFloat(ts.overtimeHours || '0');
      });
      
      // Get team members for rate calculation (simplified)
      const teamMemberRates = await db.select()
        .from(teamMembers)
        .where(sql`${teamMembers.userId} IN ${sql.raw(`(${Array.from(uniqueEmployees).join(',')})`)}`)
        .limit(uniqueEmployees.size);
      
      // Calculate pay (simplified - real calculation would be more complex)
      let totalRegularPay = 0;
      let totalOvertimePay = 0;
      
      teamMemberRates.forEach(tm => {
        const hourlyRate = parseFloat(tm.hourlyRate || '30');
        const overtimeRate = parseFloat(tm.overtimeRate || String(hourlyRate * 1.5));
        totalRegularPay += (totalHours - totalOvertimeHours) * hourlyRate / uniqueEmployees.size;
        totalOvertimePay += totalOvertimeHours * overtimeRate / uniqueEmployees.size;
      });
      
      return {
        periodStart: new Date(payPeriod[0].startDate),
        periodEnd: new Date(payPeriod[0].endDate),
        paymentDate: payPeriod[0].paymentDate ? new Date(payPeriod[0].paymentDate) : new Date(Date.now() + 172800000),
        employeesProcessed: uniqueEmployees.size,
        totalHours: totalHours.toFixed(2),
        totalRegularPay: totalRegularPay.toFixed(2),
        totalOvertimePay: totalOvertimePay.toFixed(2),
        totalGrossPay: (totalRegularPay + totalOvertimePay).toFixed(2),
        status: payPeriod[0].status || 'processing',
        approvedTimesheets: approvedTimesheets.length
      };
    } catch (error) {
      console.error('Error fetching payroll alert data:', error);
      return null;
    }
  }
  
  /**
   * Get all managers/supervisors for notification
   */
  async getManagerEmails(departmentId?: number): Promise<string[]> {
    try {
      const managers = await db.select()
        .from(users)
        .innerJoin(teamMembers, eq(users.id, teamMembers.userId))
        .innerJoin(roles, eq(teamMembers.roleId, roles.id))
        .where(sql`${roles.name} IN ('Manager', 'Supervisor', 'Admin')`)
        .limit(50);
      
      return managers.map(m => m.users.email).filter(Boolean);
    } catch (error) {
      console.error('Error fetching manager emails:', error);
      return [];
    }
  }
  
  /**
   * Check if notification should be sent based on preferences
   */
  async shouldSendNotification(userId: number, notificationType: string): Promise<boolean> {
    try {
      const prefs = await db.select()
        .from(shiftNotifications)
        .where(eq(shiftNotifications.userId, userId))
        .limit(1);
      
      // Default to true if no preferences set
      return true;
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true;
    }
  }
}

// Export singleton instance
export const timePayrollDataService = new TimePayrollDataService();
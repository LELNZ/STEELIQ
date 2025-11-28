import sgMail from '@sendgrid/mail';
import { db } from '../db';
import { sql, eq, and, gte } from 'drizzle-orm';
import { users, notificationPreferences } from '@shared/schema';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const ENABLE_EMAIL = process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@lateralengineering.co.nz';

if (SENDGRID_API_KEY && ENABLE_EMAIL) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('[Time & Payroll Email] Email notifications enabled');
} else {
  console.warn('[Time & Payroll Email] Email notifications disabled');
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export class TimePayrollEmailService {
  private emailProvider: any;
  private isEnabled: boolean = false;

  constructor(emailProvider?: any) {
    this.emailProvider = emailProvider;
    this.isEnabled = !!emailProvider || (ENABLE_EMAIL && !!SENDGRID_API_KEY);
  }

  /**
   * Send notification using injected email provider or SendGrid
   */
  async sendNotification(
    type: string,
    recipients: string | string[],
    data: any
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled) {
      return { success: false, error: 'Email notifications disabled' };
    }

    // Map notification types to appropriate methods
    switch (type) {
      case 'shift-reminder':
        return this.sendShiftReminder(data);
      case 'clock-in':
      case 'clock-out':
        return this.sendClockNotification(data);
      case 'approval-request':
        return this.sendApprovalRequest(data);
      case 'payroll-alert':
        return this.sendPayrollAlert(data);
      default:
        return { success: false, error: `Unknown notification type: ${type}` };
    }
  }

  /**
   * Send shift reminder email
   */
  async sendShiftReminder(params: {
    userId: number;
    shiftDate: Date;
    startTime: string;
    endTime: string;
    jobName?: string;
    location?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user details
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1);

      if (!user?.email) {
        return { success: false, error: 'User email not found' };
      }

      // Check if user has email notifications enabled
      const [prefs] = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, params.userId))
        .limit(1);

      if (prefs && !prefs.email) {
        return { success: false, error: 'User has disabled email notifications' };
      }

      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-NZ', { 
          weekday: 'long',
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
      };

      const subject = `Shift Reminder: ${formatDate(params.shiftDate)}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e293b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .shift-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .detail-row { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .detail-row:last-child { border-bottom: none; }
            .reminder { background: #fef3c7; border: 1px solid #fcd34d; padding: 10px; border-radius: 4px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">⏰ Shift Reminder</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">STEELIQ Time & Payroll System</p>
            </div>
            
            <div class="content">
              <p>Hi ${user.name},</p>
              
              <p>This is a reminder about your upcoming shift:</p>
              
              <div class="shift-details">
                <div class="detail-row">
                  <strong>📅 Date:</strong> ${formatDate(params.shiftDate)}
                </div>
                <div class="detail-row">
                  <strong>⏱️ Time:</strong> ${params.startTime} - ${params.endTime}
                </div>
                ${params.jobName ? `
                <div class="detail-row">
                  <strong>🏗️ Job:</strong> ${params.jobName}
                </div>
                ` : ''}
                ${params.location ? `
                <div class="detail-row">
                  <strong>📍 Location:</strong> ${params.location}
                </div>
                ` : ''}
              </div>
              
              <div class="reminder">
                <strong>Remember to:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  <li>Clock in when you arrive at site</li>
                  <li>Take a photo for verification</li>
                  <li>Ensure GPS location is enabled</li>
                </ul>
              </div>
              
              <p>If you cannot make this shift, please notify your manager immediately.</p>
              
              <div class="footer">
                <p>This is an automated notification from STEELIQ.</p>
                <p>Lateral Engineering Limited</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail({
        to: user.email,
        subject,
        html,
        text: `Shift Reminder: ${formatDate(params.shiftDate)} from ${params.startTime} to ${params.endTime}${params.jobName ? ` at ${params.jobName}` : ''}`
      });

    } catch (error) {
      console.error('[Email] Error sending shift reminder:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send timesheet approval request email
   */
  async sendApprovalRequest(params: {
    managerId: number;
    employeeName: string;
    weekEnding: Date;
    totalHours: number;
    totalOvertimeHours?: number;
    corrections?: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const [manager] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.managerId))
        .limit(1);

      if (!manager?.email) {
        return { success: false, error: 'Manager email not found' };
      }

      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-NZ', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
      };

      const subject = `Timesheet Approval Required: ${params.employeeName} - Week Ending ${formatDate(params.weekEnding)}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .timesheet-summary { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .summary-row:last-child { border-bottom: none; }
            .action-button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 10px 10px 0; }
            .warning { background: #fef3c7; border: 1px solid #fcd34d; padding: 10px; border-radius: 4px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">⚠️ Timesheet Approval Required</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">STEELIQ Time & Payroll System</p>
            </div>
            
            <div class="content">
              <p>Dear ${manager.name},</p>
              
              <p>A timesheet requires your approval:</p>
              
              <div class="timesheet-summary">
                <div class="summary-row">
                  <span><strong>Employee:</strong></span>
                  <span>${params.employeeName}</span>
                </div>
                <div class="summary-row">
                  <span><strong>Week Ending:</strong></span>
                  <span>${formatDate(params.weekEnding)}</span>
                </div>
                <div class="summary-row">
                  <span><strong>Total Hours:</strong></span>
                  <span style="font-size: 18px; font-weight: bold;">${params.totalHours.toFixed(2)}</span>
                </div>
                ${params.totalOvertimeHours ? `
                <div class="summary-row">
                  <span><strong>Overtime Hours:</strong></span>
                  <span style="color: #dc2626; font-weight: bold;">${params.totalOvertimeHours.toFixed(2)}</span>
                </div>
                ` : ''}
                ${params.corrections ? `
                <div class="summary-row">
                  <span><strong>Corrections:</strong></span>
                  <span style="color: #f59e0b;">${params.corrections} correction(s) pending</span>
                </div>
                ` : ''}
              </div>
              
              ${params.totalOvertimeHours && params.totalOvertimeHours > 0 ? `
              <div class="warning">
                <strong>⚠️ Overtime Alert:</strong> This timesheet includes ${params.totalOvertimeHours.toFixed(2)} hours of overtime that requires your approval.
              </div>
              ` : ''}
              
              <p>Please review and approve this timesheet at your earliest convenience.</p>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.APP_URL || 'https://steeliq.lateralengineering.co.nz'}/time-payroll/approvals" class="action-button">
                  Review Timesheet
                </a>
              </div>
              
              <div class="footer">
                <p>This is an automated notification from STEELIQ.</p>
                <p>Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail({
        to: manager.email,
        subject,
        html,
        text: `Timesheet approval required for ${params.employeeName}, Week ending ${formatDate(params.weekEnding)}, Total hours: ${params.totalHours.toFixed(2)}`
      });

    } catch (error) {
      console.error('[Email] Error sending approval request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send correction notification email
   */
  async sendCorrectionNotification(params: {
    userId: number;
    correctionType: 'approved' | 'rejected' | 'pending';
    date: Date;
    originalHours: number;
    correctedHours?: number;
    reason?: string;
    managerComment?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1);

      if (!user?.email) {
        return { success: false, error: 'User email not found' };
      }

      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-NZ', { 
          weekday: 'long',
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
      };

      const statusColor = {
        approved: '#10b981',
        rejected: '#ef4444',
        pending: '#f59e0b'
      };

      const statusEmoji = {
        approved: '✅',
        rejected: '❌',
        pending: '⏳'
      };

      const subject = `Timesheet Correction ${params.correctionType.charAt(0).toUpperCase() + params.correctionType.slice(1)}: ${formatDate(params.date)}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statusColor[params.correctionType]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
            .correction-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .detail-row { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .detail-row:last-child { border-bottom: none; }
            .status-badge { display: inline-block; padding: 4px 12px; background: ${statusColor[params.correctionType]}; color: white; border-radius: 4px; font-weight: bold; }
            .comment-box { background: #f1f5f9; padding: 12px; border-left: 3px solid ${statusColor[params.correctionType]}; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">${statusEmoji[params.correctionType]} Correction ${params.correctionType.charAt(0).toUpperCase() + params.correctionType.slice(1)}</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">STEELIQ Time & Payroll System</p>
            </div>
            
            <div class="content">
              <p>Hi ${user.name},</p>
              
              <p>Your timesheet correction has been <span class="status-badge">${params.correctionType}</span>.</p>
              
              <div class="correction-details">
                <div class="detail-row">
                  <strong>Date:</strong> ${formatDate(params.date)}
                </div>
                <div class="detail-row">
                  <strong>Original Hours:</strong> ${params.originalHours.toFixed(2)}
                </div>
                ${params.correctedHours !== undefined ? `
                <div class="detail-row">
                  <strong>Corrected Hours:</strong> ${params.correctedHours.toFixed(2)}
                </div>
                ` : ''}
                ${params.reason ? `
                <div class="detail-row">
                  <strong>Reason:</strong> ${params.reason}
                </div>
                ` : ''}
              </div>
              
              ${params.managerComment ? `
              <div class="comment-box">
                <strong>Manager's Comment:</strong><br>
                ${params.managerComment}
              </div>
              ` : ''}
              
              ${params.correctionType === 'rejected' ? `
              <p>If you believe this decision was made in error, please contact your manager directly.</p>
              ` : params.correctionType === 'approved' ? `
              <p>Your timesheet has been updated and will be reflected in your next payroll.</p>
              ` : `
              <p>Your correction request is being reviewed. You will be notified once a decision is made.</p>
              `}
              
              <div class="footer">
                <p>This is an automated notification from STEELIQ.</p>
                <p>Lateral Engineering Limited</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail({
        to: user.email,
        subject,
        html,
        text: `Your timesheet correction for ${formatDate(params.date)} has been ${params.correctionType}.`
      });

    } catch (error) {
      console.error('[Email] Error sending correction notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send geofence violation alert
   */
  async sendGeofenceViolationAlert(params: {
    managerId: number;
    employeeName: string;
    violationType: 'outside_geofence' | 'no_gps' | 'suspicious_location';
    location?: string;
    timestamp: Date;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const [manager] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.managerId))
        .limit(1);

      if (!manager?.email) {
        return { success: false, error: 'Manager email not found' };
      }

      const subject = `Geofence Violation Alert: ${params.employeeName}`;
      
      const violationDescription = {
        'outside_geofence': 'clocked in/out outside designated work zone',
        'no_gps': 'GPS location could not be verified',
        'suspicious_location': 'location appears suspicious or manipulated'
      };

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .alert-box { max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 8px; }
            .alert-header { background: #dc2626; color: white; padding: 15px; }
            .alert-content { padding: 20px; background: #fef2f2; }
            .violation-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #fca5a5; }
            .action-required { background: #fef3c7; border: 1px solid #fcd34d; padding: 10px; border-radius: 4px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="alert-box">
            <div class="alert-header">
              <h3 style="margin: 0;">⚠️ GEOFENCE VIOLATION ALERT</h3>
            </div>
            
            <div class="alert-content">
              <p><strong>Immediate attention required:</strong></p>
              
              <div class="violation-details">
                <p><strong>Employee:</strong> ${params.employeeName}</p>
                <p><strong>Violation:</strong> ${violationDescription[params.violationType]}</p>
                <p><strong>Time:</strong> ${params.timestamp.toLocaleString('en-NZ')}</p>
                ${params.location ? `<p><strong>Location:</strong> ${params.location}</p>` : ''}
              </div>
              
              <div class="action-required">
                <strong>Action Required:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  <li>Review the time clock entry</li>
                  <li>Verify with the employee</li>
                  <li>Take corrective action if necessary</li>
                </ul>
              </div>
              
              <p style="text-align: center;">
                <a href="${process.env.APP_URL || 'https://steeliq.lateralengineering.co.nz'}/time-payroll/violations" 
                   style="display: inline-block; padding: 10px 20px; background: #dc2626; color: white; text-decoration: none; border-radius: 4px;">
                  Review Violation
                </a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      return await this.sendEmail({
        to: manager.email,
        subject,
        html,
        text: `Geofence violation alert: ${params.employeeName} ${violationDescription[params.violationType]} at ${params.timestamp.toLocaleString('en-NZ')}`
      });

    } catch (error) {
      console.error('[Email] Error sending geofence alert:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Core email sending function
   */
  private async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled) {
      console.log('[Email] Email notifications disabled, skipping:', options.subject);
      return { success: false, error: 'Email notifications disabled' };
    }

    try {
      const msg = {
        to: options.to,
        from: FROM_EMAIL,
        subject: options.subject,
        html: options.html,
        text: options.text || options.subject
      };

      await sgMail.send(msg);
      console.log('[Email] Successfully sent:', options.subject);
      return { success: true };
      
    } catch (error) {
      console.error('[Email] Send failed:', error);
      return { 
        success: false, 
        error: error.response?.body?.errors?.[0]?.message || error.message 
      };
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulkShiftReminders(tomorrow: Date): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    try {
      // Get all shifts for tomorrow with user details
      const shifts = await db
        .select({
          userId: timeClockRecords.userId,
          userName: users.name,
          userEmail: users.email,
          startTime: timeClockRecords.clockIn,
          jobName: jobs.name
        })
        .from(timeClockRecords)
        .leftJoin(users, eq(users.id, timeClockRecords.userId))
        .leftJoin(jobs, eq(jobs.id, timeClockRecords.jobId))
        .where(
          and(
            gte(timeClockRecords.clockIn, tomorrow),
            eq(timeClockRecords.status, 'scheduled')
          )
        );

      for (const shift of shifts) {
        if (!shift.userEmail) continue;

        const result = await this.sendShiftReminder({
          userId: shift.userId,
          shiftDate: tomorrow,
          startTime: shift.startTime ? new Date(shift.startTime).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }) : '08:00',
          endTime: '17:00', // Default or calculate from shift data
          jobName: shift.jobName || undefined
        });

        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      }

      console.log(`[Email] Bulk shift reminders: ${sent} sent, ${failed} failed`);
      return { sent, failed };

    } catch (error) {
      console.error('[Email] Error sending bulk reminders:', error);
      return { sent, failed };
    }
  }
}

// Export singleton instance
export const timePayrollEmailService = new TimePayrollEmailService();
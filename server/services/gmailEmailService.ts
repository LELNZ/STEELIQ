import nodemailer from 'nodemailer';
import { timePayrollEmailService } from './timePayrollEmailService';

interface GmailConfig {
  email: string;
  appPassword: string;
}

export class GmailEmailService {
  private transporter: any = null;
  private isConfigured: boolean = false;
  private fromEmail: string = '';

  /**
   * Initialize Gmail SMTP transporter
   */
  async initialize(): Promise<boolean> {
    try {
      const gmailUser = process.env.GMAIL_USER;
      const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

      if (!gmailUser || !gmailAppPassword) {
        console.warn('[Gmail] Gmail credentials not configured');
        return false;
      }

      // Clean the app password - remove any spaces
      const cleanPassword = gmailAppPassword.replace(/\s/g, '');
      
      console.log('[Gmail] Initializing with user:', gmailUser);
      console.log('[Gmail] App password length:', cleanPassword.length, '(should be 16)');

      this.fromEmail = gmailUser;

      // Create transporter with Gmail SMTP settings for Google Workspace
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use TLS
        auth: {
          user: gmailUser,
          pass: cleanPassword // Use cleaned password without spaces
        },
        tls: {
          rejectUnauthorized: true, // Changed to true for production
          minVersion: 'TLSv1.2'
        },
        debug: true, // Enable debug output
        logger: true // Enable logger
      });

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      console.log('[Gmail] Successfully configured Gmail SMTP for Google Workspace');
      return true;

    } catch (error) {
      console.error('[Gmail] Failed to initialize:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Send email via Gmail
   */
  async sendEmail(params: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: any[];
  }): Promise<{ success: boolean; error?: string; messageId?: string }> {
    if (!this.isConfigured) {
      await this.initialize();
    }

    if (!this.isConfigured) {
      return { success: false, error: 'Gmail not configured' };
    }

    try {
      const mailOptions = {
        from: `STEELIQ System <${this.fromEmail}>`,
        to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
        subject: params.subject,
        html: params.html,
        text: params.text || params.subject,
        ...(params.cc && { cc: Array.isArray(params.cc) ? params.cc.join(', ') : params.cc }),
        ...(params.bcc && { bcc: Array.isArray(params.bcc) ? params.bcc.join(', ') : params.bcc }),
        ...(params.attachments && { attachments: params.attachments })
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('[Gmail] Email sent successfully:', info.messageId);
      return { 
        success: true, 
        messageId: info.messageId 
      };

    } catch (error: any) {
      console.error('[Gmail] Send failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send email' 
      };
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(recipientEmail: string): Promise<{ success: boolean; error?: string }> {
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px; }
          .success-badge { background: #10b981; color: white; padding: 10px 20px; border-radius: 6px; display: inline-block; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">✉️ Email System Test</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.95;">STEELIQ Time & Payroll</p>
          </div>
          
          <div class="content">
            <div style="text-align: center;">
              <span class="success-badge">✅ Gmail Integration Successful!</span>
            </div>
            
            <p>This is a test email from your STEELIQ Time & Payroll system to confirm that email notifications are working correctly.</p>
            
            <div class="details">
              <h3 style="margin-top: 0; color: #1e293b;">Email Features Confirmed:</h3>
              <ul style="list-style: none; padding: 0;">
                <li>✅ Gmail SMTP connection established</li>
                <li>✅ HTML email rendering working</li>
                <li>✅ Email delivery successful</li>
                <li>✅ Ready for production notifications</li>
              </ul>
            </div>
            
            <p><strong>Available Notification Types:</strong></p>
            <ul>
              <li>📅 Shift reminders (24 hours before)</li>
              <li>✅ Timesheet approval requests</li>
              <li>📝 Correction notifications (approved/rejected)</li>
              <li>⚠️ Geofence violation alerts</li>
              <li>⏰ Overtime approval requests</li>
            </ul>
            
            <div class="footer">
              <p>This test was sent on ${new Date().toLocaleString('en-NZ')}</p>
              <p>STEELIQ - Lateral Engineering Limited</p>
              <p style="font-size: 10px; margin-top: 10px;">
                Powered by Gmail SMTP Integration
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: recipientEmail,
      subject: 'STEELIQ Email Test - Gmail Integration Working',
      html: testHtml,
      text: 'This is a test email from STEELIQ. Your Gmail integration is working correctly!'
    });
  }
}

// Export singleton instance
export const gmailEmailService = new GmailEmailService();
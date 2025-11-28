import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { TimePayrollEmailService } from './timePayrollEmailService';

/**
 * Google Workspace Email Service
 * Supports both SMTP Relay and traditional SMTP authentication
 */
export class GoogleWorkspaceEmailService {
  private transporter: Mail | null = null;
  private initialized = false;
  private fromEmail = '';
  private relayMode: 'smtp-relay' | 'direct-smtp' = 'smtp-relay';

  /**
   * Initialize Google Workspace SMTP
   * Supports two modes:
   * 1. SMTP Relay (smtp-relay.gmail.com) - for Google Workspace with IP whitelist or SMTP auth
   * 2. Direct SMTP (smtp.gmail.com) - traditional Gmail SMTP with app password
   */
  async initialize(): Promise<boolean> {
    try {
      const user = process.env.GMAIL_USER || process.env.GOOGLE_WORKSPACE_EMAIL;
      const password = process.env.GMAIL_APP_PASSWORD || process.env.GOOGLE_WORKSPACE_PASSWORD;
      const useRelay = process.env.USE_SMTP_RELAY === 'true';
      const requireAuth = process.env.SMTP_RELAY_AUTH === 'true';
      
      if (!user) {
        console.warn('[Google Workspace] No email configured');
        return false;
      }

      this.fromEmail = user;
      this.relayMode = useRelay ? 'smtp-relay' : 'direct-smtp';

      if (useRelay) {
        console.log('[Google Workspace] Configuring SMTP Relay (smtp-relay.gmail.com)');
        
        // SMTP Relay configuration
        // Can work with IP whitelist (no auth) or with SMTP auth
        const config: any = {
          host: 'smtp-relay.gmail.com',
          port: 587, // or 25, 465
          secure: false, // true for 465, false for other ports
          tls: {
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2'
          }
        };

        // Add auth only if required (when not using IP whitelist)
        if (requireAuth && password) {
          config.auth = {
            user: user,
            pass: password
          };
          console.log('[Google Workspace] Using SMTP authentication with relay');
        } else {
          console.log('[Google Workspace] Using IP-based authentication (no credentials)');
        }

        this.transporter = nodemailer.createTransporter(config);
      } else {
        console.log('[Google Workspace] Configuring Direct SMTP (smtp.gmail.com)');
        
        if (!password) {
          console.error('[Google Workspace] Password required for direct SMTP');
          return false;
        }

        // Traditional Gmail SMTP (requires app password or OAuth)
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: user,
            pass: password
          },
          tls: {
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2'
          }
        });
      }

      // Verify connection
      await this.transporter.verify();
      
      this.initialized = true;
      console.log(`[Google Workspace] Successfully configured (${this.relayMode})`);
      return true;
    } catch (error) {
      console.error('[Google Workspace] Failed to initialize:', error);
      return false;
    }
  }

  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
    text?: string,
    options?: {
      cc?: string | string[];
      bcc?: string | string[];
      attachments?: any[];
      replyTo?: string;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.initialized || !this.transporter) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { 
          success: false, 
          error: 'Google Workspace email service not initialized' 
        };
      }
    }

    try {
      const mailOptions: any = {
        from: `STEELIQ Notifications <${this.fromEmail}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text: text || this.htmlToText(html),
        html
      };

      // Add optional fields
      if (options?.cc) {
        mailOptions.cc = Array.isArray(options.cc) ? options.cc.join(', ') : options.cc;
      }
      if (options?.bcc) {
        mailOptions.bcc = Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc;
      }
      if (options?.attachments) {
        mailOptions.attachments = options.attachments;
      }
      if (options?.replyTo) {
        mailOptions.replyTo = options.replyTo;
      }

      const info = await this.transporter!.sendMail(mailOptions);
      
      console.log('[Google Workspace] Email sent successfully:', info.messageId);
      return { 
        success: true, 
        messageId: info.messageId 
      };
    } catch (error: any) {
      console.error('[Google Workspace] Failed to send email:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async sendTimePayrollNotification(
    type: string,
    recipients: string | string[],
    data: any
  ): Promise<{ success: boolean; error?: string }> {
    const service = new TimePayrollEmailService(this);
    return service.sendNotification(type, recipients, data);
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0;">✉️ Google Workspace Email Test</h1>
          <p style="margin: 10px 0 0 0;">STEELIQ Time & Payroll System</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
          <div style="background: #10b981; color: white; padding: 10px 20px; border-radius: 6px; display: inline-block; margin-bottom: 20px;">
            ✅ Email System Working!
          </div>
          
          <h3>Configuration Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li>📧 <strong>Service:</strong> ${this.relayMode === 'smtp-relay' ? 'Google SMTP Relay' : 'Direct SMTP'}</li>
            <li>🏢 <strong>Account:</strong> ${this.fromEmail}</li>
            <li>🔒 <strong>Security:</strong> TLS 1.2+ Encryption</li>
            <li>✅ <strong>Status:</strong> Operational</li>
          </ul>
          
          <p style="margin-top: 20px;">
            <strong>Available Features:</strong>
          </p>
          <ul>
            <li>📅 Shift reminders and notifications</li>
            <li>⏰ Time clock confirmations</li>
            <li>📝 Approval request workflows</li>
            <li>💰 Payroll processing alerts</li>
            <li>⚠️ Compliance and audit notifications</li>
          </ul>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #64748b; font-size: 12px;">
            <p>Test sent on ${new Date().toLocaleString('en-NZ')}</p>
            <p>STEELIQ - Lateral Engineering Limited</p>
            <p style="margin-top: 10px;">Powered by Google Workspace</p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail(
      to,
      '✅ STEELIQ Email System Test - Google Workspace',
      html
    );
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const googleWorkspaceEmailService = new GoogleWorkspaceEmailService();
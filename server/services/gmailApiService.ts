import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

/**
 * Gmail API Service using Service Account with Domain-Wide Delegation
 * Requires setup in Google Cloud Console and Google Workspace Admin Console
 */
export class GmailApiService {
  private gmail: any = null;
  private jwtClient: JWT | null = null;
  private initialized = false;
  private delegatedEmail = '';
  private serviceAccountEmail = '';

  /**
   * Initialize Gmail API with service account authentication
   */
  async initialize(): Promise<boolean> {
    try {
      // Get configuration from environment variables
      const keyFilePath = process.env.GMAIL_SERVICE_ACCOUNT_KEY_PATH;
      const delegatedEmail = process.env.GMAIL_DELEGATED_EMAIL || 'notifications@lateralengineering.co.nz';
      const serviceAccountEmail = process.env.GMAIL_SERVICE_ACCOUNT_EMAIL;

      if (!keyFilePath) {
        console.warn('[Gmail API] No service account key path configured');
        return false;
      }

      if (!delegatedEmail) {
        console.warn('[Gmail API] No delegated email configured');
        return false;
      }

      // Check if key file exists
      const fullPath = path.resolve(keyFilePath);
      if (!fs.existsSync(fullPath)) {
        console.error('[Gmail API] Service account key file not found:', fullPath);
        return false;
      }

      // Read service account key
      const keyFileContent = fs.readFileSync(fullPath, 'utf8');
      const keyData = JSON.parse(keyFileContent);

      this.delegatedEmail = delegatedEmail;
      this.serviceAccountEmail = serviceAccountEmail || keyData.client_email;

      // Create JWT client with domain-wide delegation
      this.jwtClient = new JWT({
        email: keyData.client_email,
        key: keyData.private_key,
        scopes: [
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.compose'
        ],
        subject: delegatedEmail // Impersonate this user
      });

      // Authorize the client
      await this.jwtClient.authorize();

      // Create Gmail API instance
      this.gmail = google.gmail({ 
        version: 'v1', 
        auth: this.jwtClient 
      });

      this.initialized = true;
      console.log('[Gmail API] Successfully initialized');
      console.log('[Gmail API] Service account:', this.serviceAccountEmail);
      console.log('[Gmail API] Delegated user:', this.delegatedEmail);

      return true;
    } catch (error: any) {
      console.error('[Gmail API] Failed to initialize:', error.message);
      
      // Provide detailed error guidance
      if (error.message.includes('invalid_grant')) {
        console.error('[Gmail API] Domain-wide delegation may not be configured properly.');
        console.error('Please ensure:');
        console.error('1. Domain-wide delegation is enabled for the service account');
        console.error('2. Client ID is authorized in Google Workspace Admin Console');
        console.error('3. OAuth scopes match exactly in Admin Console');
        console.error('4. The delegated email exists in your domain');
      } else if (error.message.includes('ENOENT')) {
        console.error('[Gmail API] Service account key file not found at:', process.env.GMAIL_SERVICE_ACCOUNT_KEY_PATH);
      } else if (error.message.includes('Client is unauthorized')) {
        console.error('[Gmail API] Service account is not authorized for domain-wide delegation.');
        console.error('Add the Client ID to Admin Console with required scopes.');
      }
      
      return false;
    }
  }

  /**
   * Send an email using Gmail API
   */
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
    if (!this.initialized || !this.gmail) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { 
          success: false, 
          error: 'Gmail API service not initialized' 
        };
      }
    }

    try {
      // Build email message
      const recipients = Array.isArray(to) ? to : [to];
      const message = this.createMessage(
        this.delegatedEmail,
        recipients,
        subject,
        html,
        text || this.htmlToText(html),
        options
      );

      // Send the email
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: message
        }
      });

      console.log('[Gmail API] Email sent successfully:', response.data.id);
      console.log('[Gmail API] To:', recipients.join(', '));

      return {
        success: true,
        messageId: response.data.id
      };
    } catch (error: any) {
      console.error('[Gmail API] Failed to send email:', error);
      
      // Detailed error handling
      if (error.code === 403) {
        return {
          success: false,
          error: 'Permission denied. Check domain-wide delegation and OAuth scopes.'
        };
      } else if (error.code === 400) {
        return {
          success: false,
          error: 'Invalid request. Check email format and recipients.'
        };
      } else if (error.code === 401) {
        return {
          success: false,
          error: 'Authentication failed. Service account may not be authorized.'
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  /**
   * Create a MIME message for Gmail API
   */
  private createMessage(
    from: string,
    to: string[],
    subject: string,
    html: string,
    text: string,
    options?: any
  ): string {
    const boundary = '----=_Part_' + Math.random().toString(36).substring(2);
    
    // Build headers
    const headers: string[] = [
      'MIME-Version: 1.0',
      `From: STEELIQ Notifications <${from}>`,
      `To: ${to.join(', ')}`,
      `Subject: ${subject}`
    ];

    if (options?.cc) {
      const cc = Array.isArray(options.cc) ? options.cc : [options.cc];
      headers.push(`Cc: ${cc.join(', ')}`);
    }

    if (options?.bcc) {
      const bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
      headers.push(`Bcc: ${bcc.join(', ')}`);
    }

    if (options?.replyTo) {
      headers.push(`Reply-To: ${options.replyTo}`);
    }

    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    // Build message body
    const messageParts: string[] = [
      ...headers,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      text,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      html,
      '',
      `--${boundary}--`
    ];

    const message = messageParts.join('\r\n');
    
    // Encode to base64url
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return encodedMessage;
  }

  /**
   * Send a test email to verify configuration
   */
  async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✉️ Gmail API Successfully Configured!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
            STEELIQ Time & Payroll System
          </p>
        </div>
        
        <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <div style="background: #10b981; color: white; padding: 12px 20px; border-radius: 8px; display: inline-block; margin-bottom: 30px;">
            <strong>✅ Gmail API is Working!</strong>
          </div>
          
          <h3 style="color: #1f2937; margin-top: 0;">Configuration Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                <strong style="color: #6b7280;">📧 Service:</strong>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
                Gmail API with OAuth 2.0
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                <strong style="color: #6b7280;">🔐 Authentication:</strong>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
                Service Account with Domain-wide Delegation
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                <strong style="color: #6b7280;">👤 Delegated User:</strong>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right;">
                ${this.delegatedEmail}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                <strong style="color: #6b7280;">🤖 Service Account:</strong>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; text-align: right; font-size: 14px;">
                ${this.serviceAccountEmail}
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <strong style="color: #6b7280;">✅ Status:</strong>
              </td>
              <td style="padding: 12px 0; text-align: right;">
                <span style="color: #10b981; font-weight: bold;">Operational</span>
              </td>
            </tr>
          </table>
          
          <div style="margin-top: 30px; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <h4 style="color: #1f2937; margin-top: 0;">📋 Enabled Features:</h4>
            <ul style="color: #4b5563; margin: 10px 0;">
              <li>📅 Automated shift reminders and notifications</li>
              <li>⏰ Real-time time clock confirmations</li>
              <li>📝 Manager approval request workflows</li>
              <li>💰 Payroll processing alerts</li>
              <li>⚠️ Fortune 50 compliance notifications</li>
              <li>🔒 Secure audit trail communications</li>
            </ul>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
            <p style="color: #1e40af; margin: 0;">
              <strong>🎉 Success!</strong> Your Gmail API integration is fully configured and ready for production use.
            </p>
          </div>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #9ca3af; font-size: 14px; margin: 5px 0;">
              Test performed on ${new Date().toLocaleString('en-NZ', {
                dateStyle: 'full',
                timeStyle: 'short'
              })}
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin: 5px 0;">
              STEELIQ - Enterprise Steel Fabrication Platform
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin: 10px 0 0 0;">
              © ${new Date().getFullYear()} Lateral Engineering Limited
            </p>
          </div>
        </div>
      </div>
    `;

    return this.sendEmail(
      to,
      '✅ Gmail API Configuration Test - STEELIQ',
      html
    );
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const gmailApiService = new GmailApiService();
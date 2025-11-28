import { formatInTimeZone } from 'date-fns-tz';

interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: Array<{
    type: 'text' | 'currency' | 'date_time';
    text?: string;
  }>;
}

class WhatsAppService {
  private static instance: WhatsAppService;
  private accessToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;
  private apiVersion: string = 'v21.0';
  private baseUrl: string;
  private initialized: boolean = false;
  private timezone = 'Pacific/Auckland';

  private constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    
    if (this.accessToken && this.phoneNumberId) {
      this.initialized = true;
      console.log('[WhatsApp Service] Initialized successfully');
      console.log('[WhatsApp Service] Phone Number ID: ***configured***');
      console.log('[WhatsApp Service] Business Account ID: ***configured***');
    } else {
      console.log('[WhatsApp Service] Missing credentials - service not available');
    }
  }

  static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  isAvailable(): boolean {
    return this.initialized;
  }

  private formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatInTimeZone(dateObj, this.timezone, 'dd/MM/yyyy h:mm a');
  }

  async sendTextMessage(to: string, message: string): Promise<WhatsAppMessageResult> {
    if (!this.initialized) {
      return { success: false, error: 'WhatsApp service not initialized' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(to);
      
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: message
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[WhatsApp] Send failed:', data);
        return { 
          success: false, 
          error: data.error?.message || 'Failed to send message' 
        };
      }

      console.log('[WhatsApp] Message sent successfully:', data);
      return { 
        success: true, 
        messageId: data.messages?.[0]?.id 
      };

    } catch (error: any) {
      console.error('[WhatsApp] Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTemplateMessage(
    to: string, 
    templateName: string, 
    languageCode: string = 'en_US',
    components?: WhatsAppTemplateComponent[]
  ): Promise<WhatsAppMessageResult> {
    if (!this.initialized) {
      return { success: false, error: 'WhatsApp service not initialized' };
    }

    try {
      const formattedPhone = this.formatPhoneNumber(to);
      
      const messageBody: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          }
        }
      };

      if (components && components.length > 0) {
        messageBody.template.components = components;
      }

      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageBody)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('[WhatsApp] Template send failed:', data);
        return { 
          success: false, 
          error: data.error?.message || 'Failed to send template message' 
        };
      }

      console.log('[WhatsApp] Template message sent successfully:', data);
      return { 
        success: true, 
        messageId: data.messages?.[0]?.id 
      };

    } catch (error: any) {
      console.error('[WhatsApp] Error sending template:', error);
      return { success: false, error: error.message };
    }
  }

  async sendNotification(
    to: string,
    category: string,
    subject: string,
    body: string,
    jsonData?: any
  ): Promise<WhatsAppMessageResult> {
    if (!this.initialized) {
      return { success: false, error: 'WhatsApp service not initialized' };
    }

    // Extract recipient name from jsonData or use "Team Member" as default
    const recipientName = jsonData?.recipientName || jsonData?.employeeName || jsonData?.userName || 'Team Member';
    
    // Combine subject and body for the message detail variable
    const messageDetail = body || subject;

    // Map category to STEELIQ template names
    // Templates: steeliq_time_clock, steeliq_payroll, steeliq_approval, steeliq_compliance
    // Each template has {{1}} = name, {{2}} = message detail
    let templateName: string;
    
    switch (category) {
      case 'time_clock':
        templateName = 'steeliq_time_clock';
        break;
      case 'payroll':
        templateName = 'steeliq_payroll';
        break;
      case 'approvals':
        templateName = 'steeliq_approval';
        break;
      case 'compliance':
        templateName = 'steeliq_compliance';
        break;
      default:
        // Default to time_clock for general notifications
        templateName = 'steeliq_time_clock';
    }

    // Build template components with dynamic parameters
    const components: WhatsAppTemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: recipientName },
          { type: 'text', text: messageDetail }
        ]
      }
    ];

    console.log(`[WhatsApp] Sending ${templateName} template to ${to} for ${recipientName}`);
    
    // Use 'en' for template language as Meta templates are configured with 'en' (not 'en_US')
    // Note: If templates were created with 'en_US', change this to 'en_US'
    return this.sendTemplateMessage(to, templateName, 'en_US', components);
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    if (cleaned.startsWith('0')) {
      cleaned = '64' + cleaned.substring(1);
    }
    
    if (!cleaned.match(/^[0-9]{10,15}$/)) {
      console.warn('[WhatsApp] Phone number format may be invalid:', cleaned);
    }
    
    return cleaned;
  }

  async getMessageStatus(messageId: string): Promise<any> {
    if (!this.initialized) {
      return { error: 'WhatsApp service not initialized' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/${messageId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return await response.json();
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async verifyWebhook(mode: string, token: string, challenge: string, verifyToken: string): Promise<string | null> {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp Webhook] Verified successfully');
      return challenge;
    }
    console.warn('[WhatsApp Webhook] Verification failed');
    return null;
  }

  async handleWebhookEvent(body: any): Promise<void> {
    console.log('[WhatsApp Webhook] Received event:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;
            
            if (value.statuses) {
              for (const status of value.statuses) {
                console.log('[WhatsApp] Message status update:', {
                  messageId: status.id,
                  status: status.status,
                  timestamp: status.timestamp,
                  recipientId: status.recipient_id
                });
              }
            }
            
            if (value.messages) {
              for (const message of value.messages) {
                console.log('[WhatsApp] Incoming message:', {
                  from: message.from,
                  type: message.type,
                  timestamp: message.timestamp
                });
              }
            }
          }
        }
      }
    }
  }

  async sendTestMessage(to: string): Promise<WhatsAppMessageResult> {
    // Use the hello_world template for test messages
    // This is required because WhatsApp only allows template messages for first contact
    // Text messages can only be sent within a 24-hour conversation window
    return this.sendTemplateMessage(to, 'hello_world', 'en_US');
  }
}

export default WhatsAppService;

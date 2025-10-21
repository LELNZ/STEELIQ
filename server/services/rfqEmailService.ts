import * as crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import { db } from '../db';
import { rfqRequests, rfqResponses, suppliers, purchaseRequisitions, requisitionItems } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';
import { format } from 'date-fns';
import { getDeliveryTermLabel } from '@shared/constants/deliveryTerms';
import { templateService } from '../templateService';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid initialized successfully');
} else {
  console.error('WARNING: SendGrid API key not found - emails will not be sent');
}

export class RFQEmailService {
  // Email Configuration for RFQs
  // RFQs are sales-related, so they come from and reply to sales@
  // Domain authentication should be set up for both sales@ and accounts@
  
  private fromEmail = process.env.SENDGRID_RFQ_FROM_EMAIL || 'sales@lateralengineering.co.nz';
  private fromName = 'Lateral Engineering Sales';
  private replyToEmail = process.env.SENDGRID_RFQ_REPLY_TO || 'sales@lateralengineering.co.nz';
  private companyName = 'Lateral Engineering Limited';

  async sendRFQToSuppliers(
    rfqId: number,
    supplierIds: number[],
    templateCode?: string
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const results = { sent: 0, failed: 0, errors: [] as string[] };

    try {
      // Get RFQ details
      const [rfq] = await db.select().from(rfqRequests).where(eq(rfqRequests.id, rfqId));
      if (!rfq) throw new Error('RFQ not found');

      // Get requisition and items if linked
      let requisitionDetails = null;
      let requisitionItemsList = [];
      if (rfq.requisitionId) {
        const [requisition] = await db.select().from(purchaseRequisitions)
          .where(eq(purchaseRequisitions.id, rfq.requisitionId));
        requisitionDetails = requisition;
        
        requisitionItemsList = await db.select().from(requisitionItems)
          .where(eq(requisitionItems.requisitionId, rfq.requisitionId));
      }

      // Get suppliers
      const suppliersList = await db.select().from(suppliers)
        .where(inArray(suppliers.id, supplierIds));

      // Send to each supplier
      for (const supplier of suppliersList) {
        try {
          const portalUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'steeliq.replit.app'}/supplier/rfq/${rfqId}?token=${this.generateAccessToken()}`;
          
          const emailContent = await this.generateRFQEmailContent({
            rfq,
            supplier,
            requisitionDetails,
            requisitionItemsList,
            portalUrl,
            templateCode
          });

          const msg = {
            to: supplier.email,
            from: {
              email: this.fromEmail,
              name: this.fromName
            },
            replyTo: this.replyToEmail,
            subject: `RFQ ${rfq.rfqNumber} - ${rfq.title}`,
            html: emailContent,
            // Add tracking settings to improve deliverability
            trackingSettings: {
              clickTracking: { enable: false },
              openTracking: { enable: false },
              subscriptionTracking: { enable: false }
            },
            // Add mail settings for better deliverability
            mailSettings: {
              bypassListManagement: { enable: true },
              sandboxMode: { enable: false }
            }
          };

          if (process.env.SENDGRID_API_KEY) {
            console.log(`Sending RFQ ${rfq.rfqNumber} to ${supplier.name} at ${supplier.email}`);
            console.log(`FROM: ${this.fromEmail}, REPLY-TO: ${this.replyToEmail}`);
            const response = await sgMail.send(msg);
            console.log(`Email sent successfully to ${supplier.email}`, response[0].statusCode);
            results.sent++;
          } else {
            console.error('SendGrid API key not configured');
            throw new Error('SendGrid API key not configured');
          }
        } catch (error: any) {
          console.error(`Failed to send RFQ to ${supplier.email}:`, error);
          results.failed++;
          results.errors.push(`${supplier.name}: ${error.message}`);
        }
      }

      // Update RFQ status
      if (results.sent > 0) {
        await db.update(rfqRequests)
          .set({ 
            status: 'sent',
            sentAt: new Date(),
            invitedSuppliers: supplierIds,
            updatedAt: new Date()
          })
          .where(eq(rfqRequests.id, rfqId));
      }

      return results;
    } catch (error: any) {
      throw new Error(`Failed to send RFQ: ${error.message}`);
    }
  }

  private async generateRFQEmailContent(params: {
    rfq: any;
    supplier: any;
    requisitionDetails: any;
    requisitionItemsList: any[];
    portalUrl: string;
    templateCode?: string;
  }): Promise<string> {
    const { rfq, supplier, requisitionDetails, requisitionItemsList, portalUrl, templateCode } = params;
    
    // Try to use database template first
    try {
      const templateResult = await templateService.getTemplate(
        'RFQ', 
        templateCode || 'RFQ_STANDARD'
      );
      
      if (templateResult) {
        // Map data to match template variables
        const templateData = {
          // Direct RFQ fields for template compatibility
          rfqNumber: rfq.rfqNumber,
          title: rfq.title,
          description: rfq.description,
          responseDeadline: rfq.responseDeadline,
          deliveryRequiredBy: rfq.deliveryRequiredBy,
          deliveryTerms: getDeliveryTermLabel(rfq.deliveryTerms || 'delivery_workshop'),
          paymentTerms: rfq.paymentTerms || 'Net 30',
          specialRequirements: rfq.specialRequirements,
          lineItems: requisitionItemsList || [],
          items: requisitionItemsList || [],
          // Nested objects for advanced templates
          rfq: {
            ...rfq,
            number: rfq.rfqNumber,
            formattedDeadline: rfq.responseDeadline ? format(new Date(rfq.responseDeadline), 'PPP') : 'Not specified',
            formattedDeliveryDate: rfq.deliveryRequiredBy ? format(new Date(rfq.deliveryRequiredBy), 'PPP') : 'As soon as possible'
          },
          supplier: {
            name: supplier.name || supplier.company || 'Valued Supplier',
            company: supplier.company,
            email: supplier.email,
            phone: supplier.phone,
            address: supplier.address
          },
          company: {
            name: this.companyName,
            email: this.fromEmail,
            replyTo: this.replyToEmail
          },
          portalUrl: portalUrl,
          currentDate: new Date().toLocaleDateString('en-NZ'),
          year: new Date().getFullYear()
        };
        
        // Render template with data
        return templateService.renderTemplate(
          templateResult.version.htmlTemplate,
          templateData,
          {
            showLineItems: requisitionItemsList.length > 0,
            showTerms: true,
            showDeliveryDetails: true
          }
        );
      }
    } catch (error) {
      console.error('Error rendering RFQ template, falling back to hardcoded:', error);
    }
    
    // Fallback to hardcoded template
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .deadline { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .items-table th, .items-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          .items-table th { background: #f3f4f6; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .important-note { background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Request for Quote</h1>
            <p style="margin: 0;">RFQ Number: ${rfq.rfqNumber}</p>
          </div>
          
          <div class="content">
            <p>Dear ${supplier.name},</p>
            
            <p>You are invited to submit a quote for the following requirement:</p>
            
            <h2 style="color: #1f2937;">${rfq.title}</h2>
            
            <div class="deadline">
              <strong>⏰ Response Deadline:</strong> ${rfq.responseDeadline ? format(new Date(rfq.responseDeadline), 'PPP') : 'Not specified'}<br>
              <strong>🚚 Delivery Required By:</strong> ${rfq.deliveryRequiredBy ? format(new Date(rfq.deliveryRequiredBy), 'PPP') : 'As soon as possible'}
            </div>

            ${rfq.description ? `
              <h3>Description</h3>
              <p>${rfq.description}</p>
            ` : ''}

            ${requisitionItemsList.length > 0 ? `
              <h3>Required Items</h3>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${requisitionItemsList.map(item => `
                    <tr>
                      <td>${item.description}</td>
                      <td>${item.quantity}</td>
                      <td>${item.unitOfMeasure || 'each'}</td>
                      <td>${item.specialRequirements || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            <h3>Terms & Conditions</h3>
            <ul>
              <li><strong>Delivery Terms:</strong> ${getDeliveryTermLabel(rfq.deliveryTerms || 'delivery_workshop')}</li>
              <li><strong>Payment Terms:</strong> ${rfq.paymentTerms || 'Net 30'}</li>
              ${rfq.specialRequirements ? `<li><strong>Special Requirements:</strong> ${rfq.specialRequirements}</li>` : ''}
            </ul>

            <div class="important-note">
              <strong>📧 Email Deliverability Notice:</strong><br>
              If you're having trouble with our emails going to spam, please add <strong>${this.fromEmail}</strong> to your safe senders list.
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalUrl}" class="button">Submit Your Quote</a>
              <p style="color: #6b7280; font-size: 14px;">
                Click the button above or copy this link:<br>
                <code style="background: #f3f4f6; padding: 5px;">${portalUrl}</code>
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              Please ensure your quote includes:
            </p>
            <ul style="color: #6b7280; font-size: 14px;">
              <li>Item-by-item pricing</li>
              <li>Total amount including all taxes and fees</li>
              <li>Delivery timeline</li>
              <li>Payment terms</li>
              <li>Warranty details (if applicable)</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>This is an automated message from ${this.companyName}</p>
            <p>Please do not reply to this email. Use the portal link to submit your quote.</p>
            <p>For any queries regarding this RFQ, please contact: ${this.replyToEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendRFQReminder(rfqId: number): Promise<void> {
    try {
      const [rfq] = await db.select().from(rfqRequests).where(eq(rfqRequests.id, rfqId));
      if (!rfq || rfq.status !== 'sent') return;

      // Check if deadline is approaching (within 2 days)
      const deadline = rfq.responseDeadline;
      if (!deadline) return;

      const daysUntilDeadline = Math.floor((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilDeadline > 2 || daysUntilDeadline < 0) return;

      // Get suppliers who haven't responded
      const responses = await db.select().from(rfqResponses)
        .where(eq(rfqResponses.rfqId, rfqId));
      const respondedSuppliers = responses.map(r => r.supplierId);

      const pendingSuppliers = rfq.invitedSuppliers?.filter(
        (id: number) => !respondedSuppliers.includes(id)
      ) || [];

      if (pendingSuppliers.length === 0) return;

      // Send reminders
      const suppliersList = await db.select().from(suppliers)
        .where(inArray(suppliers.id, pendingSuppliers));

      for (const supplier of suppliersList) {
        const msg = {
          to: supplier.email,
          from: {
            email: this.fromEmail,
            name: this.fromName
          },
          replyTo: this.replyToEmail,
          subject: `Reminder: RFQ ${rfq.rfqNumber} - Response Due Soon`,
          html: this.generateReminderEmail(rfq, supplier, daysUntilDeadline),
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false }
          }
        };

        if (process.env.SENDGRID_API_KEY) {
          try {
            await sgMail.send(msg);
          } catch (error) {
            console.error(`Failed to send reminder to ${supplier.email}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error sending RFQ reminder:', error);
    }
  }

  private generateReminderEmail(rfq: any, supplier: any, daysRemaining: number): string {
    const portalUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'steeliq.replit.app'}/supplier/rfq/${rfq.id}?token=${this.generateAccessToken()}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #fbbf24; color: #1f2937; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #ef4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .urgent { background: #fee2e2; border: 2px solid #ef4444; padding: 20px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ RFQ Response Reminder</h1>
            <p style="margin: 0; font-size: 18px;">Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining!</p>
          </div>
          
          <div class="content">
            <p>Dear ${supplier.name},</p>
            
            <div class="urgent">
              <strong>This is a reminder that your response for RFQ ${rfq.rfqNumber} is due soon.</strong><br><br>
              <strong>Title:</strong> ${rfq.title}<br>
              <strong>Deadline:</strong> ${format(new Date(rfq.responseDeadline), 'PPP')}
            </div>
            
            <p>We haven't received your quote yet. If you're still interested in this opportunity, please submit your response before the deadline.</p>
            
            <div style="text-align: center;">
              <a href="${portalUrl}" class="button">Submit Quote Now</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              If you're unable to provide a quote, please let us know so we can update our records.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendWinnerNotification(rfqId: number, winningResponseId: number): Promise<void> {
    try {
      const [rfq] = await db.select().from(rfqRequests).where(eq(rfqRequests.id, rfqId));
      const [winningResponse] = await db.select().from(rfqResponses)
        .where(eq(rfqResponses.id, winningResponseId));
      
      if (!rfq || !winningResponse) return;

      const [winner] = await db.select().from(suppliers)
        .where(eq(suppliers.id, winningResponse.supplierId));

      if (!winner) return;

      const msg = {
        to: winner.email,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        replyTo: this.replyToEmail,
        subject: `Congratulations! Your Quote for RFQ ${rfq.rfqNumber} Has Been Selected`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 30px; border-radius: 10px 10px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Congratulations!</h1>
              </div>
              <div class="content">
                <p>Dear ${winner.name},</p>
                <p>Your quote for RFQ ${rfq.rfqNumber} - ${rfq.title} has been selected.</p>
                <p>We will be issuing a Purchase Order shortly with further details.</p>
                <p>Thank you for your competitive quote and prompt response.</p>
                <p>Best regards,<br>${this.companyName}</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                  For any queries regarding this quote selection, please contact: ${this.replyToEmail}
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        trackingSettings: {
          clickTracking: { enable: false },
          openTracking: { enable: false },
          subscriptionTracking: { enable: false }
        }
      };

      if (process.env.SENDGRID_API_KEY) {
        await sgMail.send(msg);
      }
    } catch (error) {
      console.error('Error sending winner notification:', error);
    }
  }

  private generateAccessToken(): string {
    return Buffer.from(
      JSON.stringify({
        timestamp: Date.now(),
        random: crypto.randomBytes(4).toString('hex'),
      })
    ).toString('base64');
  }
}

export const rfqEmailService = new RFQEmailService();

// Standalone function for sending rejection notifications
export async function sendRejectionNotification(params: {
  supplierName: string;
  supplierEmail: string;
  rfqNumber: string;
  rejectionMessage: string;
  companyName: string;
  senderName: string;
  senderRole: string;
}): Promise<void> {
  try {
    const msg = {
      to: params.supplierEmail,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'accounts@lateralengineering.co.nz',
        name: params.companyName
      },
      replyTo: process.env.SENDGRID_REPLY_TO || 'accounts@lateralengineering.co.nz',
      subject: `RFQ ${params.rfqNumber} - Quote Status Update`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #64748b; color: white; padding: 30px; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
            h1 { margin: 0; font-size: 24px; }
            .company-info { margin-top: 10px; font-size: 14px; opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>RFQ Quote Status Update</h1>
              <div class="company-info">${params.companyName}</div>
            </div>
            
            <div class="content">
              <p>Dear ${params.supplierName},</p>
              
              <p>Thank you for submitting your quote for <strong>RFQ ${params.rfqNumber}</strong>.</p>
              
              <div class="message-box">
                <p>${params.rejectionMessage}</p>
              </div>
              
              <p>We appreciate the time and effort you invested in preparing your proposal. While we are unable to proceed with your quote for this particular project, we value our relationship with your company and look forward to future opportunities to work together.</p>
              
              <p>We encourage you to continue participating in our RFQ processes, as each project has unique requirements that may better align with your offerings.</p>
              
              <div class="footer">
                <p>Best regards,</p>
                <p><strong>${params.senderName}</strong><br>
                ${params.senderRole}<br>
                ${params.companyName}</p>
                
                <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                  This is an automated notification. For any queries regarding this decision, please contact us at:<br>
                  ${process.env.SENDGRID_REPLY_TO || 'accounts@lateralengineering.co.nz'}
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
        subscriptionTracking: { enable: false }
      }
    };

    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send(msg);
      console.log(`Rejection notification sent to ${params.supplierEmail} for RFQ ${params.rfqNumber}`);
    } else {
      console.log('SendGrid not configured - rejection email would be sent to:', params.supplierEmail);
    }
  } catch (error) {
    console.error('Error sending rejection notification:', error);
    throw error;
  }
}

// Standalone function for sending acceptance notifications
export async function sendAcceptanceNotification(params: {
  supplierName: string;
  supplierEmail: string;
  rfqNumber: string;
  rfqTitle: string;
  acceptanceMessage: string;
  quoteAmount: number;
  deliveryDays: number;
  companyName: string;
  senderName: string;
  senderRole: string;
}): Promise<void> {
  try {
    // Replace variables in the acceptance message
    const formattedMessage = params.acceptanceMessage
      .replace(/{SUPPLIER_NAME}/g, params.supplierName)
      .replace(/{RFQ_NUMBER}/g, params.rfqNumber)
      .replace(/{RFQ_TITLE}/g, params.rfqTitle)
      .replace(/{QUOTE_AMOUNT}/g, params.quoteAmount.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' }))
      .replace(/{DELIVERY_DAYS}/g, params.deliveryDays.toString())
      .replace(/{DELIVERY_DATE}/g, new Date(Date.now() + params.deliveryDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-NZ'));

    const msg = {
      to: params.supplierEmail,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'accounts@lateralengineering.co.nz',
        name: params.companyName
      },
      replyTo: process.env.SENDGRID_REPLY_TO || 'accounts@lateralengineering.co.nz',
      subject: `🎉 Congratulations! RFQ ${params.rfqNumber} - Your Quote Has Been Selected`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .congrats-icon { font-size: 48px; margin-bottom: 10px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .success-badge { display: inline-block; background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; margin-bottom: 20px; }
            .highlight { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
            .details-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: 600; color: #6b7280; }
            .detail-value { font-weight: bold; color: #111827; }
            .action-required { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 30px; }
            .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            h1 { margin: 10px 0; font-size: 28px; }
            h2 { margin: 5px 0; font-size: 18px; font-weight: normal; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="congrats-icon">🎉</div>
              <h1>Congratulations!</h1>
              <h2>Your Quote Has Been Selected</h2>
            </div>
            
            <div class="content">
              <div class="success-badge">✓ WINNING QUOTE</div>
              
              <p>Dear ${params.supplierName},</p>
              
              <div class="highlight">
                <strong>Great news!</strong> We are pleased to inform you that your quote for <strong>${params.rfqNumber}</strong> has been selected as the winning proposal.
              </div>
              
              <div class="details-box">
                <h3 style="margin-top: 0; color: #111827;">Quote Details</h3>
                <div class="detail-row">
                  <span class="detail-label">RFQ Number:</span>
                  <span class="detail-value">${params.rfqNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Project:</span>
                  <span class="detail-value">${params.rfqTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Your Quote Amount:</span>
                  <span class="detail-value" style="color: #10b981;">${params.quoteAmount.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Delivery Timeline:</span>
                  <span class="detail-value">${params.deliveryDays} days</span>
                </div>
              </div>
              
              <div style="white-space: pre-line; margin: 20px 0; line-height: 1.8;">${formattedMessage}</div>
              
              <div class="action-required">
                <strong>⚡ Next Steps:</strong>
                <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>A formal Purchase Order will be issued within 24-48 hours</li>
                  <li>Please confirm your acceptance of this award</li>
                  <li>Verify stock availability and production schedule</li>
                  <li>Prepare for delivery as per agreed timeline</li>
                </ol>
              </div>
              
              <div class="signature">
                <p>
                  <strong>Thank you for your partnership!</strong><br>
                  We look forward to a successful project completion.
                </p>
                <p>
                  Best regards,<br>
                  <strong>${params.senderName}</strong><br>
                  ${params.senderRole}<br>
                  ${params.companyName}
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from the ${params.companyName} Procurement System.</p>
              <p>For any queries, please contact: ${process.env.SENDGRID_REPLY_TO || 'accounts@lateralengineering.co.nz'}</p>
              <p>© ${new Date().getFullYear()} ${params.companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
        subscriptionTracking: { enable: false }
      }
    };

    if (process.env.SENDGRID_API_KEY) {
      await sgMail.send(msg);
      console.log(`Acceptance notification sent to ${params.supplierEmail} for RFQ ${params.rfqNumber}`);
    } else {
      console.log('SendGrid not configured - acceptance email would be sent to:', params.supplierEmail);
    }
  } catch (error) {
    console.error('Error sending acceptance notification:', error);
    throw error;
  }
}
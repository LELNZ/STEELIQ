import sgMail from '@sendgrid/mail';
import { db } from '../db';
import { rfqRequests, rfqResponses, suppliers, purchaseRequisitions, requisitionItems } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';
import { format } from 'date-fns';
import { getDeliveryTermLabel } from '@shared/constants/deliveryTerms';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid initialized successfully');
} else {
  console.error('WARNING: SendGrid API key not found - emails will not be sent');
}

export class RFQEmailService {
  private fromEmail = 'accounts@lateralengineering.co.nz';
  private companyName = 'Lateral Engineering Limited';

  async sendRFQToSuppliers(
    rfqId: number,
    supplierIds: number[]
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
          
          const emailContent = this.generateRFQEmailContent({
            rfq,
            supplier,
            requisitionDetails,
            requisitionItemsList,
            portalUrl
          });

          const msg = {
            to: supplier.email,
            from: this.fromEmail,
            subject: `RFQ ${rfq.rfqNumber} - ${rfq.title}`,
            html: emailContent,
          };

          if (process.env.SENDGRID_API_KEY) {
            console.log(`Sending RFQ ${rfq.rfqNumber} to ${supplier.name} at ${supplier.email}`);
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

  private generateRFQEmailContent(params: {
    rfq: any;
    supplier: any;
    requisitionDetails: any;
    requisitionItemsList: any[];
    portalUrl: string;
  }): string {
    const { rfq, supplier, requisitionDetails, requisitionItemsList, portalUrl } = params;
    
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
      const suppliers = await db.select().from(suppliers)
        .where(inArray(suppliers.id, pendingSuppliers));

      for (const supplier of suppliers) {
        const msg = {
          to: supplier.email,
          from: this.fromEmail,
          subject: `Reminder: RFQ ${rfq.rfqNumber} - Response Due Soon`,
          html: this.generateReminderEmail(rfq, supplier, daysUntilDeadline),
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
        from: this.fromEmail,
        subject: `Congratulations! Your Quote for RFQ ${rfq.rfqNumber} Has Been Selected`,
        html: `
          <h2>Congratulations!</h2>
          <p>Your quote for RFQ ${rfq.rfqNumber} - ${rfq.title} has been selected.</p>
          <p>We will be issuing a Purchase Order shortly with further details.</p>
          <p>Thank you for your competitive quote and prompt response.</p>
        `,
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
        random: Math.random().toString(36).substring(7),
      })
    ).toString('base64');
  }
}

export const rfqEmailService = new RFQEmailService();
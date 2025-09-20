import sgMail from '@sendgrid/mail';
import { pdfGenerationService } from './pdfGenerationService';
import { templateHierarchyService } from './templateHierarchyService';
import { db } from '../db';
import { sql, inArray } from 'drizzle-orm';
import { 
  purchaseOrders, 
  suppliers, 
  rfqRequests,
  quotes,
  organizationSettings,
  communicationTemplates,
  templateVersions
} from '@shared/schema';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY not configured - email sending will be disabled');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface EmailAttachment {
  content: string; // Base64 encoded content
  filename: string;
  type: string;
  disposition: 'attachment' | 'inline';
}

interface SendEmailParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from: string;
  replyTo?: string;
  subject: string;
  text?: string;
  html: string;
  attachments?: EmailAttachment[];
}

export class IntegratedEmailService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!SENDGRID_API_KEY;
  }

  /**
   * Send Purchase Order using template system
   */
  async sendPurchaseOrder(params: {
    purchaseOrderId: number;
    to: string | string[];
    cc?: string | string[];
    templateCode?: string;
    customMessage?: string;
    contentOptions?: Record<string, boolean>; // Added for granular content control
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Fetch PO data with all relations
      const [poData] = await db
        .select({
          po: purchaseOrders,
          supplier: suppliers
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, sql`${suppliers.id} = ${purchaseOrders.supplierId}`)
        .where(sql`${purchaseOrders.id} = ${params.purchaseOrderId}`)
        .limit(1);

      if (!poData) {
        throw new Error('Purchase order not found');
      }

      // Get organization branding
      const branding = await templateHierarchyService.getOrganizationBranding();
      
      // Prepare template data
      const templateData = {
        supplier: {
          name: poData.supplier?.name || '',
          company: poData.supplier?.company || '',
          address: poData.supplier?.address || '',
          email: poData.supplier?.email || '',
          phone: poData.supplier?.phone || '',
          contact: poData.supplier?.accountManager || ''
        },
        po: {
          number: poData.po.poNumber,
          date: poData.po.orderDate,
          deliveryDate: poData.po.deliveryDate,
          paymentTerms: poData.po.paymentTerms || 'Net 30',
          jobName: poData.po.jobName,
          jobNumber: poData.po.jobNumber,
          reference: poData.po.supplierReference,
          status: poData.po.status,
          subtotal: poData.po.subtotal || 0,
          gst: poData.po.gst || 0,
          total: poData.po.totalAmount || 0,
          currency: poData.po.currency || 'NZD',
          notes: poData.po.specialInstructions,
          terms: poData.po.termsAndConditions,
          authorizedBy: poData.po.approvedBy || 'Procurement Manager',
          showPrices: true,
          showGst: true
        },
        items: poData.po.lineItems || [],
        customMessage: params.customMessage
      };

      // Generate PDF using template system with content options
      const pdfBuffer = await pdfGenerationService.generatePDF({
        templateType: 'PO',
        templateCode: params.templateCode,
        supplierId: poData.supplier?.id,
        data: templateData,
        contentOptions: params.contentOptions // Pass granular content controls
      });
      
      // Validate PDF buffer
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF generation failed - empty buffer');
      }
      console.log('Generated PDF buffer size:', pdfBuffer.length, 'bytes');

      // Get email template
      const [emailTemplate] = await db
        .select({
          subject: templateVersions.subjectTemplate,
          htmlTemplate: templateVersions.htmlTemplate
        })
        .from(communicationTemplates)
        .leftJoin(templateVersions, sql`${templateVersions.id} = ${communicationTemplates.currentVersionId}`)
        .where(sql`${communicationTemplates.type} = 'PO' AND ${communicationTemplates.category} = 'Email'`)
        .limit(1);

      // Prepare email
      const emailSubject = emailTemplate?.subject 
        ? this.interpolateTemplate(emailTemplate.subject, templateData)
        : `Purchase Order ${poData.po.poNumber} - ${poData.supplier?.company || 'Your Company'}`;

      const emailHtml = params.customMessage 
        ? `<div>${params.customMessage}</div><hr/><p>Please find the attached Purchase Order.</p>`
        : emailTemplate?.htmlTemplate
        ? this.interpolateTemplate(emailTemplate.htmlTemplate, templateData)
        : this.getDefaultPOEmailHtml(templateData);

      // Send email with attachment
      const result = await this.sendEmail({
        to: params.to,
        cc: params.cc,
        from: branding?.email || 'accounts@lateralengineering.co.nz',
        replyTo: branding?.email || 'accounts@lateralengineering.co.nz',
        subject: emailSubject,
        html: emailHtml,
        attachments: [{
          content: pdfBuffer.toString('base64'),
          filename: `PO-${poData.po.poNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      });
      
      // Return result and include HTML for tracking
      return {
        ...result,
        html: emailHtml
      };

    } catch (error) {
      console.error('Error sending purchase order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send RFQ using template system
   */
  async sendRFQ(params: {
    rfqId: number;
    supplierIds: number[];
    templateCode?: string;
    customMessage?: string;
  }): Promise<{ success: boolean; results: any[] }> {
    try {
      // Fetch RFQ data
      const [rfqData] = await db
        .select()
        .from(rfqRequests)
        .where(sql`${rfqRequests.id} = ${params.rfqId}`)
        .limit(1);

      if (!rfqData) {
        throw new Error('RFQ not found');
      }

      // Get suppliers - validate and parse supplier IDs first
      const validSupplierIds = params.supplierIds
        .map(id => parseInt(id.toString(), 10))
        .filter(id => !isNaN(id) && id > 0);
      
      if (validSupplierIds.length === 0) {
        return { 
          success: false, 
          results: [], 
          error: 'No valid supplier IDs provided' 
        };
      }

      const suppliersList = await db
        .select()
        .from(suppliers)
        .where(inArray(suppliers.id, validSupplierIds));

      const branding = await templateHierarchyService.getOrganizationBranding();
      const results = [];

      // Send to each supplier
      for (const supplier of suppliersList) {
        try {
          const templateData = {
            supplier: {
              name: supplier.name,
              company: supplier.company,
              address: supplier.address,
              email: supplier.email,
              phone: supplier.phone,
              contact: supplier.accountManager
            },
            rfq: {
              number: rfqData.rfqNumber,
              date: rfqData.createdAt,
              dueDate: rfqData.quoteDueDate,
              deliveryDate: rfqData.deliveryDate,
              jobName: rfqData.jobName,
              jobNumber: rfqData.jobNumber,
              priority: rfqData.priority,
              instructions: rfqData.specialInstructions,
              contactPerson: 'Procurement Team',
              contactEmail: branding?.email || 'accounts@lateralengineering.co.nz',
              contactPhone: branding?.phone || ''
            },
            items: rfqData.items || [],
            customMessage: params.customMessage
          };

          // Generate PDF
          const pdfBuffer = await pdfGenerationService.generatePDF({
            templateType: 'RFQ',
            templateCode: params.templateCode,
            supplierId: supplier.id,
            data: templateData
          });

          // Get email template
          const [emailTemplate] = await db
            .select({
              subject: templateVersions.subjectTemplate,
              htmlTemplate: templateVersions.htmlTemplate
            })
            .from(communicationTemplates)
            .leftJoin(templateVersions, sql`${templateVersions.id} = ${communicationTemplates.currentVersionId}`)
            .where(sql`${communicationTemplates.type} = 'RFQ' AND ${communicationTemplates.category} = 'Email'`)
            .limit(1);

          const emailSubject = emailTemplate?.subject 
            ? this.interpolateTemplate(emailTemplate.subject, templateData)
            : `Request for Quote ${rfqData.rfqNumber} - ${rfqData.jobName}`;

          const emailHtml = params.customMessage 
            ? `<div>${params.customMessage}</div><hr/><p>Please find the attached RFQ document.</p>`
            : emailTemplate?.htmlTemplate
            ? this.interpolateTemplate(emailTemplate.htmlTemplate, templateData)
            : this.getDefaultRFQEmailHtml(templateData);

          const result = await this.sendEmail({
            to: supplier.email,
            from: branding?.email || 'accounts@lateralengineering.co.nz',
            subject: emailSubject,
            html: emailHtml,
            attachments: [{
              content: pdfBuffer.toString('base64'),
              filename: `RFQ-${rfqData.rfqNumber}-${supplier.company}.pdf`,
              type: 'application/pdf',
              disposition: 'attachment'
            }]
          });

          results.push({
            supplierId: supplier.id,
            supplierName: supplier.company,
            ...result
          });
        } catch (error) {
          results.push({
            supplierId: supplier.id,
            supplierName: supplier.company,
            success: false,
            error: error.message
          });
        }
      }

      return { success: true, results };

    } catch (error) {
      console.error('Error sending RFQ:', error);
      return { success: false, results: [], error: error.message };
    }
  }

  /**
   * Send Quote using template system
   */
  async sendQuote(params: {
    quoteId: number;
    to: string | string[];
    cc?: string | string[];
    templateCode?: string;
    customMessage?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Fetch quote data
      const [quoteData] = await db
        .select()
        .from(quotes)
        .where(sql`${quotes.id} = ${params.quoteId}`)
        .limit(1);

      if (!quoteData) {
        throw new Error('Quote not found');
      }

      const branding = await templateHierarchyService.getOrganizationBranding();
      
      const templateData = {
        client: {
          name: quoteData.clientName,
          company: quoteData.clientCompany || quoteData.clientName,
          address: quoteData.clientAddress || '',
          email: quoteData.clientEmail || '',
          phone: quoteData.clientPhone || '',
          contact: quoteData.clientContact || ''
        },
        quote: {
          number: quoteData.quoteNumber,
          date: quoteData.createdAt,
          validUntil: quoteData.validUntil,
          jobName: quoteData.jobName,
          jobNumber: quoteData.jobNumber,
          subtotal: quoteData.subtotal || 0,
          gst: quoteData.gst || 0,
          total: quoteData.totalAmount || 0,
          currency: 'NZD',
          paymentTerms: quoteData.paymentTerms || 'Net 30',
          deliveryTerms: quoteData.deliveryTerms || 'Ex Works',
          notes: quoteData.notes,
          terms: quoteData.termsAndConditions,
          preparedBy: quoteData.preparedBy || 'Sales Team',
          approvedBy: quoteData.approvedBy || 'Sales Manager'
        },
        items: quoteData.lineItems || [],
        customMessage: params.customMessage
      };

      // Generate PDF
      const pdfBuffer = await pdfGenerationService.generatePDF({
        templateType: 'QUOTE',
        templateCode: params.templateCode,
        clientId: quoteData.clientId,
        data: templateData
      });

      // Get email template
      const [emailTemplate] = await db
        .select({
          subject: templateVersions.subjectTemplate,
          htmlTemplate: templateVersions.htmlTemplate
        })
        .from(communicationTemplates)
        .leftJoin(templateVersions, sql`${templateVersions.id} = ${communicationTemplates.currentVersionId}`)
        .where(sql`${communicationTemplates.type} = 'QUOTE' AND ${communicationTemplates.category} = 'Email'`)
        .limit(1);

      const emailSubject = emailTemplate?.subject 
        ? this.interpolateTemplate(emailTemplate.subject, templateData)
        : `Quote ${quoteData.quoteNumber} - ${quoteData.jobName}`;

      const emailHtml = params.customMessage 
        ? `<div>${params.customMessage}</div><hr/><p>Please find the attached quotation.</p>`
        : emailTemplate?.htmlTemplate
        ? this.interpolateTemplate(emailTemplate.htmlTemplate, templateData)
        : this.getDefaultQuoteEmailHtml(templateData);

      return this.sendEmail({
        to: params.to,
        cc: params.cc,
        from: branding?.email || 'accounts@lateralengineering.co.nz',
        subject: emailSubject,
        html: emailHtml,
        attachments: [{
          content: pdfBuffer.toString('base64'),
          filename: `Quote-${quoteData.quoteNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      });

    } catch (error) {
      console.error('Error sending quote:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Core email sending function
   */
  private async sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      console.error('SendGrid not configured - skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    // Test mode
    if (process.env.EMAIL_TEST_MODE === 'true') {
      console.log('TEST MODE: Email would be sent to:', params.to);
      console.log('Subject:', params.subject);
      return { 
        success: true, 
        messageId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
    }

    try {
      // Validate and sanitize email addresses
      const sanitizeEmail = (email: string | string[]): string | string[] => {
        if (Array.isArray(email)) {
          return email.filter(e => e && e.includes('@')).map(e => e.trim());
        }
        return email?.trim() || '';
      };

      // Ensure we have valid from and to addresses
      const fromAddress = params.from || 'accounts@lateralengineering.co.nz';
      const toAddresses = sanitizeEmail(params.to);
      
      if (!toAddresses || (Array.isArray(toAddresses) && toAddresses.length === 0)) {
        throw new Error('No valid recipient email addresses provided');
      }

      const msg: any = {
        to: toAddresses,
        from: fromAddress,
        subject: params.subject || 'No Subject',
        text: params.text || params.subject || 'Please see the attached document.',
        html: params.html || '<p>Please see the attached document.</p>',
      };

      if (params.cc) {
        const ccAddresses = sanitizeEmail(params.cc);
        if (ccAddresses && (!Array.isArray(ccAddresses) || ccAddresses.length > 0)) {
          msg.cc = ccAddresses;
        }
      }
      
      if (params.bcc) {
        const bccAddresses = sanitizeEmail(params.bcc);
        if (bccAddresses && (!Array.isArray(bccAddresses) || bccAddresses.length > 0)) {
          msg.bcc = bccAddresses;
        }
      }
      
      if (params.replyTo) msg.replyTo = params.replyTo;
      if (params.attachments && params.attachments.length > 0) {
        msg.attachments = params.attachments;
      }

      // Log the message structure for debugging (without sensitive content)
      console.log('Sending email with structure:', {
        to: msg.to,
        from: msg.from,
        subject: msg.subject,
        hasHtml: !!msg.html,
        hasAttachments: !!msg.attachments?.length,
        cc: msg.cc,
        bcc: msg.bcc
      });

      const [response] = await sgMail.send(msg);
      
      return { 
        success: true, 
        messageId: response.headers['x-message-id'] 
      };
    } catch (error: any) {
      console.error('SendGrid error:', error);
      
      // Log detailed error information for debugging
      if (error.response?.body?.errors) {
        console.error('SendGrid error details:', JSON.stringify(error.response.body.errors, null, 2));
      }
      
      // Extract meaningful error message
      let errorMessage = 'Failed to send email';
      if (error.response?.body?.errors?.[0]?.message) {
        errorMessage = error.response.body.errors[0].message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  /**
   * Interpolate template with data
   */
  private interpolateTemplate(template: string, data: any): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.');
      let value = data;
      for (const key of keys) {
        value = value?.[key];
      }
      return value !== undefined ? String(value) : match;
    });
  }

  // Default email HTML templates
  private getDefaultPOEmailHtml(data: any): string {
    const formatDate = (date: any) => {
      if (!date) return 'As per agreement';
      const d = new Date(date);
      return d.toLocaleDateString('en-NZ', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    };
    
    const formatCurrency = (amount: any) => {
      return Number(amount || 0).toLocaleString('en-NZ', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    };
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            background: #fff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
            border-radius: 0 0 10px 10px;
          }
          .details {
            background-color: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .attachment-notice {
            background-color: #fef3c7;
            border: 1px solid #fcd34d;
            color: #92400e;
            padding: 12px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>Purchase Order ${data.po.number}</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.95;">Lateral Engineering Limited</p>
          </div>
          
          <div class="content">
            <p>Dear ${data.supplier.company || data.supplier.name || 'Valued Supplier'},</p>
            
            <p>We are pleased to submit <strong>Purchase Order ${data.po.number}</strong> for your review and acknowledgment.</p>
            
            <div class="details">
              <div class="detail-row">
                <span><strong>Order Date:</strong></span>
                <span>${formatDate(data.po.date)}</span>
              </div>
              <div class="detail-row">
                <span><strong>Delivery Required:</strong></span>
                <span>${formatDate(data.po.deliveryDate)}</span>
              </div>
              ${data.po.jobNumber ? `
              <div class="detail-row">
                <span><strong>Project:</strong></span>
                <span>${data.po.jobNumber} - ${data.po.jobName || ''}</span>
              </div>
              ` : ''}
              <div class="detail-row">
                <span><strong>Total Amount:</strong></span>
                <span style="font-size: 18px; color: #667eea;">
                  ${data.po.currency || 'NZD'} $${formatCurrency(data.po.total)}
                </span>
              </div>
            </div>
            
            <div class="attachment-notice">
              <strong>📎 Purchase Order Attached</strong><br>
              Please review the attached PDF for complete order details, terms, and conditions.
            </div>
            
            ${data.customMessage ? `<p>${data.customMessage}</p>` : ''}
            
            <p>Please acknowledge receipt of this purchase order at your earliest convenience.</p>
            
            <div class="footer">
              <p>Best regards,<br>
              <strong>Procurement Team</strong><br>
              Lateral Engineering Limited</p>
              
              <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                📧 accounts@lateralengineering.co.nz<br>
                📍 Auckland, New Zealand
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getDefaultRFQEmailHtml(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Request for Quote ${data.rfq.number}</h2>
        <p>Dear ${data.supplier.company || 'Supplier'},</p>
        <p>We would like to request a quote for the items/services detailed in the attached RFQ document.</p>
        ${data.customMessage ? `<p>${data.customMessage}</p>` : ''}
        <p><strong>Key Details:</strong></p>
        <ul>
          <li>RFQ Number: ${data.rfq.number}</li>
          <li>Project: ${data.rfq.jobName}</li>
          <li>Quote Due Date: ${new Date(data.rfq.dueDate).toLocaleDateString()}</li>
          ${data.rfq.deliveryDate ? `<li>Required Delivery: ${new Date(data.rfq.deliveryDate).toLocaleDateString()}</li>` : ''}
        </ul>
        <p>Please submit your quote by the due date to be considered.</p>
        <p>Best regards,<br>Procurement Team<br>Lateral Engineering Limited</p>
      </div>
    `;
  }

  private getDefaultQuoteEmailHtml(data: any): string {
    return `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Quotation ${data.quote.number}</h2>
        <p>Dear ${data.client.name || 'Customer'},</p>
        <p>Thank you for your interest. Please find attached our quotation for ${data.quote.jobName}.</p>
        ${data.customMessage ? `<p>${data.customMessage}</p>` : ''}
        <p><strong>Quote Summary:</strong></p>
        <ul>
          <li>Quote Number: ${data.quote.number}</li>
          <li>Project: ${data.quote.jobName}</li>
          <li>Total Amount: $${data.quote.total.toFixed(2)} ${data.quote.currency}</li>
          <li>Valid Until: ${new Date(data.quote.validUntil).toLocaleDateString()}</li>
        </ul>
        <p>Please don't hesitate to contact us if you have any questions.</p>
        <p>Best regards,<br>Sales Team<br>Lateral Engineering Limited</p>
      </div>
    `;
  }
}

// Export singleton instance
export const integratedEmailService = new IntegratedEmailService();
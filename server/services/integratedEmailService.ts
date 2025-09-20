import sgMail from '@sendgrid/mail';
import { pdfGenerationService } from './pdfGenerationService';
import { templateHierarchyService } from './templateHierarchyService';
import { db } from '../db';
import { sql, inArray } from 'drizzle-orm';
import { 
  purchaseOrders, 
  suppliers, 
  rfqs,
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

      // Generate PDF using template system
      const pdfBuffer = await pdfGenerationService.generatePDF({
        templateType: 'PO',
        templateCode: params.templateCode,
        supplierId: poData.supplier?.id,
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
      return this.sendEmail({
        to: params.to,
        cc: params.cc,
        from: branding?.email || 'accounts@lateralengineering.co.nz',
        subject: emailSubject,
        html: emailHtml,
        attachments: [{
          content: pdfBuffer.toString('base64'),
          filename: `PO-${poData.po.poNumber}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }]
      });

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
        .from(rfqs)
        .where(sql`${rfqs.id} = ${params.rfqId}`)
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
      const msg: any = {
        to: params.to,
        from: params.from,
        subject: params.subject,
        text: params.text || params.subject,
        html: params.html,
      };

      if (params.cc) msg.cc = params.cc;
      if (params.bcc) msg.bcc = params.bcc;
      if (params.replyTo) msg.replyTo = params.replyTo;
      if (params.attachments) msg.attachments = params.attachments;

      const [response] = await sgMail.send(msg);
      
      return { 
        success: true, 
        messageId: response.headers['x-message-id'] 
      };
    } catch (error: any) {
      console.error('SendGrid error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send email' 
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
    return `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Purchase Order ${data.po.number}</h2>
        <p>Dear ${data.supplier.company || 'Supplier'},</p>
        <p>Please find attached Purchase Order ${data.po.number} for ${data.po.jobName || 'your reference'}.</p>
        ${data.customMessage ? `<p>${data.customMessage}</p>` : ''}
        <p><strong>Key Details:</strong></p>
        <ul>
          <li>PO Number: ${data.po.number}</li>
          <li>Date: ${new Date(data.po.date).toLocaleDateString()}</li>
          ${data.po.deliveryDate ? `<li>Required Delivery: ${new Date(data.po.deliveryDate).toLocaleDateString()}</li>` : ''}
          <li>Total Amount: $${data.po.total.toFixed(2)} ${data.po.currency}</li>
        </ul>
        <p>Please acknowledge receipt of this purchase order.</p>
        <p>Best regards,<br>Procurement Team<br>Lateral Engineering Limited</p>
      </div>
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
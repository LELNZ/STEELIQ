import { db } from '../db';
import { sql } from 'drizzle-orm';
import { communicationTemplates, templateVersions } from '@shared/schema';

export const emailTemplatesService = {
  /**
   * Create email templates for all document types
   */
  async createEmailTemplates() {
    const emailTemplates = [
      // PO Email Template
      {
        code: 'PO_EMAIL',
        name: 'Purchase Order Email',
        type: 'PO',
        category: 'Email',
        subCategory: 'standard',
        description: 'Email template for sending purchase orders',
        isDefault: true,
        status: 'published',
        theme: {},
        sections: {},
        variables: {},
        defaultOptions: {},
        subjectTemplate: 'Purchase Order {{po.number}} - {{supplier.company}}',
        htmlTemplate: `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1e3a8a;">Purchase Order {{po.number}}</h2>
  <p>Dear {{supplier.name}},</p>
  <p>Please find attached Purchase Order <strong>{{po.number}}</strong> for {{po.jobName}}.</p>
  {{#if customMessage}}
  <div style="background: #f0f9ff; padding: 15px; border-left: 4px solid #1e3a8a; margin: 20px 0;">
    {{customMessage}}
  </div>
  {{/if}}
  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1e3a8a;">Order Details:</h3>
    <table style="width: 100%; border: none;">
      <tr><td style="padding: 5px 0;"><strong>PO Number:</strong></td><td>{{po.number}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Date:</strong></td><td>{{formatDate po.date}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Required By:</strong></td><td>{{formatDate po.deliveryDate}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Total Amount:</strong></td><td>{{formatCurrency po.total}} {{po.currency}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Payment Terms:</strong></td><td>{{po.paymentTerms}}</td></tr>
    </table>
  </div>
  <p><strong>Please acknowledge receipt of this purchase order at your earliest convenience.</strong></p>
  <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    <strong>{{organization.name}}</strong><br>
    {{organization.address}}<br>
    Phone: {{organization.phone}} | Email: {{organization.email}}<br>
    {{#if organization.website}}Website: {{organization.website}}{{/if}}
  </p>
</div>`
      },

      // RFQ Email Template
      {
        code: 'RFQ_EMAIL',
        name: 'RFQ Email',
        type: 'RFQ',
        category: 'Email',
        subCategory: 'standard',
        description: 'Email template for sending RFQs',
        isDefault: true,
        status: 'published',
        theme: {},
        sections: {},
        variables: {},
        defaultOptions: {},
        subjectTemplate: 'Request for Quote {{rfq.number}} - {{rfq.jobName}}',
        htmlTemplate: `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #7c3aed;">Request for Quote - {{rfq.number}}</h2>
  <p>Dear {{supplier.name}},</p>
  <p>We would like to invite you to submit a quote for <strong>{{rfq.jobName}}</strong>.</p>
  {{#if customMessage}}
  <div style="background: #faf5ff; padding: 15px; border-left: 4px solid #7c3aed; margin: 20px 0;">
    {{customMessage}}
  </div>
  {{/if}}
  <div style="background: #fffbeb; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #fbbf24;">
    <h3 style="margin-top: 0; color: #92400e;">Important Dates:</h3>
    <ul style="margin: 0; padding-left: 20px;">
      <li><strong>Quote Due Date:</strong> {{formatDate rfq.dueDate}}</li>
      <li><strong>Required Delivery:</strong> {{formatDate rfq.deliveryDate}}</li>
    </ul>
  </div>
  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #7c3aed;">RFQ Details:</h3>
    <table style="width: 100%; border: none;">
      <tr><td style="padding: 5px 0;"><strong>RFQ Number:</strong></td><td>{{rfq.number}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Project:</strong></td><td>{{rfq.jobName}}</td></tr>
      {{#if rfq.priority}}<tr><td style="padding: 5px 0;"><strong>Priority:</strong></td><td>{{rfq.priority}}</td></tr>{{/if}}
    </table>
  </div>
  <p>Please review the attached RFQ document for complete specifications and requirements.</p>
  <p><strong>To submit your quote, please respond by the due date with your pricing and terms.</strong></p>
  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    <strong>{{organization.name}}</strong><br>
    Procurement Department<br>
    Email: {{rfq.contactEmail}} | Phone: {{rfq.contactPhone}}<br>
  </p>
</div>`
      },

      // Quote Email Template
      {
        code: 'QUOTE_EMAIL',
        name: 'Quote Email',
        type: 'QUOTE',
        category: 'Email',
        subCategory: 'standard',
        description: 'Email template for sending quotes',
        isDefault: true,
        status: 'published',
        theme: {},
        sections: {},
        variables: {},
        defaultOptions: {},
        subjectTemplate: 'Quotation {{quote.number}} - {{quote.jobName}}',
        htmlTemplate: `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1e40af;">Quotation {{quote.number}}</h2>
  <p>Dear {{client.name}},</p>
  <p>Thank you for your interest in our services. We are pleased to provide our quotation for <strong>{{quote.jobName}}</strong>.</p>
  {{#if customMessage}}
  <div style="background: #eff6ff; padding: 15px; border-left: 4px solid #1e40af; margin: 20px 0;">
    {{customMessage}}
  </div>
  {{/if}}
  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1e40af;">Quote Summary:</h3>
    <table style="width: 100%; border: none;">
      <tr><td style="padding: 5px 0;"><strong>Quote Number:</strong></td><td>{{quote.number}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Project:</strong></td><td>{{quote.jobName}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Total Amount:</strong></td><td style="font-size: 18px; color: #1e40af;"><strong>{{formatCurrency quote.total}} {{quote.currency}}</strong></td></tr>
      <tr><td style="padding: 5px 0;"><strong>Valid Until:</strong></td><td>{{formatDate quote.validUntil}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Payment Terms:</strong></td><td>{{quote.paymentTerms}}</td></tr>
    </table>
  </div>
  <p>Please review the attached quotation document for complete details, specifications, and terms.</p>
  <p><strong>To accept this quote, please contact us before the expiry date.</strong></p>
  <p>We look forward to the opportunity to work with you on this project.</p>
  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    <strong>{{organization.name}}</strong><br>
    {{organization.address}}<br>
    Phone: {{organization.phone}} | Email: {{organization.email}}<br>
    {{#if organization.website}}Website: {{organization.website}}{{/if}}
  </p>
</div>`
      },

      // Invoice Email Template
      {
        code: 'INVOICE_EMAIL',
        name: 'Invoice Email',
        type: 'INVOICE',
        category: 'Email',
        subCategory: 'standard',
        description: 'Email template for sending invoices',
        isDefault: true,
        status: 'published',
        theme: {},
        sections: {},
        variables: {},
        defaultOptions: {},
        subjectTemplate: 'Invoice {{invoice.number}} - {{client.company}}',
        htmlTemplate: `
<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1e40af;">Invoice {{invoice.number}}</h2>
  <p>Dear {{client.name}},</p>
  <p>Please find attached invoice <strong>{{invoice.number}}</strong> for your recent order.</p>
  {{#if customMessage}}
  <div style="background: #eff6ff; padding: 15px; border-left: 4px solid #1e40af; margin: 20px 0;">
    {{customMessage}}
  </div>
  {{/if}}
  <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1e40af;">Invoice Summary:</h3>
    <table style="width: 100%; border: none;">
      <tr><td style="padding: 5px 0;"><strong>Invoice Number:</strong></td><td>{{invoice.number}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Invoice Date:</strong></td><td>{{formatDate invoice.date}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Due Date:</strong></td><td style="color: #dc2626;"><strong>{{formatDate invoice.dueDate}}</strong></td></tr>
      <tr><td style="padding: 5px 0;"><strong>Total Amount:</strong></td><td style="font-size: 18px; color: #1e40af;"><strong>{{formatCurrency invoice.total}} {{invoice.currency}}</strong></td></tr>
      {{#if invoice.balanceDue}}<tr><td style="padding: 5px 0;"><strong>Balance Due:</strong></td><td style="color: #dc2626;"><strong>{{formatCurrency invoice.balanceDue}}</strong></td></tr>{{/if}}
    </table>
  </div>
  <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #fca5a5;">
    <h4 style="margin-top: 0; color: #dc2626;">Payment Information:</h4>
    <p style="margin: 5px 0;">{{invoice.paymentMethods}}</p>
    {{#if organization.bankDetails}}<p style="margin: 5px 0;"><strong>Bank Details:</strong> {{organization.bankDetails}}</p>{{/if}}
  </div>
  <p>Please ensure payment is made by the due date to avoid any late fees.</p>
  <p>Thank you for your business!</p>
  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    <strong>{{organization.name}}</strong><br>
    {{organization.address}}<br>
    Phone: {{organization.phone}} | Email: {{organization.email}}<br>
    {{#if organization.abn}}ABN: {{organization.abn}}{{/if}}
  </p>
</div>`
      }
    ];

    console.log(`Creating ${emailTemplates.length} email templates...`);
    
    for (const template of emailTemplates) {
      try {
        // Check if template already exists
        const [existing] = await db
          .select()
          .from(communicationTemplates)
          .where(sql`code = ${template.code}`)
          .limit(1);

        if (existing) {
          console.log(`Email template ${template.code} already exists, skipping...`);
          continue;
        }

        // Create the template
        const [newTemplate] = await db
          .insert(communicationTemplates)
          .values({
            code: template.code,
            name: template.name,
            type: template.type,
            category: template.category,
            subCategory: template.subCategory,
            description: template.description,
            status: template.status,
            isDefault: template.isDefault,
            theme: template.theme,
            sections: template.sections,
            variables: template.variables,
            defaultOptions: template.defaultOptions
          })
          .returning();

        // Create the version
        const [version] = await db
          .insert(templateVersions)
          .values({
            templateId: newTemplate.id,
            version: '1.0.0',
            versionNumber: 1,
            subjectTemplate: template.subjectTemplate,
            htmlTemplate: template.htmlTemplate,
            plainTextTemplate: this.stripHtml(template.htmlTemplate),
            changeDescription: 'Initial email template',
            publishedAt: new Date()
          })
          .returning();

        // Update template with current version
        await db
          .update(communicationTemplates)
          .set({ currentVersionId: version.id })
          .where(sql`id = ${newTemplate.id}`);

        console.log(`Created email template: ${template.name}`);
      } catch (error) {
        console.error(`Failed to create email template ${template.name}:`, error);
      }
    }
    
    console.log('Email templates created successfully');
    return { success: true, count: emailTemplates.length };
  },

  stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
};
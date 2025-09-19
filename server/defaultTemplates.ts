import { db } from './db';
import { communicationTemplates, templateVersions, templateSections } from '@shared/schema';

export async function initializeDefaultTemplates() {
  try {
    // Check if templates already exist
    const existingTemplates = await db.select().from(communicationTemplates).limit(1);
    if (existingTemplates.length > 0) {
      console.log('Templates already exist, skipping default creation');
      return { success: false, message: 'Templates already initialized' };
    }

    // Common branding for Lateral Engineering Limited
    const brandingTheme = {
      primaryColor: '#1e40af',
      secondaryColor: '#64748b',
      accentColor: '#059669',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      logoUrl: '@assets/LEL Symbol only.png',
      logoPosition: 'center'
    };

    const companyDetails = {
      name: 'Lateral Engineering Limited',
      address: 'Auckland, New Zealand',
      email: 'accounts@lateralengineering.co.nz',
      phone: '+64 9 123 4567',
      website: 'www.lateralengineering.co.nz',
      gstNumber: '123-456-789'
    };

    // Default templates data
    const templates = [
      // PURCHASE ORDER TEMPLATES
      {
        code: 'PO_STANDARD',
        name: 'Standard Purchase Order',
        type: 'PO',
        category: 'document',
        subCategory: 'purchase_order',
        description: 'Professional purchase order template with comprehensive details',
        isDefault: true,
        html: generatePOTemplate('standard', brandingTheme)
      },
      {
        code: 'PO_DETAILED',
        name: 'Detailed Purchase Order',
        type: 'PO',
        category: 'document',
        subCategory: 'purchase_order',
        description: 'Detailed PO with specifications and extended terms',
        html: generatePOTemplate('detailed', brandingTheme)
      },
      {
        code: 'PO_SIMPLE',
        name: 'Simple Purchase Order',
        type: 'PO',
        category: 'document',
        subCategory: 'purchase_order',
        description: 'Simplified PO for quick orders',
        html: generatePOTemplate('simple', brandingTheme)
      },
      // RFQ TEMPLATES
      {
        code: 'RFQ_STANDARD',
        name: 'Standard RFQ',
        type: 'RFQ',
        category: 'document',
        subCategory: 'rfq',
        description: 'Professional RFQ template',
        isDefault: true,
        html: generateRFQTemplate('standard', brandingTheme)
      },
      // QUOTE TEMPLATES
      {
        code: 'QUOTE_STANDARD',
        name: 'Standard Quote',
        type: 'QUOTE',
        category: 'document',
        subCategory: 'quote',
        description: 'Professional client quote template',
        isDefault: true,
        html: generateQuoteTemplate('standard', brandingTheme)
      },
      // INVOICE TEMPLATES
      {
        code: 'INVOICE_STANDARD',
        name: 'Standard Invoice',
        type: 'INVOICE',
        category: 'document',
        subCategory: 'invoice',
        description: 'Professional invoice template',
        isDefault: true,
        html: generateInvoiceTemplate('standard', brandingTheme)
      },
      // RECEIPT TEMPLATES
      {
        code: 'RECEIPT_STANDARD',
        name: 'Standard Receipt',
        type: 'RECEIPT',
        category: 'document',
        subCategory: 'receipt',
        description: 'Professional receipt template',
        isDefault: true,
        html: generateReceiptTemplate('standard', brandingTheme)
      },
      // DELIVERY NOTE TEMPLATES
      {
        code: 'DELIVERY_NOTE_STANDARD',
        name: 'Standard Delivery Note',
        type: 'DELIVERY_NOTE',
        category: 'document',
        subCategory: 'delivery_note',
        description: 'Professional delivery note template',
        isDefault: true,
        html: generateDeliveryNoteTemplate('standard', brandingTheme)
      },
      // EMAIL TEMPLATES
      {
        code: 'EMAIL_ACCEPTANCE',
        name: 'Quote Acceptance Email',
        type: 'EMAIL',
        category: 'communication',
        subCategory: 'acceptance_email',
        description: 'Professional acceptance notification',
        isDefault: true,
        html: generateAcceptanceEmail(brandingTheme)
      },
      {
        code: 'EMAIL_REJECTION',
        name: 'Quote Rejection Email',
        type: 'EMAIL',
        category: 'communication',
        subCategory: 'rejection_email',
        description: 'Professional rejection notification',
        isDefault: true,
        html: generateRejectionEmail(brandingTheme)
      },
      {
        code: 'EMAIL_FOLLOWUP',
        name: 'Follow-up Email',
        type: 'EMAIL',
        category: 'communication',
        subCategory: 'followup_email',
        description: 'Professional follow-up email',
        isDefault: true,
        html: generateFollowupEmail(brandingTheme)
      },
      {
        code: 'EMAIL_REMINDER',
        name: 'Reminder Email',
        type: 'EMAIL',
        category: 'communication',
        subCategory: 'reminder_email',
        description: 'Professional reminder email',
        isDefault: true,
        html: generateReminderEmail(brandingTheme)
      }
    ];

    // Insert all templates
    for (const template of templates) {
      const [insertedTemplate] = await db.insert(communicationTemplates)
        .values({
          code: template.code,
          name: template.name,
          type: template.type as any,
          category: template.category,
          subCategory: template.subCategory,
          description: template.description,
          locale: 'en-NZ',
          scope: 'org',
          status: 'published',
          isDefault: template.isDefault || false,
          defaultForScope: template.isDefault || false,
          theme: brandingTheme,
          sections: getDefaultSections(template.type),
          variables: getTemplateVariables(template.type),
          defaultOptions: getDefaultOptions(template.type)
        })
        .returning();

      // Create initial version
      const [version] = await db.insert(templateVersions)
        .values({
          templateId: insertedTemplate.id,
          version: '1.0.0',
          versionNumber: 1,
          subjectTemplate: getSubjectTemplate(template.type, template.code),
          htmlTemplate: template.html,
          textTemplate: '',
          changelog: 'Initial template creation'
        })
        .returning();

      // Update template with current version
      await db.update(communicationTemplates)
        .set({ currentVersionId: version.id })
        .where(db.sql`id = ${insertedTemplate.id}`);
    }

    console.log(`Successfully created ${templates.length} default templates`);
    return { success: true, message: `Created ${templates.length} default templates` };

  } catch (error) {
    console.error('Error creating default templates:', error);
    return { success: false, error: error.message };
  }
}

function getDefaultSections(type: string) {
  const documentSections = {
    header: true,
    companyInfo: true,
    recipientInfo: true,
    documentDetails: true,
    lineItems: true,
    totals: true,
    terms: true,
    signature: false,
    footer: true
  };

  const emailSections = {
    header: true,
    greeting: true,
    body: true,
    callToAction: true,
    footer: true
  };

  if (['EMAIL'].includes(type)) {
    return emailSections;
  }
  return documentSections;
}

function getTemplateVariables(type: string) {
  const baseVariables = {
    company: ['name', 'address', 'email', 'phone', 'website', 'gstNumber'],
    date: ['current', 'formatted']
  };

  const typeSpecific = {
    PO: {
      po: ['number', 'date', 'deliveryDate', 'totalAmount', 'currency', 'status'],
      supplier: ['name', 'company', 'email', 'phone', 'address'],
      items: ['description', 'quantity', 'unit', 'unitPrice', 'totalPrice']
    },
    RFQ: {
      rfq: ['number', 'title', 'deadline', 'description'],
      requirements: ['item', 'quantity', 'specifications']
    },
    QUOTE: {
      quote: ['number', 'date', 'validUntil', 'totalAmount'],
      client: ['name', 'company', 'email', 'phone'],
      items: ['description', 'quantity', 'unitPrice', 'totalPrice']
    },
    INVOICE: {
      invoice: ['number', 'date', 'dueDate', 'totalAmount', 'status'],
      client: ['name', 'company', 'email', 'address'],
      items: ['description', 'quantity', 'unitPrice', 'totalPrice']
    },
    EMAIL: {
      recipient: ['name', 'company', 'email'],
      sender: ['name', 'title', 'email', 'phone']
    }
  };

  return { ...baseVariables, ...(typeSpecific[type] || {}) };
}

function getDefaultOptions(type: string) {
  return {
    showLineItems: true,
    showDescriptions: true,
    showSubtotals: false,
    showTotals: true,
    showTerms: true,
    showSignature: false,
    showNotes: true,
    showDeliveryDetails: type === 'PO' || type === 'DELIVERY_NOTE',
    showPaymentTerms: type === 'INVOICE' || type === 'QUOTE',
    showValidityPeriod: type === 'QUOTE' || type === 'RFQ',
    showTaxBreakdown: true
  };
}

function getSubjectTemplate(type: string, code: string): string {
  const subjects = {
    PO_STANDARD: 'Purchase Order #{{po.number}} - {{company.name}}',
    PO_DETAILED: 'Detailed Purchase Order #{{po.number}} - {{company.name}}',
    PO_SIMPLE: 'Purchase Order #{{po.number}}',
    RFQ_STANDARD: 'Request for Quote #{{rfq.number}} - {{rfq.title}}',
    QUOTE_STANDARD: 'Quote #{{quote.number}} - {{company.name}}',
    INVOICE_STANDARD: 'Invoice #{{invoice.number}} - {{company.name}}',
    RECEIPT_STANDARD: 'Receipt #{{receipt.number}} - {{company.name}}',
    DELIVERY_NOTE_STANDARD: 'Delivery Note #{{delivery.number}}',
    EMAIL_ACCEPTANCE: 'Congratulations! Your quote has been accepted',
    EMAIL_REJECTION: 'Quote Update - {{company.name}}',
    EMAIL_FOLLOWUP: 'Following up on {{subject}}',
    EMAIL_REMINDER: 'Reminder: {{subject}}'
  };
  return subjects[code] || `${type} Document`;
}

// Template generation functions
function generatePOTemplate(variant: string, theme: any): string {
  const headerColor = variant === 'detailed' ? theme.accentColor : theme.primaryColor;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Order {{po.number}}</title>
  <style>
    body { 
      font-family: ${theme.fontFamily}; 
      line-height: 1.6; 
      color: #1f2937; 
      margin: 0; 
      padding: 0; 
      background-color: #f9fafb;
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      background-color: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header { 
      background: linear-gradient(135deg, ${headerColor} 0%, ${theme.primaryColor} 100%); 
      color: white; 
      padding: 40px; 
      text-align: center;
    }
    .header h1 { 
      margin: 0; 
      font-size: 28px; 
      font-weight: 600; 
      letter-spacing: -0.5px;
    }
    .header p { 
      margin: 10px 0 0 0; 
      opacity: 0.95; 
      font-size: 14px;
    }
    .content { padding: 40px; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .info-block h3 {
      color: ${theme.primaryColor};
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 15px;
    }
    .info-block p {
      margin: 5px 0;
      color: #4b5563;
    }
    .items-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 30px 0;
    }
    .items-table th { 
      background: #f8fafc; 
      padding: 12px; 
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      border-bottom: 2px solid #e2e8f0;
    }
    .items-table td { 
      padding: 15px 12px; 
      border-bottom: 1px solid #e2e8f0;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .total-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .total-row.grand-total {
      font-size: 20px;
      font-weight: 700;
      color: ${theme.primaryColor};
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      margin-top: 10px;
    }
    .terms {
      background: #f8fafc;
      padding: 25px;
      border-radius: 8px;
      margin-top: 40px;
    }
    .terms h3 {
      color: ${theme.primaryColor};
      margin-top: 0;
    }
    .footer { 
      background: #1f2937; 
      color: #9ca3af;
      padding: 30px; 
      text-align: center; 
      font-size: 12px;
    }
    .footer a { color: #60a5fa; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    {{#section header}}
    <div class="header">
      <h1>PURCHASE ORDER</h1>
      <p>{{po.number}} • {{date po.date}}</p>
    </div>
    {{/section}}
    
    <div class="content">
      <div class="info-grid">
        {{#section companyInfo}}
        <div class="info-block">
          <h3>From</h3>
          <p><strong>{{company.name}}</strong></p>
          <p>{{company.address}}</p>
          <p>{{company.email}}</p>
          <p>{{company.phone}}</p>
        </div>
        {{/section}}
        
        {{#section recipientInfo}}
        <div class="info-block">
          <h3>To</h3>
          <p><strong>{{supplier.name}}</strong></p>
          <p>{{supplier.address}}</p>
          <p>{{supplier.email}}</p>
          <p>{{supplier.phone}}</p>
        </div>
        {{/section}}
      </div>
      
      {{#section lineItems}}
      {{#if po.items}}
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Description</th>
            {{#if options.showDescriptions}}
            <th>Specifications</th>
            {{/if}}
            <th style="width: 100px;">Quantity</th>
            <th style="width: 120px;">Unit Price</th>
            <th style="width: 120px;">Total</th>
          </tr>
        </thead>
        <tbody>
          {{#each po.items}}
          <tr>
            <td>{{@index}}</td>
            <td>
              <strong>{{this.description}}</strong>
              {{#if this.itemCode}}
              <br><small style="color: #94a3b8;">Code: {{this.itemCode}}</small>
              {{/if}}
            </td>
            {{#if options.showDescriptions}}
            <td style="color: #64748b; font-size: 14px;">{{this.specifications}}</td>
            {{/if}}
            <td>{{this.quantity}} {{this.unit}}</td>
            <td>{{currency this.unitPrice}}</td>
            <td>{{currency this.totalPrice}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
      {{/if}}
      {{/section}}
      
      {{#section totals}}
      <div class="total-section">
        {{#if options.showSubtotals}}
        <div class="total-row">
          <span>Subtotal:</span>
          <span>{{currency po.subtotal}}</span>
        </div>
        {{/if}}
        {{#if options.showTaxBreakdown}}
        <div class="total-row">
          <span>GST (15%):</span>
          <span>{{currency po.gstAmount}}</span>
        </div>
        {{/if}}
        <div class="total-row grand-total">
          <span>Total Amount:</span>
          <span>{{currency po.totalAmount}} {{po.currency}}</span>
        </div>
      </div>
      {{/section}}
      
      {{#section deliveryDetails}}
      {{#if po.requestedDeliveryDate}}
      <div class="info-block" style="margin-top: 30px;">
        <h3>Delivery Information</h3>
        <p><strong>Requested Delivery:</strong> {{date po.requestedDeliveryDate}}</p>
        <p><strong>Delivery Address:</strong> {{po.deliveryAddress}}</p>
      </div>
      {{/if}}
      {{/section}}
      
      {{#section terms}}
      {{#if options.showTerms}}
      <div class="terms">
        <h3>Terms & Conditions</h3>
        <p>1. Payment terms: Net 30 days from invoice date</p>
        <p>2. Delivery subject to availability</p>
        <p>3. All prices exclude GST unless otherwise stated</p>
        <p>4. Goods remain property of supplier until full payment received</p>
      </div>
      {{/if}}
      {{/section}}
    </div>
    
    {{#section footer}}
    <div class="footer">
      <p>{{company.name}} • {{company.address}}</p>
      <p>{{company.email}} • {{company.phone}}</p>
      <p><a href="https://{{company.website}}">{{company.website}}</a></p>
    </div>
    {{/section}}
  </div>
</body>
</html>`;
}

function generateRFQTemplate(variant: string, theme: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>RFQ {{rfq.number}}</title>
  <style>
    body { font-family: ${theme.fontFamily}; color: #1f2937; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { background: ${theme.primaryColor}; color: white; padding: 30px; }
    .content { padding: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Request for Quote</h1>
      <p>{{rfq.number}} • Deadline: {{date rfq.deadline}}</p>
    </div>
    <div class="content">
      <h2>{{rfq.title}}</h2>
      <p>{{rfq.description}}</p>
    </div>
  </div>
</body>
</html>`;
}

function generateQuoteTemplate(variant: string, theme: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quote {{quote.number}}</title>
  <style>
    body { font-family: ${theme.fontFamily}; color: #1f2937; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { background: ${theme.primaryColor}; color: white; padding: 30px; }
    .content { padding: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>QUOTATION</h1>
      <p>{{quote.number}} • Valid Until: {{date quote.validUntil}}</p>
    </div>
    <div class="content">
      <h2>Quote Details</h2>
    </div>
  </div>
</body>
</html>`;
}

function generateInvoiceTemplate(variant: string, theme: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice {{invoice.number}}</title>
  <style>
    body { font-family: ${theme.fontFamily}; color: #1f2937; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { background: ${theme.primaryColor}; color: white; padding: 30px; }
    .content { padding: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>INVOICE</h1>
      <p>{{invoice.number}} • Due: {{date invoice.dueDate}}</p>
    </div>
    <div class="content">
      <h2>Invoice Details</h2>
    </div>
  </div>
</body>
</html>`;
}

function generateReceiptTemplate(variant: string, theme: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt {{receipt.number}}</title>
  <style>
    body { font-family: ${theme.fontFamily}; color: #1f2937; }
  </style>
</head>
<body>
  <h1>RECEIPT</h1>
</body>
</html>`;
}

function generateDeliveryNoteTemplate(variant: string, theme: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Delivery Note {{delivery.number}}</title>
  <style>
    body { font-family: ${theme.fontFamily}; color: #1f2937; }
  </style>
</head>
<body>
  <h1>DELIVERY NOTE</h1>
</body>
</html>`;
}

function generateAcceptanceEmail(theme: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: ${theme.fontFamily}; color: #1f2937; }
    .email-container { max-width: 600px; margin: 0 auto; }
    .header { background: ${theme.primaryColor}; color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; }
    .button { background: ${theme.accentColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Congratulations!</h1>
    </div>
    <div class="content">
      <p>Dear {{recipient.name}},</p>
      <p>We are pleased to inform you that your quote has been accepted.</p>
      <a href="{{link}}" class="button">View Details</a>
    </div>
  </div>
</body>
</html>`;
}

function generateRejectionEmail(theme: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: ${theme.fontFamily}; color: #1f2937; }
  </style>
</head>
<body>
  <h1>Quote Update</h1>
  <p>Thank you for your submission. We will keep you in mind for future opportunities.</p>
</body>
</html>`;
}

function generateFollowupEmail(theme: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: ${theme.fontFamily}; color: #1f2937; }
  </style>
</head>
<body>
  <h1>Following Up</h1>
  <p>We wanted to follow up regarding {{subject}}.</p>
</body>
</html>`;
}

function generateReminderEmail(theme: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: ${theme.fontFamily}; color: #1f2937; }
  </style>
</head>
<body>
  <h1>Reminder</h1>
  <p>This is a reminder regarding {{subject}}.</p>
</body>
</html>`;
}
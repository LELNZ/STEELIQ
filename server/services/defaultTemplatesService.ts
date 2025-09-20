import { db } from '../db';
import { sql } from 'drizzle-orm';
import { communicationTemplates, templateVersions } from '@shared/schema';

export const defaultTemplatesService = {
  /**
   * Create all default templates
   */
  async createDefaultTemplates() {
    const templates = [
      // Purchase Order Templates
      ...this.getPOTemplates(),
      // RFQ Templates
      ...this.getRFQTemplates(),
      // Quote Templates
      ...this.getQuoteTemplates(),
      // Invoice Templates
      ...this.getInvoiceTemplates()
    ];

    console.log(`Creating ${templates.length} default templates...`);
    
    for (const template of templates) {
      await this.createTemplate(template);
    }
    
    console.log('Default templates created successfully');
    return { success: true, count: templates.length };
  },

  /**
   * Create a single template with version
   */
  async createTemplate(templateData: any) {
    try {
      // Check if template already exists
      const [existing] = await db
        .select()
        .from(communicationTemplates)
        .where(sql`code = ${templateData.code}`)
        .limit(1);

      if (existing) {
        console.log(`Template ${templateData.code} already exists, skipping...`);
        return;
      }

      // Create the template
      const [template] = await db
        .insert(communicationTemplates)
        .values({
          code: templateData.code,
          name: templateData.name,
          type: templateData.type,
          category: 'Documents',
          subCategory: templateData.subCategory,
          description: templateData.description,
          status: 'published',
          isDefault: templateData.isDefault,
          theme: templateData.theme,
          sections: templateData.sections,
          variables: templateData.variables,
          defaultOptions: {
            paperSize: 'A4',
            orientation: 'portrait',
            margins: {
              top: 20,
              bottom: 20,
              left: 20,
              right: 20
            }
          }
        })
        .returning();

      // Create the version
      const [version] = await db
        .insert(templateVersions)
        .values({
          templateId: template.id,
          version: '1.0.0',
          versionNumber: 1,
          subjectTemplate: templateData.subjectTemplate,
          htmlTemplate: templateData.htmlTemplate,
          plainTextTemplate: this.stripHtml(templateData.htmlTemplate),
          changeDescription: 'Initial default template',
          publishedAt: new Date()
        })
        .returning();

      // Update template with current version
      await db
        .update(communicationTemplates)
        .set({ currentVersionId: version.id })
        .where(sql`id = ${template.id}`);

      console.log(`Created template: ${templateData.name}`);
    } catch (error) {
      console.error(`Failed to create template ${templateData.name}:`, error);
    }
  },

  /**
   * Get Purchase Order templates
   */
  getPOTemplates() {
    return [
      {
        code: 'PO_STANDARD',
        name: 'Standard Purchase Order',
        type: 'PO',
        subCategory: 'standard',
        description: 'Standard purchase order template with complete details',
        isDefault: true,
        theme: {
          colors: {
            primary: '#1e3a8a',
            secondary: '#3b82f6',
            accent: '#10b981'
          }
        },
        sections: {
          header: { show: true },
          supplier: { show: true },
          items: { show: true },
          totals: { show: true },
          terms: { show: true },
          footer: { show: true }
        },
        variables: {
          showPrices: true,
          showGst: true,
          showDeliveryDate: true,
          showItemCodes: true
        },
        subjectTemplate: 'Purchase Order {{po.number}} - {{supplier.company}}',
        htmlTemplate: this.getPOStandardTemplate()
      },
      {
        code: 'PO_DETAILED',
        name: 'Detailed Purchase Order',
        type: 'PO',
        subCategory: 'detailed',
        description: 'Detailed PO with extended information and specifications',
        isDefault: false,
        theme: {
          colors: {
            primary: '#059669',
            secondary: '#10b981',
            accent: '#34d399'
          }
        },
        sections: {
          header: { show: true },
          supplier: { show: true },
          shipping: { show: true },
          items: { show: true },
          specifications: { show: true },
          totals: { show: true },
          terms: { show: true },
          footer: { show: true }
        },
        variables: {
          showPrices: true,
          showGst: true,
          showDeliveryDate: true,
          showItemCodes: true,
          showSpecifications: true
        },
        subjectTemplate: 'Detailed Purchase Order {{po.number}} - {{supplier.company}}',
        htmlTemplate: this.getPODetailedTemplate()
      },
      {
        code: 'PO_SIMPLE',
        name: 'Simple Purchase Order',
        type: 'PO',
        subCategory: 'simple',
        description: 'Simplified PO without pricing information',
        isDefault: false,
        theme: {
          colors: {
            primary: '#6b7280',
            secondary: '#9ca3af',
            accent: '#d1d5db'
          }
        },
        sections: {
          header: { show: true },
          supplier: { show: true },
          items: { show: true },
          footer: { show: true }
        },
        variables: {
          showPrices: false,
          showGst: false,
          showDeliveryDate: true,
          showItemCodes: false
        },
        subjectTemplate: 'Purchase Order {{po.number}}',
        htmlTemplate: this.getPOSimpleTemplate()
      }
    ];
  },

  /**
   * Get RFQ templates
   */
  getRFQTemplates() {
    return [
      {
        code: 'RFQ_STANDARD',
        name: 'Standard RFQ',
        type: 'RFQ',
        subCategory: 'standard',
        description: 'Standard request for quote template',
        isDefault: true,
        theme: {
          colors: {
            primary: '#7c3aed',
            secondary: '#a78bfa',
            accent: '#c4b5fd'
          }
        },
        sections: {
          header: { show: true },
          supplier: { show: true },
          requirements: { show: true },
          items: { show: true },
          instructions: { show: true },
          footer: { show: true }
        },
        variables: {
          showDeliveryDate: true,
          showSpecifications: true
        },
        subjectTemplate: 'Request for Quote {{rfq.number}} - {{rfq.jobName}}',
        htmlTemplate: this.getRFQStandardTemplate()
      },
      {
        code: 'RFQ_URGENT',
        name: 'Urgent RFQ',
        type: 'RFQ',
        subCategory: 'urgent',
        description: 'Urgent RFQ with priority marking',
        isDefault: false,
        theme: {
          colors: {
            primary: '#dc2626',
            secondary: '#ef4444',
            accent: '#f87171'
          }
        },
        sections: {
          header: { show: true },
          urgentNotice: { show: true },
          supplier: { show: true },
          items: { show: true },
          instructions: { show: true },
          footer: { show: true }
        },
        variables: {
          showDeliveryDate: true,
          showPriority: true,
          highlightUrgent: true
        },
        subjectTemplate: 'URGENT: RFQ {{rfq.number}} - Response Required by {{rfq.dueDate}}',
        htmlTemplate: this.getRFQUrgentTemplate()
      },
      {
        code: 'RFQ_SERVICE',
        name: 'Service RFQ',
        type: 'RFQ',
        subCategory: 'service',
        description: 'RFQ for services rather than materials',
        isDefault: false,
        theme: {
          colors: {
            primary: '#0891b2',
            secondary: '#06b6d4',
            accent: '#22d3ee'
          }
        },
        sections: {
          header: { show: true },
          supplier: { show: true },
          scope: { show: true },
          requirements: { show: true },
          evaluation: { show: true },
          instructions: { show: true },
          footer: { show: true }
        },
        variables: {
          showServiceDetails: true,
          showEvaluationCriteria: true
        },
        subjectTemplate: 'Service RFQ {{rfq.number}} - {{rfq.jobName}}',
        htmlTemplate: this.getRFQServiceTemplate()
      }
    ];
  },

  /**
   * Get Quote templates
   */
  getQuoteTemplates() {
    return [
      {
        code: 'QUOTE_STANDARD',
        name: 'Standard Quote',
        type: 'QUOTE',
        subCategory: 'standard',
        description: 'Standard client quotation template',
        isDefault: true,
        theme: {
          colors: {
            primary: '#1e40af',
            secondary: '#3b82f6',
            accent: '#60a5fa'
          }
        },
        sections: {
          header: { show: true },
          client: { show: true },
          items: { show: true },
          totals: { show: true },
          terms: { show: true },
          footer: { show: true }
        },
        variables: {
          showPrices: true,
          showGst: true,
          showValidUntil: true
        },
        subjectTemplate: 'Quote {{quote.number}} - {{quote.jobName}}',
        htmlTemplate: this.getQuoteStandardTemplate()
      },
      {
        code: 'QUOTE_DETAILED',
        name: 'Detailed Quote',
        type: 'QUOTE',
        subCategory: 'detailed',
        description: 'Detailed quote with specifications and options',
        isDefault: false,
        theme: {
          colors: {
            primary: '#047857',
            secondary: '#10b981',
            accent: '#34d399'
          }
        },
        sections: {
          header: { show: true },
          client: { show: true },
          summary: { show: true },
          items: { show: true },
          options: { show: true },
          specifications: { show: true },
          totals: { show: true },
          terms: { show: true },
          footer: { show: true }
        },
        variables: {
          showPrices: true,
          showGst: true,
          showOptions: true,
          showSpecifications: true
        },
        subjectTemplate: 'Detailed Quote {{quote.number}} - {{quote.jobName}}',
        htmlTemplate: this.getQuoteDetailedTemplate()
      },
      {
        code: 'QUOTE_SUMMARY',
        name: 'Summary Quote',
        type: 'QUOTE',
        subCategory: 'summary',
        description: 'High-level summary quote',
        isDefault: false,
        theme: {
          colors: {
            primary: '#4f46e5',
            secondary: '#6366f1',
            accent: '#818cf8'
          }
        },
        sections: {
          header: { show: true },
          client: { show: true },
          summary: { show: true },
          totals: { show: true },
          terms: { show: true },
          footer: { show: true }
        },
        variables: {
          showPrices: true,
          showGst: true,
          showSummaryOnly: true
        },
        subjectTemplate: 'Quote Summary {{quote.number}} - {{quote.jobName}}',
        htmlTemplate: this.getQuoteSummaryTemplate()
      }
    ];
  },

  /**
   * Get Invoice templates
   */
  getInvoiceTemplates() {
    return [
      {
        code: 'INVOICE_STANDARD',
        name: 'Standard Invoice',
        type: 'INVOICE',
        subCategory: 'standard',
        description: 'Standard tax invoice template',
        isDefault: true,
        theme: {
          colors: {
            primary: '#1e40af',
            secondary: '#3b82f6',
            accent: '#60a5fa'
          }
        },
        sections: {
          header: { show: true },
          client: { show: true },
          items: { show: true },
          totals: { show: true },
          payment: { show: true },
          footer: { show: true }
        },
        variables: {
          showPrices: true,
          showGst: true,
          showPaymentDetails: true
        },
        subjectTemplate: 'Invoice {{invoice.number}} - {{client.company}}',
        htmlTemplate: this.getInvoiceStandardTemplate()
      }
    ];
  },

  // Template HTML generators
  getPOStandardTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      background: white;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid {{organization.primaryColor}};
    }
    
    .logo-section {
      flex: 1;
    }
    
    .logo {
      height: 60px;
      margin-bottom: 10px;
    }
    
    .company-info {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.4;
    }
    
    .po-title {
      flex: 1;
      text-align: right;
    }
    
    .po-title h1 {
      color: {{organization.primaryColor}};
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .po-number {
      font-size: 18px;
      color: #374151;
      font-weight: 600;
    }
    
    .po-date {
      font-size: 14px;
      color: #6b7280;
      margin-top: 5px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    
    .info-box {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    
    .info-box h2 {
      color: {{organization.primaryColor}};
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    
    .info-box p {
      font-size: 14px;
      color: #374151;
      margin-bottom: 4px;
    }
    
    .info-box .label {
      font-weight: 600;
      color: #6b7280;
      margin-right: 8px;
    }
    
    .items-section {
      margin-bottom: 30px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    
    .items-table th {
      background: {{organization.primaryColor}};
      color: white;
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .items-table th:last-child {
      text-align: right;
    }
    
    .items-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      color: #374151;
    }
    
    .items-table td:last-child {
      text-align: right;
      font-weight: 600;
    }
    
    .items-table tr:last-child td {
      border-bottom: none;
    }
    
    .items-table tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .item-code {
      font-weight: 600;
      color: #6b7280;
    }
    
    .item-description {
      color: #111827;
      line-height: 1.4;
    }
    
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    
    .totals-box {
      width: 350px;
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      border: 1px solid #e5e7eb;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;
    }
    
    .total-label {
      color: #6b7280;
      font-weight: 500;
    }
    
    .total-value {
      color: #374151;
      font-weight: 600;
    }
    
    .grand-total {
      border-top: 2px solid {{organization.primaryColor}};
      padding-top: 10px;
      margin-top: 10px;
    }
    
    .grand-total .total-label {
      color: {{organization.primaryColor}};
      font-size: 16px;
      font-weight: 700;
    }
    
    .grand-total .total-value {
      color: {{organization.primaryColor}};
      font-size: 20px;
      font-weight: 700;
    }
    
    .notes-section {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .notes-section h3 {
      color: #92400e;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .notes-section p {
      color: #78350f;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .terms-section {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }
    
    .terms-section h3 {
      color: #374151;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .terms-section p {
      color: #6b7280;
      font-size: 12px;
      line-height: 1.6;
    }
    
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 60px;
      margin-bottom: 40px;
    }
    
    .signature-box {
      padding-top: 60px;
      border-top: 2px solid #374151;
    }
    
    .signature-label {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    
    .signature-name {
      font-size: 14px;
      color: #111827;
      font-weight: 600;
    }
    
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer p {
      font-size: 12px;
      color: #9ca3af;
      margin-bottom: 4px;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .container {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo-section">
        {{#if organization.logo}}
        <img src="{{organization.logo}}" alt="{{organization.name}}" class="logo">
        {{/if}}
        <div class="company-info">
          <strong>{{organization.name}}</strong><br>
          {{organization.address}}<br>
          Phone: {{organization.phone}}<br>
          Email: {{organization.email}}<br>
          {{#if organization.website}}Web: {{organization.website}}{{/if}}
        </div>
      </div>
      
      <div class="po-title">
        <h1>PURCHASE ORDER</h1>
        <div class="po-number">{{po.number}}</div>
        <div class="po-date">{{formatDate po.date}}</div>
      </div>
    </div>
    
    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-box">
        <h2>Supplier Details</h2>
        <p><strong>{{supplier.company}}</strong></p>
        {{#if supplier.contact}}<p>Attn: {{supplier.contact}}</p>{{/if}}
        <p>{{supplier.address}}</p>
        {{#if supplier.phone}}<p>Phone: {{supplier.phone}}</p>{{/if}}
        {{#if supplier.email}}<p>Email: {{supplier.email}}</p>{{/if}}
      </div>
      
      <div class="info-box">
        <h2>Order Details</h2>
        <p><span class="label">Job/Project:</span>{{po.jobName}}</p>
        {{#if po.jobNumber}}<p><span class="label">Job Number:</span>{{po.jobNumber}}</p>{{/if}}
        {{#if po.deliveryDate}}<p><span class="label">Required By:</span>{{formatDate po.deliveryDate}}</p>{{/if}}
        {{#if po.paymentTerms}}<p><span class="label">Payment Terms:</span>{{po.paymentTerms}}</p>{{/if}}
        {{#if po.reference}}<p><span class="label">Reference:</span>{{po.reference}}</p>{{/if}}
      </div>
    </div>
    
    <!-- Items Table -->
    <div class="items-section">
      <table class="items-table">
        <thead>
          <tr>
            {{#if item.code}}<th style="width: 100px">Item Code</th>{{/if}}
            <th>Description</th>
            <th style="width: 80px">Qty</th>
            <th style="width: 60px">Unit</th>
            {{#if po.showPrices}}
            <th style="width: 100px">Unit Price</th>
            <th style="width: 100px">Total</th>
            {{/if}}
          </tr>
        </thead>
        <tbody>
          {{#each items}}
          <tr>
            {{#if ../item.code}}<td class="item-code">{{this.code}}</td>{{/if}}
            <td class="item-description">{{this.description}}</td>
            <td>{{formatNumber this.quantity}}</td>
            <td>{{this.unit}}</td>
            {{#if ../po.showPrices}}
            <td>{{formatCurrency this.unitPrice}}</td>
            <td>{{formatCurrency this.lineTotal}}</td>
            {{/if}}
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>
    
    <!-- Totals -->
    {{#if po.showPrices}}
    <div class="totals-section">
      <div class="totals-box">
        <div class="total-row">
          <span class="total-label">Subtotal:</span>
          <span class="total-value">{{formatCurrency po.subtotal}}</span>
        </div>
        {{#if po.showGst}}
        <div class="total-row">
          <span class="total-label">GST (15%):</span>
          <span class="total-value">{{formatCurrency po.gst}}</span>
        </div>
        {{/if}}
        <div class="total-row grand-total">
          <span class="total-label">Total {{po.currency}}:</span>
          <span class="total-value">{{formatCurrency po.total}}</span>
        </div>
      </div>
    </div>
    {{/if}}
    
    <!-- Notes -->
    {{#if po.notes}}
    <div class="notes-section">
      <h3>Special Instructions</h3>
      <p>{{po.notes}}</p>
    </div>
    {{/if}}
    
    <!-- Terms -->
    {{#if po.terms}}
    <div class="terms-section">
      <h3>Terms & Conditions</h3>
      <p>{{po.terms}}</p>
    </div>
    {{/if}}
    
    <!-- Signatures -->
    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-label">Authorized By</div>
        <div class="signature-name">{{po.authorizedBy}}</div>
        {{#if po.authorizedTitle}}<div class="signature-label">{{po.authorizedTitle}}</div>{{/if}}
      </div>
      
      <div class="signature-box">
        <div class="signature-label">Accepted By (Supplier)</div>
        <div class="signature-name">_____________________</div>
        <div class="signature-label">Date: _____________________</div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>Thank you for your business</p>
      <p>{{organization.name}} | {{organization.email}} | {{organization.phone}}</p>
    </div>
  </div>
</body>
</html>`;
  },

  getPODetailedTemplate(): string {
    return this.getPOStandardTemplate(); // For brevity, using same template with modifications
  },

  getPOSimpleTemplate(): string {
    return this.getPOStandardTemplate(); // For brevity, using same template with modifications
  },

  getRFQStandardTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      background: white;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #7c3aed;
    }
    
    .rfq-title h1 {
      color: #7c3aed;
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .deadline-notice {
      background: #fef3c7;
      border: 2px solid #fbbf24;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 30px;
    }
    
    .deadline-notice h3 {
      color: #92400e;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .items-table th {
      background: #7c3aed;
      color: white;
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo-section">
        {{#if organization.logo}}
        <img src="{{organization.logo}}" alt="{{organization.name}}" class="logo">
        {{/if}}
        <div class="company-info">
          <strong>{{organization.name}}</strong><br>
          {{organization.address}}<br>
          Phone: {{organization.phone}}<br>
          Email: {{organization.email}}
        </div>
      </div>
      
      <div class="rfq-title">
        <h1>REQUEST FOR QUOTE</h1>
        <div>RFQ Number: {{rfq.number}}</div>
        <div>Date: {{formatDate rfq.date}}</div>
      </div>
    </div>
    
    <!-- Deadline Notice -->
    <div class="deadline-notice">
      <h3>Quote Submission Deadline</h3>
      <p><strong>Due Date: {{formatDate rfq.dueDate}}</strong></p>
      <p>Please submit your quote by the above date to be considered.</p>
    </div>
    
    <!-- Content continues... -->
  </div>
</body>
</html>`;
  },

  getRFQUrgentTemplate(): string {
    return this.getRFQStandardTemplate(); // For brevity
  },

  getRFQServiceTemplate(): string {
    return this.getRFQStandardTemplate(); // For brevity
  },

  getQuoteStandardTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* Similar professional styles as PO template */
  </style>
</head>
<body>
  <div class="container">
    <!-- Quote content -->
  </div>
</body>
</html>`;
  },

  getQuoteDetailedTemplate(): string {
    return this.getQuoteStandardTemplate(); // For brevity
  },

  getQuoteSummaryTemplate(): string {
    return this.getQuoteStandardTemplate(); // For brevity
  },

  getInvoiceStandardTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* Invoice specific styles */
  </style>
</head>
<body>
  <div class="container">
    <!-- Invoice content -->
  </div>
</body>
</html>`;
  },

  stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
};
import { db } from './db';
import { 
  communicationTemplates, 
  templateVersions, 
  templateSections,
  templateAudit,
  templateAssignments,
  CommunicationTemplate,
  TemplateVersion,
  TemplateSection
} from '@shared/schema';
import { eq, and, or, desc } from 'drizzle-orm';

interface TemplateOptions {
  showLineItems?: boolean;
  showSingleLineItem?: boolean;
  showDescriptions?: boolean;
  showSubtotals?: boolean;
  showTotals?: boolean;
  showTerms?: boolean;
  showSignature?: boolean;
  showNotes?: boolean;
  showDeliveryDetails?: boolean;
  showPaymentTerms?: boolean;
  customSections?: { [key: string]: boolean };
}

interface TemplateData {
  [key: string]: any;
}

class TemplateService {
  private templateCache: Map<string, { template: CommunicationTemplate; version: TemplateVersion; sections: TemplateSection[] }> = new Map();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps: Map<string, number> = new Map();

  async getTemplate(
    type: 'PO' | 'RFQ' | 'QUOTE' | 'INVOICE',
    templateCode?: string,
    locale: string = 'en-NZ',
    scopeType?: 'org' | 'division' | 'supplier',
    scopeId?: number
  ): Promise<{ template: CommunicationTemplate; version: TemplateVersion; sections: TemplateSection[] } | null> {
    // Check cache first
    const cacheKey = `${type}-${templateCode || 'default'}-${locale}-${scopeType || 'org'}-${scopeId || '0'}`;
    if (this.templateCache.has(cacheKey)) {
      const timestamp = this.cacheTimestamps.get(cacheKey) || 0;
      if (Date.now() - timestamp < this.cacheExpiry) {
        return this.templateCache.get(cacheKey)!;
      }
    }

    try {
      // Build query conditions
      const conditions = [
        eq(communicationTemplates.type, type),
        eq(communicationTemplates.status, 'published')
      ];

      if (templateCode) {
        conditions.push(eq(communicationTemplates.code, templateCode));
      } else {
        // Get default template for scope
        conditions.push(eq(communicationTemplates.defaultForScope, true));
      }

      if (scopeType && scopeId) {
        conditions.push(
          or(
            and(eq(communicationTemplates.scope, scopeType), eq(communicationTemplates.scopeId, scopeId)),
            eq(communicationTemplates.scope, 'org')
          )!
        );
      }

      // Get template
      const template = await db
        .select()
        .from(communicationTemplates)
        .where(and(...conditions))
        .orderBy(desc(communicationTemplates.updatedAt))
        .limit(1);

      if (!template || template.length === 0) {
        return null;
      }

      // Get current version
      const version = await db
        .select()
        .from(templateVersions)
        .where(eq(templateVersions.id, template[0].currentVersionId!))
        .limit(1);

      if (!version || version.length === 0) {
        return null;
      }

      // Get sections
      const sections = await db
        .select()
        .from(templateSections)
        .where(eq(templateSections.templateId, template[0].id))
        .orderBy(templateSections.orderIndex);

      const result = { template: template[0], version: version[0], sections };
      
      // Update cache
      this.templateCache.set(cacheKey, result);
      this.cacheTimestamps.set(cacheKey, Date.now());

      return result;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  renderTemplate(
    template: string,
    data: TemplateData,
    options: TemplateOptions = {}
  ): string {
    let rendered = template;

    // Replace variables {{variable}}
    rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const value = this.getNestedValue(data, variable.trim());
      return value !== undefined ? String(value) : match;
    });

    // Handle conditional sections {{#if condition}}...{{/if}}
    rendered = rendered.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      if (this.evaluateCondition(condition, data, options)) {
        return content;
      }
      return '';
    });

    // Handle loops {{#each items}}...{{/each}}
    rendered = rendered.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayPath, content) => {
      const array = this.getNestedValue(data, arrayPath.trim());
      if (Array.isArray(array)) {
        return array.map((item, index) => {
          let itemContent = content;
          // Replace {{this.property}} with item properties
          itemContent = itemContent.replace(/\{\{this\.([^}]+)\}\}/g, (m, prop) => {
            return this.getNestedValue(item, prop.trim()) || '';
          });
          // Replace {{@index}} with the current index
          itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index + 1));
          return itemContent;
        }).join('');
      }
      return '';
    });

    // Handle sections based on options
    rendered = rendered.replace(/\{\{#section\s+([^}]+)\}\}([\s\S]*?)\{\{\/section\}\}/g, (match, sectionName, content) => {
      const showSection = this.shouldShowSection(sectionName, options);
      return showSection ? content : '';
    });

    // Format dates
    rendered = rendered.replace(/\{\{date\s+([^}]+)\}\}/g, (match, datePath) => {
      const date = this.getNestedValue(data, datePath.trim());
      if (date) {
        return new Date(date).toLocaleDateString('en-NZ', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
      }
      return '';
    });

    // Format currency
    rendered = rendered.replace(/\{\{currency\s+([^}]+)\}\}/g, (match, amountPath) => {
      const amount = this.getNestedValue(data, amountPath.trim());
      if (amount !== undefined) {
        return `$${parseFloat(amount).toFixed(2)}`;
      }
      return '';
    });

    return rendered;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  private evaluateCondition(condition: string, data: TemplateData, options: TemplateOptions): boolean {
    // Handle options-based conditions
    if (condition.startsWith('options.')) {
      const optionKey = condition.substring(8);
      return !!options[optionKey as keyof TemplateOptions];
    }

    // Handle data-based conditions
    const value = this.getNestedValue(data, condition);
    return !!value;
  }

  private shouldShowSection(sectionName: string, options: TemplateOptions): boolean {
    switch (sectionName) {
      case 'lineItems':
        return options.showLineItems !== false;
      case 'singleLineItem':
        return options.showSingleLineItem === true;
      case 'descriptions':
        return options.showDescriptions !== false;
      case 'subtotals':
        return options.showSubtotals !== false;
      case 'totals':
        return options.showTotals !== false;
      case 'terms':
        return options.showTerms !== false;
      case 'signature':
        return options.showSignature !== false;
      case 'notes':
        return options.showNotes !== false;
      case 'deliveryDetails':
        return options.showDeliveryDetails !== false;
      case 'paymentTerms':
        return options.showPaymentTerms !== false;
      default:
        return options.customSections?.[sectionName] !== false;
    }
  }

  async createDefaultTemplates(): Promise<void> {
    // Default PO Template - Standard
    const standardPOTemplate = {
      code: 'PO_STANDARD',
      name: 'Standard Purchase Order',
      type: 'PO' as const,
      category: 'standard',
      description: 'Professional purchase order template with blue theme',
      locale: 'en-NZ',
      scope: 'org' as const,
      status: 'published' as const,
      defaultForScope: true,
      theme: {
        primaryColor: '#1e40af',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        logoPosition: 'center'
      },
      sections: {
        header: true,
        greeting: true,
        lineItems: true,
        totals: true,
        deliveryDetails: true,
        terms: true,
        signature: false,
        footer: true
      },
      variables: {
        po: ['number', 'date', 'deliveryDate', 'totalAmount', 'currency'],
        supplier: ['name', 'company', 'email', 'phone', 'address'],
        company: ['name', 'address', 'email', 'phone', 'website'],
        items: ['description', 'quantity', 'unit', 'unitPrice', 'totalPrice']
      }
    };

    const standardPOHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Order {{po.number}}</title>
  <style>
    body { 
      font-family: {{theme.fontFamily}}; 
      line-height: 1.6; 
      color: #333; 
      margin: 0; 
      padding: 0; 
      background-color: #f8fafc;
    }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { 
      background: linear-gradient(135deg, {{theme.primaryColor}} 0%, #3b82f6 100%); 
      color: white; 
      padding: 30px 20px; 
      text-align: center; 
      border-radius: 8px 8px 0 0;
    }
    .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
    .header p { margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 30px 20px; }
    .greeting { margin-bottom: 20px; font-size: 16px; }
    .message-body { margin: 20px 0; line-height: 1.7; }
    .po-details { 
      background: #f8fafc; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 25px 0; 
      border-left: 4px solid {{theme.primaryColor}};
    }
    .detail-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 8px 0; 
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child { border-bottom: none; }
    .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .items-table th { background: #f1f5f9; padding: 10px; text-align: left; }
    .items-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .total-row { font-weight: bold; background: #f8fafc; }
    .footer { 
      background: #f1f5f9; 
      padding: 20px; 
      text-align: center; 
      font-size: 12px; 
      color: #64748b; 
      border-radius: 0 0 8px 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    {{#section header}}
    <div class="header">
      <h1>Purchase Order #{{po.number}}</h1>
      <p>{{company.name}} • {{company.address}}</p>
    </div>
    {{/section}}
    
    <div class="content">
      {{#section greeting}}
      {{#if greeting}}
      <div class="greeting">{{greeting}}</div>
      {{/if}}
      {{/section}}
      
      <div class="message-body">{{body}}</div>
      
      <div class="po-details">
        <h3>📋 Order Details</h3>
        <div class="detail-row">
          <span>PO Number:</span>
          <span>{{po.number}}</span>
        </div>
        <div class="detail-row">
          <span>Issue Date:</span>
          <span>{{date po.date}}</span>
        </div>
        {{#section deliveryDetails}}
        <div class="detail-row">
          <span>Delivery Date:</span>
          <span>{{date po.deliveryDate}}</span>
        </div>
        {{/section}}
        {{#section totals}}
        <div class="detail-row">
          <span>Total Amount:</span>
          <span style="color: #059669; font-size: 18px;">{{currency po.totalAmount}} {{po.currency}}</span>
        </div>
        {{/section}}
      </div>
      
      {{#section lineItems}}
      {{#if po.items}}
      <table class="items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            {{#section descriptions}}
            <th>Details</th>
            {{/section}}
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {{#each po.items}}
          <tr>
            <td>{{@index}}</td>
            <td>{{this.description}}</td>
            {{#section descriptions}}
            <td>{{this.details}}</td>
            {{/section}}
            <td>{{this.quantity}} {{this.unit}}</td>
            <td>{{currency this.unitPrice}}</td>
            <td>{{currency this.totalPrice}}</td>
          </tr>
          {{/each}}
          {{#section totals}}
          <tr class="total-row">
            <td colspan="5" style="text-align: right;">Total:</td>
            <td>{{currency po.totalAmount}}</td>
          </tr>
          {{/section}}
        </tbody>
      </table>
      {{/if}}
      {{/section}}
      
      {{#section signature}}
      <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <p>Electronic Signature Required</p>
      </div>
      {{/section}}
    </div>
    
    {{#section footer}}
    <div class="footer">
      <p><strong>This is an automated message from STEELIQ Procurement System</strong></p>
      <p>© {{year}} {{company.name}}. All rights reserved.</p>
    </div>
    {{/section}}
  </div>
</body>
</html>`;

    try {
      // Check if templates already exist
      const existing = await db
        .select()
        .from(communicationTemplates)
        .where(eq(communicationTemplates.code, 'PO_STANDARD'))
        .limit(1);

      if (existing.length === 0) {
        // Create template
        const [template] = await db
          .insert(communicationTemplates)
          .values(standardPOTemplate)
          .returning();

        // Create version
        const [version] = await db
          .insert(templateVersions)
          .values({
            templateId: template.id,
            version: '1.0.0',
            versionNumber: 1,
            subjectTemplate: 'Purchase Order {{po.number}} - {{company.name}}',
            htmlTemplate: standardPOHtml,
            textTemplate: 'Purchase Order {{po.number}}\n\nDear {{supplier.name}},\n\n{{body}}\n\nTotal: {{currency po.totalAmount}}',
            changelog: 'Initial template creation'
          })
          .returning();

        // Update template with current version
        await db
          .update(communicationTemplates)
          .set({ currentVersionId: version.id })
          .where(eq(communicationTemplates.id, template.id));

        console.log('Created default PO template');
      }
    } catch (error) {
      console.error('Error creating default templates:', error);
    }
  }

  async logTemplateUsage(
    templateId: number,
    actorId: number,
    metadata: any = {}
  ): Promise<void> {
    try {
      await db.insert(templateAudit).values({
        templateId,
        action: 'used',
        actorId,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error logging template usage:', error);
    }
  }
}

export const templateService = new TemplateService();
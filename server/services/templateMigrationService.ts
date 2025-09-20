import { sql } from 'drizzle-orm';
import { db } from '../db';
import { 
  poTemplates, 
  communicationTemplates, 
  templateVersions,
  organizationBranding 
} from '@shared/schema';

export const templateMigrationService = {
  /**
   * Migrate legacy poTemplates to the new unified template system
   */
  async migratePOTemplates() {
    try {
      console.log('Starting PO template migration...');
      
      // Fetch all existing PO templates
      const existingTemplates = await db.select().from(poTemplates);
      console.log(`Found ${existingTemplates.length} PO templates to migrate`);

      // Get or create default organization branding
      const [branding] = await db.select().from(organizationBranding).limit(1);
      const defaultColors = branding || {
        primaryColor: '#1e3a8a',
        secondaryColor: '#3b82f6',
        accentColor: '#10b981'
      };

      for (const template of existingTemplates) {
        try {
          console.log(`Migrating template: ${template.templateName} (${template.templateCode})`);
          
          // Check if this template has already been migrated
          const [existing] = await db
            .select()
            .from(communicationTemplates)
            .where(sql`code = ${`PO_${template.templateCode}`}`)
            .limit(1);

          if (existing) {
            console.log(`Template ${template.templateCode} already migrated, skipping...`);
            continue;
          }

          // Create the main template record
          const [newTemplate] = await db.insert(communicationTemplates).values({
            code: `PO_${template.templateCode}`,
            name: template.templateName,
            type: 'PO',
            category: 'Documents',
            subCategory: template.category || 'standard',
            description: `Purchase Order Template: ${template.templateName}`,
            locale: 'en-NZ',
            scope: template.supplierId ? 'supplier' : 'org',
            scopeId: template.supplierId,
            status: 'published',
            isDefault: template.isDefault,
            defaultForScope: template.isDefault,
            theme: {
              colors: {
                primary: template.primaryColor || defaultColors.primaryColor,
                secondary: template.secondaryColor || defaultColors.secondaryColor,
                accent: defaultColors.accentColor,
                text: '#1f2937',
                background: '#ffffff'
              },
              fonts: {
                body: template.fontFamily || 'Arial, sans-serif',
                heading: template.fontFamily || 'Arial, sans-serif'
              },
              branding: {
                showLogo: template.showLogo,
                logoPosition: 'top-left'
              }
            },
            sections: {
              header: template.headerConfig || { show: true },
              items: template.columnsConfig || { show: true },
              footer: template.footerConfig || { show: true },
              terms: { show: true }
            },
            variables: {
              showPrices: template.showPrices,
              showGst: template.showGst,
              showDeliveryDate: template.showDeliveryDate,
              showPaymentTerms: template.showPaymentTerms,
              showItemCodes: template.showItemCodes,
              showContactDetails: template.showContactDetails,
              enableQrCode: template.enableQrCode,
              qrCodeContent: template.qrCodeContent
            },
            defaultOptions: {
              paperSize: 'A4',
              orientation: 'portrait',
              margins: {
                top: 20,
                bottom: 20,
                left: 20,
                right: 20
              }
            },
            defaultEditorMode: 'visual',
            createdBy: template.createdBy,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt
          }).returning();

          // Create template HTML content
          const templateHtml = this.generatePOTemplateHTML(template);
          
          // Create the initial version
          const [version] = await db.insert(templateVersions).values({
            templateId: newTemplate.id,
            version: '1.0.0',
            versionNumber: 1,
            subjectTemplate: `Purchase Order - {{orderNumber}}`,
            htmlTemplate: templateHtml,
            plainTextTemplate: this.stripHtml(templateHtml),
            changeDescription: 'Initial migration from legacy PO template',
            publishedAt: new Date(),
            createdBy: template.createdBy
          }).returning();

          // Update the template with current version
          await db
            .update(communicationTemplates)
            .set({ currentVersionId: version.id })
            .where(sql`id = ${newTemplate.id}`);

          console.log(`Successfully migrated template: ${template.templateName}`);
        } catch (error) {
          console.error(`Failed to migrate template ${template.templateName}:`, error);
        }
      }

      console.log('PO template migration completed');
      return { success: true, migratedCount: existingTemplates.length };
    } catch (error) {
      console.error('Template migration failed:', error);
      throw error;
    }
  },

  /**
   * Generate HTML template from legacy PO template settings
   */
  generatePOTemplateHTML(template: any): string {
    const terms = template.termsAndConditions || '';
    const instructions = template.specialInstructions || '';

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: ${template.fontFamily || 'Arial, sans-serif'}; 
      color: #1f2937;
      margin: 0;
      padding: 20px;
    }
    .header { 
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid ${template.primaryColor || '#1e3a8a'};
    }
    .logo { max-height: 80px; }
    .title { 
      color: ${template.primaryColor || '#1e3a8a'};
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .po-details {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .supplier-info {
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: ${template.primaryColor || '#1e3a8a'};
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .totals {
      text-align: right;
      margin-top: 20px;
    }
    .total-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 5px;
    }
    .total-label {
      font-weight: 600;
      margin-right: 20px;
      min-width: 100px;
    }
    .total-value {
      min-width: 120px;
      text-align: right;
    }
    .grand-total {
      font-size: 18px;
      font-weight: bold;
      color: ${template.primaryColor || '#1e3a8a'};
      border-top: 2px solid ${template.primaryColor || '#1e3a8a'};
      padding-top: 10px;
      margin-top: 10px;
    }
    .terms {
      margin-top: 30px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 8px;
      font-size: 12px;
      color: #6b7280;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
    ${template.enableQrCode ? `
    .qr-code {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 100px;
      height: 100px;
    }
    ` : ''}
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${template.showLogo !== false ? '<img src="{{companyLogo}}" alt="Company Logo" class="logo" />' : ''}
      <div class="title">PURCHASE ORDER</div>
      <div>{{companyName}}</div>
      ${template.showContactDetails !== false ? `
      <div>{{companyAddress}}</div>
      <div>{{companyPhone}} | {{companyEmail}}</div>
      ` : ''}
    </div>
    ${template.enableQrCode ? '<img src="{{qrCode}}" class="qr-code" />' : ''}
  </div>

  <div class="po-details">
    <div><strong>PO Number:</strong> {{orderNumber}}</div>
    <div><strong>Date:</strong> {{orderDate}}</div>
    ${template.showDeliveryDate !== false ? '<div><strong>Required By:</strong> {{deliveryDate}}</div>' : ''}
    ${template.showPaymentTerms !== false ? '<div><strong>Payment Terms:</strong> {{paymentTerms}}</div>' : ''}
    <div><strong>Job/Project:</strong> {{jobName}}</div>
  </div>

  <div class="supplier-info">
    <h3>Supplier Details</h3>
    <div>{{supplierName}}</div>
    <div>{{supplierAddress}}</div>
    <div>{{supplierContact}}</div>
  </div>

  <table>
    <thead>
      <tr>
        ${template.showItemCodes !== false ? '<th>Item Code</th>' : ''}
        <th>Description</th>
        <th>Quantity</th>
        <th>Unit</th>
        ${template.showPrices !== false ? `
        <th>Unit Price</th>
        <th>Total</th>
        ` : ''}
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        ${template.showItemCodes !== false ? '<td>{{itemCode}}</td>' : ''}
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{unit}}</td>
        ${template.showPrices !== false ? `
        <td>{{unitPrice}}</td>
        <td>{{lineTotal}}</td>
        ` : ''}
      </tr>
      {{/each}}
    </tbody>
  </table>

  ${template.showPrices !== false ? `
  <div class="totals">
    <div class="total-row">
      <span class="total-label">Subtotal:</span>
      <span class="total-value">{{subtotal}}</span>
    </div>
    ${template.showGst !== false ? `
    <div class="total-row">
      <span class="total-label">GST (15%):</span>
      <span class="total-value">{{gst}}</span>
    </div>
    ` : ''}
    <div class="total-row grand-total">
      <span class="total-label">Total:</span>
      <span class="total-value">{{total}}</span>
    </div>
  </div>
  ` : ''}

  ${instructions ? `
  <div class="terms">
    <h4>Special Instructions</h4>
    <p>${instructions}</p>
  </div>
  ` : ''}

  ${terms ? `
  <div class="terms">
    <h4>Terms & Conditions</h4>
    <p>${terms}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Thank you for your business</p>
    <p>{{companyName}} | {{companyWebsite}}</p>
  </div>
</body>
</html>`;
  },

  /**
   * Strip HTML tags for plain text version
   */
  stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Check migration status
   */
  async getMigrationStatus() {
    const poTemplateCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(poTemplates);
    
    const migratedCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(communicationTemplates)
      .where(sql`type = 'PO' AND code LIKE 'PO_%'`);

    return {
      totalPoTemplates: poTemplateCount[0]?.count || 0,
      migratedTemplates: migratedCount[0]?.count || 0,
      needsMigration: (poTemplateCount[0]?.count || 0) > (migratedCount[0]?.count || 0)
    };
  }
};
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { 
  communicationTemplates, 
  templateVersions,
  organizationBranding,
  organizationSettings,
  suppliers,
  clients
} from '@shared/schema';
import { templateHierarchyService } from './templateHierarchyService';
import chromium from '@sparticuz/chromium';
import path from 'path';

// Define standard template variables for each document type
export const TEMPLATE_VARIABLES = {
  PO: {
    // Organization variables
    'organization.name': 'Organization name',
    'organization.logo': 'Organization logo URL',
    'organization.address': 'Organization address',
    'organization.phone': 'Organization phone',
    'organization.email': 'Organization email',
    'organization.website': 'Organization website',
    'organization.abn': 'Organization ABN/Tax ID',
    
    // Supplier variables
    'supplier.name': 'Supplier name',
    'supplier.company': 'Supplier company',
    'supplier.address': 'Supplier address',
    'supplier.contact': 'Supplier contact person',
    'supplier.email': 'Supplier email',
    'supplier.phone': 'Supplier phone',
    
    // PO specific variables
    'po.number': 'Purchase order number',
    'po.date': 'Purchase order date',
    'po.deliveryDate': 'Required delivery date',
    'po.paymentTerms': 'Payment terms',
    'po.jobName': 'Associated job/project name',
    'po.jobNumber': 'Associated job number',
    'po.reference': 'Reference number',
    'po.status': 'PO status',
    
    // Financial variables
    'po.subtotal': 'Subtotal amount',
    'po.gst': 'GST/Tax amount',
    'po.total': 'Total amount',
    'po.currency': 'Currency symbol',
    
    // Items array
    'items': 'Array of line items',
    'item.code': 'Item code',
    'item.description': 'Item description',
    'item.quantity': 'Item quantity',
    'item.unit': 'Unit of measure',
    'item.unitPrice': 'Unit price',
    'item.lineTotal': 'Line total',
    
    // Additional
    'po.notes': 'Special instructions/notes',
    'po.terms': 'Terms and conditions',
    'po.authorizedBy': 'Authorized by name',
    'po.authorizedTitle': 'Authorizer title'
  },
  
  RFQ: {
    // Organization variables (same as PO)
    'organization.name': 'Organization name',
    'organization.logo': 'Organization logo URL',
    'organization.address': 'Organization address',
    'organization.phone': 'Organization phone',
    'organization.email': 'Organization email',
    'organization.website': 'Organization website',
    
    // Supplier variables (same as PO)
    'supplier.name': 'Supplier name',
    'supplier.company': 'Supplier company',
    'supplier.address': 'Supplier address',
    'supplier.contact': 'Supplier contact person',
    'supplier.email': 'Supplier email',
    'supplier.phone': 'Supplier phone',
    
    // RFQ specific variables
    'rfq.number': 'RFQ number',
    'rfq.date': 'RFQ issue date',
    'rfq.dueDate': 'Quote due date',
    'rfq.deliveryDate': 'Required delivery date',
    'rfq.jobName': 'Associated job/project name',
    'rfq.jobNumber': 'Associated job number',
    'rfq.reference': 'Reference number',
    'rfq.priority': 'Priority level',
    
    // Items array
    'items': 'Array of requested items',
    'item.code': 'Item code',
    'item.description': 'Item description',
    'item.quantity': 'Required quantity',
    'item.unit': 'Unit of measure',
    'item.specifications': 'Technical specifications',
    
    // Additional
    'rfq.instructions': 'Quote submission instructions',
    'rfq.evaluationCriteria': 'Evaluation criteria',
    'rfq.terms': 'Terms and conditions',
    'rfq.contactPerson': 'Contact person for queries',
    'rfq.contactEmail': 'Contact email',
    'rfq.contactPhone': 'Contact phone'
  },
  
  QUOTE: {
    // Organization variables
    'organization.name': 'Organization name',
    'organization.logo': 'Organization logo URL',
    'organization.address': 'Organization address',
    'organization.phone': 'Organization phone',
    'organization.email': 'Organization email',
    'organization.website': 'Organization website',
    'organization.abn': 'Organization ABN/Tax ID',
    
    // Client variables
    'client.name': 'Client name',
    'client.company': 'Client company',
    'client.address': 'Client address',
    'client.contact': 'Client contact person',
    'client.email': 'Client email',
    'client.phone': 'Client phone',
    
    // Quote specific variables
    'quote.number': 'Quote number',
    'quote.date': 'Quote date',
    'quote.validUntil': 'Quote validity date',
    'quote.jobName': 'Project/Job name',
    'quote.jobNumber': 'Job number',
    'quote.reference': 'Reference number',
    'quote.status': 'Quote status',
    
    // Financial variables
    'quote.subtotal': 'Subtotal amount',
    'quote.gst': 'GST/Tax amount',
    'quote.total': 'Total amount',
    'quote.currency': 'Currency symbol',
    'quote.discount': 'Discount amount/percentage',
    
    // Items array
    'items': 'Array of quoted items',
    'item.code': 'Item code',
    'item.description': 'Item description',
    'item.quantity': 'Quantity',
    'item.unit': 'Unit of measure',
    'item.unitPrice': 'Unit price',
    'item.lineTotal': 'Line total',
    
    // Additional
    'quote.notes': 'Additional notes',
    'quote.terms': 'Terms and conditions',
    'quote.paymentTerms': 'Payment terms',
    'quote.deliveryTerms': 'Delivery terms',
    'quote.preparedBy': 'Prepared by name',
    'quote.approvedBy': 'Approved by name'
  },
  
  INVOICE: {
    // Organization variables
    'organization.name': 'Organization name',
    'organization.logo': 'Organization logo URL',
    'organization.address': 'Organization address',
    'organization.phone': 'Organization phone',
    'organization.email': 'Organization email',
    'organization.website': 'Organization website',
    'organization.abn': 'Organization ABN/Tax ID',
    'organization.bankDetails': 'Bank account details',
    
    // Client variables
    'client.name': 'Client name',
    'client.company': 'Client company',
    'client.address': 'Client billing address',
    'client.contact': 'Client contact person',
    'client.email': 'Client email',
    'client.phone': 'Client phone',
    
    // Invoice specific variables
    'invoice.number': 'Invoice number',
    'invoice.date': 'Invoice date',
    'invoice.dueDate': 'Payment due date',
    'invoice.poNumber': 'Purchase order reference',
    'invoice.jobNumber': 'Job reference',
    'invoice.status': 'Invoice status',
    
    // Financial variables
    'invoice.subtotal': 'Subtotal amount',
    'invoice.gst': 'GST/Tax amount',
    'invoice.total': 'Total amount',
    'invoice.currency': 'Currency symbol',
    'invoice.amountPaid': 'Amount paid',
    'invoice.balanceDue': 'Balance due',
    
    // Items array
    'items': 'Array of invoice items',
    'item.description': 'Item/Service description',
    'item.quantity': 'Quantity',
    'item.unit': 'Unit of measure',
    'item.unitPrice': 'Unit price',
    'item.lineTotal': 'Line total',
    
    // Additional
    'invoice.notes': 'Invoice notes',
    'invoice.terms': 'Payment terms and conditions',
    'invoice.paymentMethods': 'Accepted payment methods',
    'invoice.lateFee': 'Late payment fee details'
  }
};

// Register Handlebars helpers for common formatting
Handlebars.registerHelper('formatCurrency', (amount: number) => {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD'
  }).format(amount || 0);
});

Handlebars.registerHelper('formatDate', (date: Date | string) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-NZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

Handlebars.registerHelper('formatNumber', (num: number) => {
  return new Intl.NumberFormat('en-NZ').format(num || 0);
});

Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
Handlebars.registerHelper('lt', (a: number, b: number) => a < b);
Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
Handlebars.registerHelper('lte', (a: number, b: number) => a <= b);
Handlebars.registerHelper('gte', (a: number, b: number) => a >= b);

export class PDFGenerationService {
  private browser: any = null;

  /**
   * Initialize Puppeteer browser instance
   */
  private async initBrowser() {
    if (this.browser) return this.browser;

    try {
      // Use Chromium for serverless environments
      this.browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    } catch (error) {
      // Fallback for local development
      console.log('Falling back to local Puppeteer');
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    return this.browser;
  }

  /**
   * Generate PDF from template and data
   */
  async generatePDF(options: {
    templateType: string;
    templateCode?: string;
    supplierId?: number;
    clientId?: number;
    data: any;
    outputPath?: string;
  }): Promise<Buffer> {
    let page;
    
    try {
      // Get the appropriate template
      const template = await this.getTemplate(options.templateType, options.templateCode, options.supplierId);
      
      if (!template) {
        throw new Error(`No template found for type: ${options.templateType}`);
      }

      // Get organization branding
      const branding = await templateHierarchyService.getOrganizationBranding();
      
      // Prepare template data with branding
      const templateData = this.prepareTemplateData(options.templateType, options.data, branding);
      
      // Compile and render the template
      const compiledTemplate = Handlebars.compile(template.htmlTemplate);
      const html = compiledTemplate(templateData);
      
      // Create PDF with Puppeteer
      await this.initBrowser();
      page = await this.browser.newPage();
      
      // Set the HTML content
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });
      
      // Generate PDF with A4 format
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: template.defaultOptions?.margins?.top || '20mm',
          bottom: template.defaultOptions?.margins?.bottom || '20mm',
          left: template.defaultOptions?.margins?.left || '20mm',
          right: template.defaultOptions?.margins?.right || '20mm',
        },
        displayHeaderFooter: false
      });
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Get the appropriate template based on hierarchy
   */
  private async getTemplate(type: string, code?: string, supplierId?: number) {
    // First check for supplier-specific override
    if (supplierId) {
      const supplierTemplate = await templateHierarchyService.getSupplierTemplate(supplierId, type);
      if (supplierTemplate) return supplierTemplate;
    }
    
    // Then check for specific template by code
    if (code) {
      const [template] = await db
        .select({
          id: communicationTemplates.id,
          code: communicationTemplates.code,
          name: communicationTemplates.name,
          htmlTemplate: templateVersions.htmlTemplate,
          defaultOptions: communicationTemplates.defaultOptions,
          theme: communicationTemplates.theme
        })
        .from(communicationTemplates)
        .leftJoin(templateVersions, sql`${templateVersions.id} = ${communicationTemplates.currentVersionId}`)
        .where(sql`${communicationTemplates.code} = ${code} AND ${communicationTemplates.type} = ${type}`)
        .limit(1);
      
      if (template) return template;
    }
    
    // Finally get default template for the type
    const [defaultTemplate] = await db
      .select({
        id: communicationTemplates.id,
        code: communicationTemplates.code,
        name: communicationTemplates.name,
        htmlTemplate: templateVersions.htmlTemplate,
        defaultOptions: communicationTemplates.defaultOptions,
        theme: communicationTemplates.theme
      })
      .from(communicationTemplates)
      .leftJoin(templateVersions, sql`${templateVersions.id} = ${communicationTemplates.currentVersionId}`)
      .where(sql`${communicationTemplates.type} = ${type} AND ${communicationTemplates.isDefault} = true`)
      .limit(1);
    
    return defaultTemplate;
  }

  /**
   * Prepare template data with all necessary variables
   */
  private prepareTemplateData(type: string, data: any, branding: any) {
    // Base organization data
    const organization = {
      name: branding?.companyName || 'Lateral Engineering Limited',
      logo: branding?.logoUrl || '/assets/lateral-engineering-logo.jpg',
      address: branding?.address || '',
      phone: branding?.phone || '',
      email: branding?.email || 'accounts@lateralengineering.co.nz',
      website: branding?.website || 'www.lateralengineering.co.nz',
      abn: branding?.abn || '',
      primaryColor: branding?.primaryColor || '#1e3a8a',
      secondaryColor: branding?.secondaryColor || '#3b82f6',
      accentColor: branding?.accentColor || '#10b981'
    };

    // Merge with provided data
    return {
      organization,
      ...data,
      // Ensure date formatting
      currentDate: new Date().toLocaleDateString('en-NZ'),
      currentYear: new Date().getFullYear()
    };
  }

  /**
   * Generate preview HTML for template
   */
  async generatePreview(templateId: string, sampleData?: any): Promise<string> {
    const [template] = await db
      .select({
        htmlTemplate: templateVersions.htmlTemplate,
        type: communicationTemplates.type
      })
      .from(communicationTemplates)
      .leftJoin(templateVersions, sql`${templateVersions.id} = ${communicationTemplates.currentVersionId}`)
      .where(sql`${communicationTemplates.id} = ${templateId}`)
      .limit(1);
    
    if (!template) {
      throw new Error('Template not found');
    }

    const branding = await templateHierarchyService.getOrganizationBranding();
    const data = sampleData || this.getSampleData(template.type);
    const templateData = this.prepareTemplateData(template.type, data, branding);
    
    const compiledTemplate = Handlebars.compile(template.htmlTemplate);
    return compiledTemplate(templateData);
  }

  /**
   * Get sample data for template preview
   */
  private getSampleData(type: string) {
    const sampleData: any = {
      supplier: {
        name: 'ABC Steel Supplies',
        company: 'ABC Steel Supplies Ltd',
        address: '123 Industrial Way, Auckland',
        contact: 'John Smith',
        email: 'john@abcsteel.com',
        phone: '09-123-4567'
      },
      client: {
        name: 'XYZ Construction',
        company: 'XYZ Construction Ltd',
        address: '456 Builder Street, Wellington',
        contact: 'Jane Doe',
        email: 'jane@xyzcons.com',
        phone: '04-987-6543'
      },
      items: [
        {
          code: 'STL-001',
          description: '100x50x3 RHS Steel Beam - 6m Length',
          quantity: 10,
          unit: 'EA',
          unitPrice: 250.00,
          lineTotal: 2500.00
        },
        {
          code: 'STL-002',
          description: '150x150x5 SHS Steel Post - 3m Length',
          quantity: 5,
          unit: 'EA',
          unitPrice: 350.00,
          lineTotal: 1750.00
        }
      ]
    };

    switch (type) {
      case 'PO':
        return {
          ...sampleData,
          po: {
            number: 'PO-2024-0001',
            date: new Date(),
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            paymentTerms: '30 Days',
            jobName: 'Wellington Office Building',
            jobNumber: 'JOB-2024-123',
            subtotal: 4250.00,
            gst: 637.50,
            total: 4887.50,
            notes: 'Please deliver to site entrance and notify site manager.',
            authorizedBy: 'Adam Green',
            authorizedTitle: 'Procurement Manager'
          }
        };

      case 'RFQ':
        return {
          ...sampleData,
          rfq: {
            number: 'RFQ-2024-0001',
            date: new Date(),
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            jobName: 'Auckland Bridge Project',
            jobNumber: 'JOB-2024-456',
            priority: 'High',
            instructions: 'Please submit your quote via email by the due date.',
            contactPerson: 'Adam Green',
            contactEmail: 'adam.green@lateraleng.co.nz',
            contactPhone: '021-123-4567'
          }
        };

      case 'QUOTE':
        return {
          ...sampleData,
          quote: {
            number: 'Q-2024-0001',
            date: new Date(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            jobName: 'Commercial Warehouse Fitout',
            jobNumber: 'JOB-2024-789',
            subtotal: 4250.00,
            gst: 637.50,
            total: 4887.50,
            paymentTerms: '50% deposit, balance on completion',
            deliveryTerms: '2-3 weeks from order confirmation',
            preparedBy: 'Adam Green',
            approvedBy: 'Sarah Johnson'
          }
        };

      case 'INVOICE':
        return {
          ...sampleData,
          invoice: {
            number: 'INV-2024-0001',
            date: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            poNumber: 'PO-2024-0001',
            jobNumber: 'JOB-2024-123',
            subtotal: 4250.00,
            gst: 637.50,
            total: 4887.50,
            amountPaid: 0,
            balanceDue: 4887.50,
            paymentMethods: 'Bank transfer or credit card',
            terms: 'Payment due within 30 days of invoice date'
          }
        };

      default:
        return sampleData;
    }
  }

  /**
   * Cleanup browser instance
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Export singleton instance
export const pdfGenerationService = new PDFGenerationService();
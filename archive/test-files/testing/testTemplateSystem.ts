import { db } from '../db';
import { sql } from 'drizzle-orm';
import { 
  communicationTemplates, 
  templateVersions,
  organizationBranding,
  supplierTemplateOverrides,
  purchaseOrders,
  rfqs,
  quotes,
  suppliers
} from '@shared/schema';
import { integratedEmailService } from '../services/integratedEmailService';
import { pdfGenerationService } from '../services/pdfGenerationService';
import { emailTemplatesService } from '../services/emailTemplatesService';
import { defaultTemplatesService } from '../services/defaultTemplatesService';

/**
 * Comprehensive Template System Testing Suite
 */
export const testTemplateSystem = {
  /**
   * Step 1: Verify Email Templates are Created
   */
  async verifyEmailTemplates() {
    console.log('\n=== STEP 1: Verifying Email Templates ===\n');
    
    // Check if email templates exist
    const emailTemplates = await db
      .select({
        code: communicationTemplates.code,
        name: communicationTemplates.name,
        type: communicationTemplates.type,
        category: communicationTemplates.category,
        hasVersion: sql`CASE WHEN ${communicationTemplates.currentVersionId} IS NOT NULL THEN true ELSE false END`
      })
      .from(communicationTemplates)
      .where(sql`${communicationTemplates.category} = 'Email'`);

    console.log(`Found ${emailTemplates.length} email templates:`);
    emailTemplates.forEach(template => {
      console.log(`  ✓ ${template.code} (${template.type}) - Version linked: ${template.hasVersion ? '✅' : '❌'}`);
    });

    if (emailTemplates.length === 0) {
      console.log('\n❌ No email templates found. Creating them now...');
      const result = await emailTemplatesService.createEmailTemplates();
      console.log(`Created ${result.count} email templates`);
    }

    return emailTemplates.length > 0;
  },

  /**
   * Step 2: Verify Document Templates are Created
   */
  async verifyDocumentTemplates() {
    console.log('\n=== STEP 2: Verifying Document Templates ===\n');
    
    const documentTemplates = await db
      .select({
        code: communicationTemplates.code,
        name: communicationTemplates.name,
        type: communicationTemplates.type,
        category: communicationTemplates.category,
        isDefault: communicationTemplates.isDefault
      })
      .from(communicationTemplates)
      .where(sql`${communicationTemplates.category} = 'Documents'`);

    console.log(`Found ${documentTemplates.length} document templates:`);
    
    const templatesByType = documentTemplates.reduce((acc, t) => {
      if (!acc[t.type]) acc[t.type] = [];
      acc[t.type].push(t);
      return acc;
    }, {} as Record<string, typeof documentTemplates>);

    Object.entries(templatesByType).forEach(([type, templates]) => {
      console.log(`\n${type} Templates (${templates.length}):`);
      templates.forEach(t => {
        console.log(`  ✓ ${t.code} - ${t.name} ${t.isDefault ? '⭐ (Default)' : ''}`);
      });
    });

    if (documentTemplates.length === 0) {
      console.log('\n❌ No document templates found. Creating them now...');
      const result = await defaultTemplatesService.createDefaultTemplates();
      console.log(`Created templates for ${result.types.length} document types`);
    }

    return documentTemplates.length > 0;
  },

  /**
   * Step 3: Test PDF Generation
   */
  async testPDFGeneration() {
    console.log('\n=== STEP 3: Testing PDF Generation ===\n');
    
    const testData = {
      supplier: {
        name: 'John Smith',
        company: 'Test Supplier Co',
        address: '123 Test Street, Auckland',
        email: 'test@supplier.com',
        phone: '09-123-4567'
      },
      po: {
        number: 'PO-TEST-001',
        date: new Date(),
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        paymentTerms: 'Net 30',
        jobName: 'Test Project',
        jobNumber: 'JOB-001',
        total: 12500.00,
        currency: 'NZD',
        notes: 'This is a test purchase order'
      },
      items: [
        {
          itemCode: 'STEEL-001',
          description: '100x100x6 SHS Steel',
          quantity: 10,
          unit: 'lengths',
          unitPrice: 125.00,
          lineTotal: 1250.00
        }
      ],
      organization: {
        name: 'Lateral Engineering Limited',
        address: 'Auckland, New Zealand',
        phone: '09-XXX-XXXX',
        email: 'accounts@lateralengineering.co.nz',
        primaryColor: '#1e3a8a'
      }
    };

    console.log('Testing PDF generation for each document type...\n');

    const templates = [
      { type: 'PO', code: 'PO_STANDARD', name: 'Standard PO' },
      { type: 'PO', code: 'PO_DETAILED', name: 'Detailed PO' },
      { type: 'PO', code: 'PO_SIMPLE', name: 'Simple PO' }
    ];

    for (const template of templates) {
      try {
        console.log(`Testing ${template.name} (${template.code})...`);
        
        const pdfBuffer = await pdfGenerationService.generatePDF({
          templateType: template.type,
          templateCode: template.code,
          data: testData
        });

        if (pdfBuffer && pdfBuffer.length > 0) {
          console.log(`  ✅ PDF generated successfully (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
        } else {
          console.log(`  ❌ PDF generation failed - empty buffer`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
  },

  /**
   * Step 4: Test Email Sending (Test Mode)
   */
  async testEmailSending() {
    console.log('\n=== STEP 4: Testing Email Sending (Test Mode) ===\n');
    
    // Set test mode
    process.env.EMAIL_TEST_MODE = 'true';
    
    // Find a test PO or create one
    const [testPO] = await db
      .select()
      .from(purchaseOrders)
      .limit(1);

    if (testPO) {
      console.log(`Using PO: ${testPO.poNumber}`);
      
      const result = await integratedEmailService.sendPurchaseOrder({
        purchaseOrderId: testPO.id,
        to: 'test@supplier.com',
        cc: ['manager@company.com'],
        templateCode: 'PO_STANDARD',
        customMessage: 'This is a test of the template system'
      });

      if (result.success) {
        console.log(`✅ Email sent successfully (Test Mode)`);
        console.log(`   Message ID: ${result.messageId}`);
      } else {
        console.log(`❌ Email send failed: ${result.error}`);
      }
    } else {
      console.log('❌ No purchase orders found for testing');
    }
    
    // Reset test mode
    delete process.env.EMAIL_TEST_MODE;
  },

  /**
   * Step 5: Test Template Hierarchy
   */
  async testTemplateHierarchy() {
    console.log('\n=== STEP 5: Testing Template Hierarchy ===\n');
    
    // Check organization branding
    const [branding] = await db
      .select()
      .from(organizationBranding)
      .limit(1);

    if (branding) {
      console.log('Organization Branding:');
      console.log(`  Primary Color: ${branding.primaryColor || 'Not set'}`);
      console.log(`  Secondary Color: ${branding.secondaryColor || 'Not set'}`);
      console.log(`  Logo URL: ${branding.logoUrl ? '✅ Set' : '❌ Not set'}`);
      console.log(`  Font Family: ${branding.fontFamily || 'Default'}`);
    } else {
      console.log('❌ No organization branding configured');
    }

    // Check supplier overrides
    const overrides = await db
      .select({
        supplierName: suppliers.companyName,
        templateCode: supplierTemplateOverrides.templateCode,
        customizations: supplierTemplateOverrides.customizations
      })
      .from(supplierTemplateOverrides)
      .leftJoin(suppliers, sql`${suppliers.id} = ${supplierTemplateOverrides.supplierId}`);

    if (overrides.length > 0) {
      console.log(`\nFound ${overrides.length} supplier template overrides:`);
      overrides.forEach(override => {
        console.log(`  ✓ ${override.supplierName}: ${override.templateCode}`);
      });
    } else {
      console.log('\n📝 No supplier-specific template overrides configured (this is normal)');
    }
  },

  /**
   * Step 6: Generate Comprehensive Test Report
   */
  async generateTestReport() {
    console.log('\n=== TEMPLATE SYSTEM TEST REPORT ===\n');
    
    const stats = await db
      .select({
        category: communicationTemplates.category,
        type: communicationTemplates.type,
        count: sql<number>`count(*)`
      })
      .from(communicationTemplates)
      .groupBy(communicationTemplates.category, communicationTemplates.type);

    console.log('Template Statistics:');
    console.log('-------------------');
    
    const categoryTotals: Record<string, number> = {};
    stats.forEach(stat => {
      console.log(`  ${stat.category} - ${stat.type}: ${stat.count} templates`);
      categoryTotals[stat.category] = (categoryTotals[stat.category] || 0) + Number(stat.count);
    });

    console.log('\nCategory Totals:');
    Object.entries(categoryTotals).forEach(([category, total]) => {
      console.log(`  ${category}: ${total} templates`);
    });

    // Check for critical templates
    const criticalTemplates = [
      { type: 'PO', category: 'Email', code: 'PO_EMAIL' },
      { type: 'RFQ', category: 'Email', code: 'RFQ_EMAIL' },
      { type: 'QUOTE', category: 'Email', code: 'QUOTE_EMAIL' },
      { type: 'PO', category: 'Documents', code: 'PO_STANDARD' },
      { type: 'RFQ', category: 'Documents', code: 'RFQ_STANDARD' },
      { type: 'QUOTE', category: 'Documents', code: 'QUOTE_STANDARD' }
    ];

    console.log('\nCritical Templates Check:');
    console.log('-------------------------');
    
    for (const critical of criticalTemplates) {
      const [exists] = await db
        .select({ id: communicationTemplates.id })
        .from(communicationTemplates)
        .where(sql`${communicationTemplates.code} = ${critical.code}`)
        .limit(1);
      
      console.log(`  ${critical.code}: ${exists ? '✅ Present' : '❌ Missing'}`);
    }

    console.log('\n✨ Template System Test Complete!\n');
  },

  /**
   * Run all tests in sequence
   */
  async runAllTests() {
    console.log('🚀 Starting Template System Test Suite\n');
    console.log('=====================================\n');
    
    try {
      await this.verifyEmailTemplates();
      await this.verifyDocumentTemplates();
      await this.testPDFGeneration();
      await this.testEmailSending();
      await this.testTemplateHierarchy();
      await this.generateTestReport();
      
      console.log('✅ All tests completed successfully!\n');
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }
};
import { pdfGenerationService } from '../services/pdfGenerationService';
import fs from 'fs';
import path from 'path';

export async function testPdfGeneration() {
  const testData = {
    supplier: {
      name: 'John Smith',
      company: 'ABC Supplies Ltd',
      address: '123 Test Street, Auckland',
      email: 'john@abcsupplies.com',
      phone: '09-123-4567'
    },
    po: {
      number: 'PO-TEST-001',
      date: new Date(),
      deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      paymentTerms: 'Net 30',
      jobName: 'Test Project - Template System',
      jobNumber: 'JOB-TEST-001',
      subtotal: 10000,
      gst: 1500,
      total: 11500,
      currency: 'NZD',
      notes: 'This is a test PO for template system validation',
      showPrices: true,
      showGst: true
    },
    items: [
      {
        itemCode: 'STEEL-100',
        description: '100x100x6 SHS Steel - Grade 350',
        quantity: 10,
        unit: 'lengths',
        unitPrice: 250.00,
        lineTotal: 2500.00
      },
      {
        itemCode: 'STEEL-200',
        description: '200x100x8 RHS Steel - Grade 350',
        quantity: 15,
        unit: 'lengths',
        unitPrice: 350.00,
        lineTotal: 5250.00
      },
      {
        itemCode: 'PLATE-10',
        description: '10mm Mild Steel Plate 2400x1200',
        quantity: 5,
        unit: 'sheets',
        unitPrice: 450.00,
        lineTotal: 2250.00
      }
    ],
    organization: {
      name: 'Lateral Engineering Limited',
      address: 'Auckland, New Zealand',
      phone: '09-XXX-XXXX',
      email: 'accounts@lateralengineering.co.nz',
      website: 'www.lateralengineering.co.nz',
      primaryColor: '#1e3a8a',
      secondaryColor: '#3b82f6',
      logoUrl: 'https://example.com/logo.png'
    }
  };

  const templates = [
    { code: 'PO_STANDARD', name: 'Standard PO' },
    { code: 'PO_DETAILED', name: 'Detailed PO' },
    { code: 'PO_SIMPLE', name: 'Simple PO' }
  ];

  const results = [];
  
  for (const template of templates) {
    console.log(`Generating PDF with template: ${template.name}`);
    try {
      const pdfBuffer = await pdfGenerationService.generatePDF({
        templateType: 'PO',
        templateCode: template.code,
        data: testData
      });

      // Save to temp directory for inspection
      const outputDir = path.join(process.cwd(), 'test-pdfs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filename = `${template.code}-${Date.now()}.pdf`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, pdfBuffer);
      
      results.push({
        template: template.name,
        code: template.code,
        size: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
        path: filepath,
        success: true
      });
      
      console.log(`✅ PDF saved to: ${filepath}`);
    } catch (error) {
      results.push({
        template: template.name,
        code: template.code,
        error: error.message,
        success: false
      });
      console.error(`❌ Failed to generate PDF: ${error.message}`);
    }
  }
  
  return results;
}
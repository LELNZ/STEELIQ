import { db } from './db';
import { communicationTemplates, templateVersions } from '@shared/schema';
import { professionalTemplates, sampleData } from './templateContent';

export async function populateAllTemplates() {
  try {
    // Delete existing templates
    await db.delete(templateVersions);
    await db.delete(communicationTemplates);
    
    const templateData = [
      { code: 'PO_STANDARD', name: 'Standard Purchase Order', type: 'PO', template: professionalTemplates.PO_STANDARD, sample: sampleData.PO },
      { code: 'PO_DETAILED', name: 'Detailed Purchase Order', type: 'PO', template: professionalTemplates.PO_STANDARD, sample: sampleData.PO },
      { code: 'PO_SIMPLE', name: 'Simple Purchase Order', type: 'PO', template: professionalTemplates.PO_STANDARD, sample: sampleData.PO },
      { code: 'RFQ_STANDARD', name: 'Standard RFQ', type: 'RFQ', template: professionalTemplates.RFQ_STANDARD, sample: sampleData.RFQ },
      { code: 'RFQ_DETAILED', name: 'Detailed RFQ', type: 'RFQ', template: professionalTemplates.RFQ_STANDARD, sample: sampleData.RFQ },
      { code: 'QUOTE_PROFESSIONAL', name: 'Professional Quote', type: 'Quote', template: professionalTemplates.QUOTE_PROFESSIONAL, sample: sampleData.Quote },
      { code: 'QUOTE_SIMPLE', name: 'Simple Quote', type: 'Quote', template: professionalTemplates.QUOTE_PROFESSIONAL, sample: sampleData.Quote },
      { code: 'INVOICE_STANDARD', name: 'Standard Invoice', type: 'Invoice', template: professionalTemplates.INVOICE_STANDARD, sample: sampleData.Invoice },
      { code: 'INVOICE_DETAILED', name: 'Detailed Invoice', type: 'Invoice', template: professionalTemplates.INVOICE_STANDARD, sample: sampleData.Invoice },
      { code: 'RECEIPT_STANDARD', name: 'Payment Receipt', type: 'Receipt', template: professionalTemplates.RECEIPT_STANDARD, sample: sampleData.Receipt },
      { code: 'DELIVERY_STANDARD', name: 'Delivery Note', type: 'DeliveryNote', template: professionalTemplates.DELIVERY_STANDARD, sample: sampleData.DeliveryNote },
      { code: 'EMAIL_PO_ACCEPTANCE', name: 'PO Acceptance Email', type: 'AcceptanceEmail', template: professionalTemplates.EMAIL_PO_ACCEPTANCE, sample: sampleData.AcceptanceEmail },
      { code: 'EMAIL_PO_REJECTION', name: 'PO Rejection Email', type: 'RejectionEmail', template: professionalTemplates.EMAIL_PO_REJECTION, sample: sampleData.RejectionEmail },
      { code: 'EMAIL_RFQ_FOLLOWUP', name: 'RFQ Follow-up Email', type: 'FollowUp', template: professionalTemplates.EMAIL_RFQ_FOLLOWUP, sample: sampleData.FollowUp },
      { code: 'EMAIL_PAYMENT_REMINDER', name: 'Payment Reminder', type: 'Reminders', template: professionalTemplates.EMAIL_PAYMENT_REMINDER, sample: sampleData.Reminders },
      { code: 'EMAIL_DELIVERY_REMINDER', name: 'Delivery Reminder', type: 'Reminders', template: professionalTemplates.EMAIL_DELIVERY_REMINDER, sample: sampleData.Reminders }
    ];
    
    for (const data of templateData) {
      // Insert template
      const [template] = await db.insert(communicationTemplates).values({
        code: data.code,
        name: data.name,
        type: data.type as any,
        category: data.type.includes('Email') || data.type.includes('Acceptance') || data.type.includes('Rejection') || data.type.includes('Follow') || data.type.includes('Reminder') ? 'Communications' : 'Documents',
        description: `Professional ${data.name.toLowerCase()} template`,
        locale: 'en-NZ',
        scope: 'global',
        status: 'active',
        isDefault: true,
        defaultForScope: true,
        theme: {
          primaryColor: '#2563eb',
          secondaryColor: '#64748b',
          accentColor: '#10b981',
          fontFamily: 'Helvetica Neue, Arial, sans-serif'
        },
        variables: Object.keys(data.sample),
        defaultOptions: { sampleData: data.sample },
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      // Insert version
      const [version] = await db.insert(templateVersions).values({
        templateId: template.id,
        version: '1.0.0',
        versionNumber: 1,
        htmlTemplate: data.template.html,
        subjectTemplate: data.template.subject,
        textTemplate: '',
        changelog: 'Initial professional template',
        publishedAt: new Date(),
        createdAt: new Date()
      }).returning();
      
      // Update current version
      await db.update(communicationTemplates)
        .set({ currentVersionId: version.id })
        .where(db.sql`id = ${template.id}`);
      
      console.log(`Created template: ${data.name}`);
    }
    
    console.log('Successfully populated all professional templates');
    return { success: true };
    
  } catch (error) {
    console.error('Error populating templates:', error);
    return { success: false, error };
  }
}

// Run if called directly
if (require.main === module) {
  populateAllTemplates().then(result => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}
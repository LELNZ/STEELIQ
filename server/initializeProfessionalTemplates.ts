import { db } from './db';
import { communicationTemplates, templateVersions } from '@shared/schema';
import { professionalTemplates, sampleData } from './templateContent';

export async function initializeProfessionalTemplates() {
  try {
    // Check if templates already exist
    const existingTemplates = await db.select().from(communicationTemplates).limit(1);
    if (existingTemplates.length > 0) {
      console.log('Templates already exist');
      return { success: false, message: 'Templates already exist' };
    }

    const templates = [
      // Purchase Order Templates
      {
        code: 'PO_STANDARD',
        name: 'Standard Purchase Order',
        type: 'PO',
        category: 'Documents',
        description: 'Professional purchase order template with comprehensive details',
        html: professionalTemplates.PO_STANDARD.html,
        subject: professionalTemplates.PO_STANDARD.subject,
        sampleData: sampleData.PO
      },
      {
        code: 'PO_DETAILED',
        name: 'Detailed Purchase Order',
        type: 'PO',
        category: 'Documents',
        description: 'Detailed PO with extended specifications and terms',
        html: professionalTemplates.PO_STANDARD.html,
        subject: professionalTemplates.PO_STANDARD.subject,
        sampleData: sampleData.PO
      },
      {
        code: 'PO_SIMPLE',
        name: 'Simple Purchase Order',
        type: 'PO',
        category: 'Documents',
        description: 'Simplified PO for quick orders',
        html: professionalTemplates.PO_STANDARD.html,
        subject: professionalTemplates.PO_STANDARD.subject,
        sampleData: sampleData.PO
      },
      // RFQ Templates
      {
        code: 'RFQ_STANDARD',
        name: 'Standard RFQ',
        type: 'RFQ',
        category: 'Documents',
        description: 'Professional request for quotation template',
        html: professionalTemplates.RFQ_STANDARD.html,
        subject: professionalTemplates.RFQ_STANDARD.subject,
        sampleData: sampleData.RFQ
      },
      {
        code: 'RFQ_DETAILED',
        name: 'Detailed RFQ',
        type: 'RFQ',
        category: 'Documents',
        description: 'Detailed RFQ with technical specifications',
        html: professionalTemplates.RFQ_STANDARD.html,
        subject: professionalTemplates.RFQ_STANDARD.subject,
        sampleData: sampleData.RFQ
      },
      // Quote Templates
      {
        code: 'QUOTE_PROFESSIONAL',
        name: 'Professional Quote',
        type: 'Quote',
        category: 'Documents',
        description: 'Professional quote template with detailed breakdown',
        html: professionalTemplates.QUOTE_PROFESSIONAL.html,
        subject: professionalTemplates.QUOTE_PROFESSIONAL.subject,
        sampleData: sampleData.Quote
      },
      {
        code: 'QUOTE_SIMPLE',
        name: 'Simple Quote',
        type: 'Quote',
        category: 'Documents',
        description: 'Simple quote template for quick estimates',
        html: professionalTemplates.QUOTE_PROFESSIONAL.html,
        subject: professionalTemplates.QUOTE_PROFESSIONAL.subject,
        sampleData: sampleData.Quote
      },
      // Invoice Templates
      {
        code: 'INVOICE_STANDARD',
        name: 'Standard Invoice',
        type: 'Invoice',
        category: 'Documents',
        description: 'Professional invoice template with payment details',
        html: professionalTemplates.INVOICE_STANDARD.html,
        subject: professionalTemplates.INVOICE_STANDARD.subject,
        sampleData: sampleData.Invoice
      },
      {
        code: 'INVOICE_DETAILED',
        name: 'Detailed Invoice',
        type: 'Invoice',
        category: 'Documents',
        description: 'Detailed invoice with itemized breakdown',
        html: professionalTemplates.INVOICE_STANDARD.html,
        subject: professionalTemplates.INVOICE_STANDARD.subject,
        sampleData: sampleData.Invoice
      },
      // Receipt Templates
      {
        code: 'RECEIPT_STANDARD',
        name: 'Payment Receipt',
        type: 'Receipt',
        category: 'Documents',
        description: 'Professional payment receipt template',
        html: professionalTemplates.RECEIPT_STANDARD.html,
        subject: professionalTemplates.RECEIPT_STANDARD.subject,
        sampleData: sampleData.Receipt
      },
      // Delivery Note Templates
      {
        code: 'DELIVERY_STANDARD',
        name: 'Delivery Note',
        type: 'DeliveryNote',
        category: 'Documents',
        description: 'Professional delivery note with signature sections',
        html: professionalTemplates.DELIVERY_STANDARD.html,
        subject: professionalTemplates.DELIVERY_STANDARD.subject,
        sampleData: sampleData.DeliveryNote
      },
      // Email Templates
      {
        code: 'EMAIL_PO_ACCEPTANCE',
        name: 'PO Acceptance Email',
        type: 'AcceptanceEmail',
        category: 'Communications',
        description: 'Professional acceptance notification email',
        html: professionalTemplates.EMAIL_PO_ACCEPTANCE.html,
        subject: professionalTemplates.EMAIL_PO_ACCEPTANCE.subject,
        sampleData: sampleData.AcceptanceEmail
      },
      {
        code: 'EMAIL_PO_REJECTION',
        name: 'PO Rejection Email',
        type: 'RejectionEmail',
        category: 'Communications',
        description: 'Professional rejection notification email',
        html: professionalTemplates.EMAIL_PO_REJECTION.html,
        subject: professionalTemplates.EMAIL_PO_REJECTION.subject,
        sampleData: sampleData.RejectionEmail
      },
      {
        code: 'EMAIL_RFQ_FOLLOWUP',
        name: 'RFQ Follow-up Email',
        type: 'FollowUp',
        category: 'Communications',
        description: 'Professional follow-up email for pending RFQs',
        html: professionalTemplates.EMAIL_RFQ_FOLLOWUP.html,
        subject: professionalTemplates.EMAIL_RFQ_FOLLOWUP.subject,
        sampleData: sampleData.FollowUp
      },
      {
        code: 'EMAIL_PAYMENT_REMINDER',
        name: 'Payment Reminder',
        type: 'Reminders',
        category: 'Communications',
        description: 'Professional payment reminder for overdue invoices',
        html: professionalTemplates.EMAIL_PAYMENT_REMINDER.html,
        subject: professionalTemplates.EMAIL_PAYMENT_REMINDER.subject,
        sampleData: sampleData.Reminders
      },
      {
        code: 'EMAIL_DELIVERY_REMINDER',
        name: 'Delivery Reminder',
        type: 'Reminders',
        category: 'Communications',
        description: 'Professional reminder for upcoming deliveries',
        html: professionalTemplates.EMAIL_DELIVERY_REMINDER.html,
        subject: professionalTemplates.EMAIL_DELIVERY_REMINDER.subject,
        sampleData: sampleData.Reminders
      }
    ];

    // Insert templates with versions
    for (const template of templates) {
      const [insertedTemplate] = await db.insert(communicationTemplates)
        .values({
          code: template.code,
          name: template.name,
          type: template.type as any,
          category: template.category,
          description: template.description,
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
          variables: getTemplateVariables(template.type),
          defaultOptions: {
            sampleData: template.sampleData
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Create initial version with HTML content
      const [version] = await db.insert(templateVersions)
        .values({
          templateId: insertedTemplate.id,
          version: '1.0.0',
          versionNumber: 1,
          htmlTemplate: template.html,
          subjectTemplate: template.subject,
          textTemplate: '',
          changelog: 'Initial professional template',
          isActive: true,
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Update template with current version
      await db.update(communicationTemplates)
        .set({ currentVersionId: version.id })
        .where(db.sql`id = ${insertedTemplate.id}`);
    }

    console.log(`Successfully created ${templates.length} professional templates`);
    return { success: true, message: `Created ${templates.length} professional templates` };

  } catch (error) {
    console.error('Error creating templates:', error);
    return { success: false, error: error.message };
  }
}

function getTemplateVariables(type: string) {
  const variables = {
    PO: ['company', 'supplier', 'orderNumber', 'orderDate', 'dueDate', 'lineItems', 'subtotal', 'tax', 'total', 'terms'],
    RFQ: ['company', 'rfqNumber', 'rfqDate', 'dueDate', 'project', 'contact', 'items'],
    Quote: ['company', 'client', 'quoteNumber', 'quoteDate', 'validUntil', 'project', 'lineItems', 'subtotal', 'discount', 'gst', 'total'],
    Invoice: ['company', 'client', 'invoiceNumber', 'invoiceDate', 'dueDate', 'job', 'lineItems', 'subtotal', 'gst', 'totalDue'],
    Receipt: ['company', 'payer', 'receiptNumber', 'receiptDate', 'paymentDate', 'paymentMethod', 'amount', 'appliedInvoices'],
    DeliveryNote: ['company', 'deliveryNumber', 'deliveryDate', 'purchaseOrder', 'shipFrom', 'shipTo', 'items', 'totalItems'],
    AcceptanceEmail: ['company', 'supplier', 'orderNumber', 'orderDate', 'deliveryDate', 'totalAmount', 'sender'],
    RejectionEmail: ['company', 'supplier', 'orderNumber', 'rejectionReason', 'sender'],
    FollowUp: ['company', 'supplier', 'rfqNumber', 'dueDate', 'project', 'sender'],
    Reminders: ['company', 'client', 'invoiceNumber', 'dueDate', 'amountDue', 'sender']
  };
  
  return variables[type] || [];
}
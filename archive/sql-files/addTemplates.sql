-- Add professional templates for all document types
-- First, clear any existing templates except our test one
DELETE FROM template_versions WHERE template_id != 18;
DELETE FROM communication_templates WHERE id != 18;

-- Insert RFQ template
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES ('RFQ_STANDARD', 'Standard RFQ', 'RFQ', 'Documents', 'Professional RFQ template', 'en-NZ', 'global', 'active', true, true, 
'{"primaryColor": "#2563eb", "fontFamily": "Helvetica Neue"}', 
'["company", "supplier", "rfqNumber", "lineItems", "dueDate"]', 
'{"showTerms": true}', NOW(), NOW());

INSERT INTO template_versions (template_id, version, version_number, html_template, subject_template, text_template, changelog, published_at, created_at)
VALUES ((SELECT id FROM communication_templates WHERE code = 'RFQ_STANDARD'), '1.0.0', 1,
'<h1>Request for Quote</h1><p>RFQ #{{rfqNumber}} from {{company.name}}</p><p>Due Date: {{dueDate}}</p>',
'RFQ #{{rfqNumber}} - {{company.name}}', '', 'Initial template', NOW(), NOW());

UPDATE communication_templates SET current_version_id = (SELECT id FROM template_versions WHERE template_id = (SELECT id FROM communication_templates WHERE code = 'RFQ_STANDARD')) WHERE code = 'RFQ_STANDARD';

-- Insert Quote template
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES ('QUOTE_PROFESSIONAL', 'Professional Quote', 'Quote', 'Documents', 'Professional quotation template', 'en-NZ', 'global', 'active', true, true,
'{"primaryColor": "#2563eb", "fontFamily": "Helvetica Neue"}',
'["company", "client", "quoteNumber", "lineItems", "validUntil"]',
'{"showTerms": true}', NOW(), NOW());

INSERT INTO template_versions (template_id, version, version_number, html_template, subject_template, text_template, changelog, published_at, created_at)
VALUES ((SELECT id FROM communication_templates WHERE code = 'QUOTE_PROFESSIONAL'), '1.0.0', 1,
'<h1>Professional Quote</h1><p>Quote #{{quoteNumber}} for {{client.name}}</p><p>Valid Until: {{validUntil}}</p>',
'Quote #{{quoteNumber}} - {{company.name}}', '', 'Initial template', NOW(), NOW());

UPDATE communication_templates SET current_version_id = (SELECT id FROM template_versions WHERE template_id = (SELECT id FROM communication_templates WHERE code = 'QUOTE_PROFESSIONAL')) WHERE code = 'QUOTE_PROFESSIONAL';

-- Insert Invoice template
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES ('INVOICE_STANDARD', 'Standard Invoice', 'Invoice', 'Documents', 'Professional invoice template', 'en-NZ', 'global', 'active', true, true,
'{"primaryColor": "#2563eb", "fontFamily": "Helvetica Neue"}',
'["company", "client", "invoiceNumber", "lineItems", "dueDate", "paymentTerms"]',
'{"showTerms": true}', NOW(), NOW());

INSERT INTO template_versions (template_id, version, version_number, html_template, subject_template, text_template, changelog, published_at, created_at)
VALUES ((SELECT id FROM communication_templates WHERE code = 'INVOICE_STANDARD'), '1.0.0', 1,
'<h1>Tax Invoice</h1><p>Invoice #{{invoiceNumber}} for {{client.name}}</p><p>Due: {{dueDate}}</p><p>Terms: {{paymentTerms}}</p>',
'Invoice #{{invoiceNumber}} - {{company.name}}', '', 'Initial template', NOW(), NOW());

UPDATE communication_templates SET current_version_id = (SELECT id FROM template_versions WHERE template_id = (SELECT id FROM communication_templates WHERE code = 'INVOICE_STANDARD')) WHERE code = 'INVOICE_STANDARD';

-- Insert Receipt template
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES ('RECEIPT_STANDARD', 'Payment Receipt', 'Receipt', 'Documents', 'Professional payment receipt template', 'en-NZ', 'global', 'active', true, true,
'{"primaryColor": "#2563eb", "fontFamily": "Helvetica Neue"}',
'["company", "client", "receiptNumber", "paymentAmount", "paymentMethod", "paymentDate"]',
'{"showTerms": false}', NOW(), NOW());

INSERT INTO template_versions (template_id, version, version_number, html_template, subject_template, text_template, changelog, published_at, created_at)
VALUES ((SELECT id FROM communication_templates WHERE code = 'RECEIPT_STANDARD'), '1.0.0', 1,
'<h1>Payment Receipt</h1><p>Receipt #{{receiptNumber}}</p><p>Amount: {{paymentAmount}}</p><p>Method: {{paymentMethod}}</p>',
'Payment Receipt #{{receiptNumber}}', '', 'Initial template', NOW(), NOW());

UPDATE communication_templates SET current_version_id = (SELECT id FROM template_versions WHERE template_id = (SELECT id FROM communication_templates WHERE code = 'RECEIPT_STANDARD')) WHERE code = 'RECEIPT_STANDARD';

-- Insert Delivery Note template
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES ('DELIVERY_STANDARD', 'Delivery Note', 'DeliveryNote', 'Documents', 'Professional delivery note template', 'en-NZ', 'global', 'active', true, true,
'{"primaryColor": "#2563eb", "fontFamily": "Helvetica Neue"}',
'["company", "recipient", "deliveryNumber", "items", "deliveryDate", "deliveryAddress"]',
'{"showSignature": true}', NOW(), NOW());

INSERT INTO template_versions (template_id, version, version_number, html_template, subject_template, text_template, changelog, published_at, created_at)
VALUES ((SELECT id FROM communication_templates WHERE code = 'DELIVERY_STANDARD'), '1.0.0', 1,
'<h1>Delivery Note</h1><p>Delivery #{{deliveryNumber}}</p><p>To: {{recipient.name}}</p><p>Date: {{deliveryDate}}</p>',
'Delivery Note #{{deliveryNumber}}', '', 'Initial template', NOW(), NOW());

UPDATE communication_templates SET current_version_id = (SELECT id FROM template_versions WHERE template_id = (SELECT id FROM communication_templates WHERE code = 'DELIVERY_STANDARD')) WHERE code = 'DELIVERY_STANDARD';

-- Insert Email Templates
-- Acceptance Email
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES ('EMAIL_PO_ACCEPTANCE', 'PO Acceptance Email', 'AcceptanceEmail', 'Communications', 'Professional PO acceptance email', 'en-NZ', 'global', 'active', true, true,
'{"primaryColor": "#10b981"}',
'["orderNumber", "supplierName", "acceptanceDate", "deliveryDate"]',
'{"tone": "professional"}', NOW(), NOW());

INSERT INTO template_versions (template_id, version, version_number, html_template, subject_template, text_template, changelog, published_at, created_at)
VALUES ((SELECT id FROM communication_templates WHERE code = 'EMAIL_PO_ACCEPTANCE'), '1.0.0', 1,
'<p>Dear {{supplierName}},</p><p>Thank you for accepting Purchase Order #{{orderNumber}}.</p><p>Expected Delivery: {{deliveryDate}}</p>',
'PO #{{orderNumber}} - Accepted', '', 'Initial template', NOW(), NOW());

UPDATE communication_templates SET current_version_id = (SELECT id FROM template_versions WHERE template_id = (SELECT id FROM communication_templates WHERE code = 'EMAIL_PO_ACCEPTANCE')) WHERE code = 'EMAIL_PO_ACCEPTANCE';

-- Rejection Email
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES ('EMAIL_PO_REJECTION', 'PO Rejection Email', 'RejectionEmail', 'Communications', 'Professional PO rejection email', 'en-NZ', 'global', 'active', true, true,
'{"primaryColor": "#ef4444"}',
'["orderNumber", "supplierName", "rejectionReason"]',
'{"tone": "professional"}', NOW(), NOW());

INSERT INTO template_versions (template_id, version, version_number, html_template, subject_template, text_template, changelog, published_at, created_at)
VALUES ((SELECT id FROM communication_templates WHERE code = 'EMAIL_PO_REJECTION'), '1.0.0', 1,
'<p>Dear {{supplierName}},</p><p>Purchase Order #{{orderNumber}} has been rejected.</p><p>Reason: {{rejectionReason}}</p>',
'PO #{{orderNumber}} - Rejected', '', 'Initial template', NOW(), NOW());

UPDATE communication_templates SET current_version_id = (SELECT id FROM template_versions WHERE template_id = (SELECT id FROM communication_templates WHERE code = 'EMAIL_PO_REJECTION')) WHERE code = 'EMAIL_PO_REJECTION';

-- Follow-up Email
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES ('EMAIL_RFQ_FOLLOWUP', 'RFQ Follow-up Email', 'FollowUp', 'Communications', 'Professional RFQ follow-up email', 'en-NZ', 'global', 'active', true, true,
'{"primaryColor": "#3b82f6"}',
'["rfqNumber", "supplierName", "dueDate", "itemCount"]',
'{"tone": "friendly"}', NOW(), NOW());

INSERT INTO template_versions (template_id, version, version_number, html_template, subject_template, text_template, changelog, published_at, created_at)
VALUES ((SELECT id FROM communication_templates WHERE code = 'EMAIL_RFQ_FOLLOWUP'), '1.0.0', 1,
'<p>Dear {{supplierName}},</p><p>This is a reminder about RFQ #{{rfqNumber}}.</p><p>Response Due: {{dueDate}}</p>',
'Reminder: RFQ #{{rfqNumber}} Response Due {{dueDate}}', '', 'Initial template', NOW(), NOW());

UPDATE communication_templates SET current_version_id = (SELECT id FROM template_versions WHERE template_id = (SELECT id FROM communication_templates WHERE code = 'EMAIL_RFQ_FOLLOWUP')) WHERE code = 'EMAIL_RFQ_FOLLOWUP';

-- Payment Reminder
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES ('EMAIL_PAYMENT_REMINDER', 'Payment Reminder', 'Reminders', 'Communications', 'Professional payment reminder email', 'en-NZ', 'global', 'active', true, true,
'{"primaryColor": "#f59e0b"}',
'["invoiceNumber", "clientName", "amountDue", "daysOverdue"]',
'{"tone": "professional"}', NOW(), NOW());

INSERT INTO template_versions (template_id, version, version_number, html_template, subject_template, text_template, changelog, published_at, created_at)
VALUES ((SELECT id FROM communication_templates WHERE code = 'EMAIL_PAYMENT_REMINDER'), '1.0.0', 1,
'<p>Dear {{clientName}},</p><p>Invoice #{{invoiceNumber}} is {{daysOverdue}} days overdue.</p><p>Amount Due: {{amountDue}}</p>',
'Payment Reminder: Invoice #{{invoiceNumber}}', '', 'Initial template', NOW(), NOW());

UPDATE communication_templates SET current_version_id = (SELECT id FROM template_versions WHERE template_id = (SELECT id FROM communication_templates WHERE code = 'EMAIL_PAYMENT_REMINDER')) WHERE code = 'EMAIL_PAYMENT_REMINDER';
-- Clear existing template versions and templates
DELETE FROM template_versions;
DELETE FROM communication_templates;

-- Reset sequences if needed
-- ALTER SEQUENCE communication_templates_id_seq RESTART WITH 1;
-- ALTER SEQUENCE template_versions_id_seq RESTART WITH 1;

-- ================== PROCUREMENT DOCUMENTS ==================
-- Purchase Order Templates
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES 
('PO_STANDARD', 'Standard Purchase Order', 'PO', 'Documents', 'Professional purchase order template', 'en-NZ', 'global', 'active', true, false, 
'{"primaryColor": "#2563eb", "fontFamily": "Helvetica Neue"}', 
'["company", "supplier", "orderNumber", "lineItems", "dueDate"]', 
'{"showTerms": true}', NOW(), NOW()),
('PO_DETAILED', 'Detailed Purchase Order', 'PO', 'Documents', 'Comprehensive PO with full specifications', 'en-NZ', 'global', 'active', false, false, 
'{"primaryColor": "#2563eb", "fontFamily": "Helvetica Neue"}', 
'["company", "supplier", "orderNumber", "lineItems", "specifications"]', 
'{"showTerms": true, "showSpecs": true}', NOW(), NOW());

-- RFQ Templates  
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES 
('RFQ_STANDARD', 'Standard RFQ', 'RFQ', 'Documents', 'Professional RFQ template', 'en-NZ', 'global', 'active', true, false, 
'{"primaryColor": "#2563eb", "fontFamily": "Helvetica Neue"}', 
'["company", "supplier", "rfqNumber", "lineItems", "dueDate"]', 
'{"showTerms": true}', NOW(), NOW()),
('RFQ_DETAILED', 'Detailed RFQ', 'RFQ', 'Documents', 'Comprehensive RFQ with specifications', 'en-NZ', 'global', 'active', false, false, 
'{"primaryColor": "#2563eb", "fontFamily": "Helvetica Neue"}', 
'["company", "supplier", "rfqNumber", "lineItems", "specifications", "requirements"]', 
'{"showTerms": true, "showRequirements": true}', NOW(), NOW());

-- ================== SALES DOCUMENTS ==================
-- Quote Templates
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES 
('QUOTE_PROFESSIONAL', 'Professional Quote', 'Quote', 'Documents', 'Professional quotation template', 'en-NZ', 'global', 'active', true, false,
'{"primaryColor": "#10b981", "fontFamily": "Helvetica Neue"}',
'["company", "client", "quoteNumber", "lineItems", "validUntil"]',
'{"showTerms": true}', NOW(), NOW()),
('QUOTE_SIMPLE', 'Simple Quote', 'Quote', 'Documents', 'Streamlined quote template', 'en-NZ', 'global', 'active', false, false,
'{"primaryColor": "#10b981", "fontFamily": "Helvetica Neue"}',
'["company", "client", "quoteNumber", "lineItems", "total"]',
'{"showTerms": false}', NOW(), NOW());

-- Invoice Templates
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES 
('INVOICE_STANDARD', 'Standard Invoice', 'Invoice', 'Documents', 'Professional invoice template', 'en-NZ', 'global', 'active', true, false,
'{"primaryColor": "#8b5cf6", "fontFamily": "Helvetica Neue"}',
'["company", "client", "invoiceNumber", "lineItems", "dueDate", "paymentTerms"]',
'{"showTerms": true}', NOW(), NOW()),
('INVOICE_DETAILED', 'Detailed Invoice', 'Invoice', 'Documents', 'Comprehensive invoice with breakdown', 'en-NZ', 'global', 'active', false, false,
'{"primaryColor": "#8b5cf6", "fontFamily": "Helvetica Neue"}',
'["company", "client", "invoiceNumber", "lineItems", "dueDate", "paymentTerms", "taxBreakdown"]',
'{"showTerms": true, "showTaxDetails": true}', NOW(), NOW());

-- ================== SHIPPING & RECEIPTS ==================
-- Receipt Templates
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES 
('RECEIPT_STANDARD', 'Payment Receipt', 'Receipt', 'Documents', 'Professional payment receipt template', 'en-NZ', 'global', 'active', true, false,
'{"primaryColor": "#22c55e", "fontFamily": "Helvetica Neue"}',
'["company", "client", "receiptNumber", "paymentAmount", "paymentMethod", "paymentDate"]',
'{"showTerms": false}', NOW(), NOW());

-- Delivery Note Templates
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES 
('DELIVERY_STANDARD', 'Delivery Note', 'DeliveryNote', 'Documents', 'Professional delivery note template', 'en-NZ', 'global', 'active', true, false,
'{"primaryColor": "#f97316", "fontFamily": "Helvetica Neue"}',
'["company", "recipient", "deliveryNumber", "items", "deliveryDate", "deliveryAddress"]',
'{"showSignature": true}', NOW(), NOW());

-- ================== EMAIL COMMUNICATIONS ==================
-- Acceptance Emails
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES 
('EMAIL_PO_ACCEPTANCE', 'PO Acceptance Email', 'AcceptanceEmail', 'Communications', 'Professional PO acceptance email', 'en-NZ', 'global', 'active', true, false,
'{"primaryColor": "#10b981"}',
'["orderNumber", "supplierName", "acceptanceDate", "deliveryDate"]',
'{"tone": "professional"}', NOW(), NOW());

-- Rejection Emails
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES 
('EMAIL_PO_REJECTION', 'PO Rejection Email', 'RejectionEmail', 'Communications', 'Professional PO rejection email', 'en-NZ', 'global', 'active', true, false,
'{"primaryColor": "#ef4444"}',
'["orderNumber", "supplierName", "rejectionReason"]',
'{"tone": "professional"}', NOW(), NOW());

-- Follow-up Emails  
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES 
('EMAIL_RFQ_FOLLOWUP', 'RFQ Follow-up Email', 'FollowUp', 'Communications', 'Professional RFQ follow-up email', 'en-NZ', 'global', 'active', true, false,
'{"primaryColor": "#3b82f6"}',
'["rfqNumber", "supplierName", "dueDate", "itemCount"]',
'{"tone": "friendly"}', NOW(), NOW());

-- Reminder Emails
INSERT INTO communication_templates (code, name, type, category, description, locale, scope, status, is_default, default_for_scope, theme, variables, default_options, created_at, updated_at)
VALUES 
('EMAIL_PAYMENT_REMINDER', 'Payment Reminder', 'Reminders', 'Communications', 'Professional payment reminder email', 'en-NZ', 'global', 'active', true, false,
'{"primaryColor": "#f59e0b"}',
'["invoiceNumber", "clientName", "amountDue", "daysOverdue"]',
'{"tone": "professional"}', NOW(), NOW()),
('EMAIL_DELIVERY_REMINDER', 'Delivery Reminder', 'Reminders', 'Communications', 'Professional delivery reminder email', 'en-NZ', 'global', 'active', false, false,
'{"primaryColor": "#f59e0b"}',
'["orderNumber", "supplierName", "expectedDate", "daysDelayed"]',
'{"tone": "professional"}', NOW(), NOW());
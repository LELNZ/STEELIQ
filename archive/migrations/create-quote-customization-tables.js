import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function createQuoteCustomizationTables() {
  console.log("Creating quote customization tables...");

  try {
    // Organization Settings
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organization_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value JSONB,
        setting_type VARCHAR(100), -- branding, email, document, financial
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Company Locations
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS company_locations (
        id SERIAL PRIMARY KEY,
        location_name VARCHAR(255) NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        address_line1 VARCHAR(255),
        address_line2 VARCHAR(255),
        city VARCHAR(100),
        state_province VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100) DEFAULT 'New Zealand',
        phone VARCHAR(50),
        email VARCHAR(255),
        gst_number VARCHAR(50),
        business_number VARCHAR(50),
        logo_path TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Quote Templates
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quote_templates (
        id SERIAL PRIMARY KEY,
        template_name VARCHAR(255) NOT NULL,
        template_code VARCHAR(50) UNIQUE NOT NULL,
        template_type VARCHAR(50) DEFAULT 'professional', -- professional, modern, industrial, minimal, executive
        description TEXT,
        
        -- Layout Configuration
        layout_config JSONB, -- Stores drag-drop layout structure
        header_config JSONB, -- Logo position, company info display
        footer_config JSONB, -- Footer content, page numbers
        
        -- Design Settings
        primary_color VARCHAR(7) DEFAULT '#1e3a8a',
        secondary_color VARCHAR(7) DEFAULT '#0369a1',
        accent_color VARCHAR(7) DEFAULT '#059669',
        font_family VARCHAR(100) DEFAULT 'Arial',
        font_size_body INTEGER DEFAULT 11,
        font_size_heading INTEGER DEFAULT 16,
        
        -- Section Visibility
        show_executive_summary BOOLEAN DEFAULT true,
        show_scope_of_work BOOLEAN DEFAULT true,
        show_pricing_breakdown BOOLEAN DEFAULT true,
        show_material_details BOOLEAN DEFAULT true,
        show_labor_breakdown BOOLEAN DEFAULT true,
        show_payment_terms BOOLEAN DEFAULT true,
        show_terms_conditions BOOLEAN DEFAULT true,
        show_project_timeline BOOLEAN DEFAULT false,
        show_handling_costs BOOLEAN DEFAULT false,
        
        -- Watermark Settings
        enable_watermark BOOLEAN DEFAULT false,
        watermark_type VARCHAR(50), -- logo, text, draft
        watermark_opacity DECIMAL(3,2) DEFAULT 0.15,
        watermark_position VARCHAR(50) DEFAULT 'center',
        
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Email Configuration
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_configurations (
        id SERIAL PRIMARY KEY,
        config_name VARCHAR(255) NOT NULL,
        provider_type VARCHAR(50) DEFAULT 'smtp', -- smtp, google_workspace, outlook365
        
        -- SMTP Settings
        smtp_host VARCHAR(255),
        smtp_port INTEGER DEFAULT 587,
        smtp_username VARCHAR(255),
        smtp_password_encrypted TEXT, -- Encrypted storage
        smtp_encryption VARCHAR(20) DEFAULT 'tls', -- tls, ssl, none
        
        -- OAuth Settings (for Google Workspace/Outlook)
        oauth_client_id VARCHAR(255),
        oauth_client_secret_encrypted TEXT,
        oauth_refresh_token_encrypted TEXT,
        
        -- General Settings
        from_email VARCHAR(255) NOT NULL,
        from_name VARCHAR(255),
        reply_to_email VARCHAR(255),
        
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        last_tested_at TIMESTAMP,
        test_status VARCHAR(50), -- success, failed
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Email Templates
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        template_name VARCHAR(255) NOT NULL,
        template_code VARCHAR(100) UNIQUE NOT NULL,
        template_type VARCHAR(50), -- quote_send, follow_up, reminder, accepted, rejected
        subject_line TEXT NOT NULL,
        email_body_html TEXT,
        email_body_plain TEXT,
        
        -- Merge Variables
        available_variables JSONB, -- List of {{variables}} available
        
        -- Follow-up Settings
        is_follow_up BOOLEAN DEFAULT false,
        follow_up_days INTEGER[], -- Array of days [3, 7, 14]
        stop_on_reply BOOLEAN DEFAULT true,
        
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Terms and Conditions Library
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS terms_conditions_library (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100), -- payment_terms, warranty, liability, general
        content TEXT NOT NULL,
        version VARCHAR(20),
        is_default BOOLEAN DEFAULT false,
        applicable_to VARCHAR(50)[], -- Array: ['quotes', 'contracts', 'invoices']
        valid_from DATE,
        valid_until DATE,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Quote Documents
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quote_documents (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER, -- Will reference estimation_projects
        document_type VARCHAR(50), -- quote_pdf, signed_quote, supporting_doc
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        
        -- Security & Tracking
        is_encrypted BOOLEAN DEFAULT false,
        password_protected BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        last_viewed_at TIMESTAMP,
        
        -- E-signature Info
        requires_signature BOOLEAN DEFAULT false,
        signature_status VARCHAR(50), -- pending, signed, rejected
        signed_at TIMESTAMP,
        signed_by VARCHAR(255),
        signature_ip VARCHAR(45),
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Client Portal Access
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_portal_access (
        id SERIAL PRIMARY KEY,
        access_token VARCHAR(255) UNIQUE NOT NULL,
        quote_id INTEGER, -- References estimation_projects
        client_email VARCHAR(255) NOT NULL,
        client_name VARCHAR(255),
        
        -- Access Control
        access_type VARCHAR(50) DEFAULT 'view_only', -- view_only, comment, accept_reject
        expires_at TIMESTAMP,
        max_views INTEGER,
        current_views INTEGER DEFAULT 0,
        
        -- Activity Tracking
        first_viewed_at TIMESTAMP,
        last_viewed_at TIMESTAMP,
        accepted_at TIMESTAMP,
        rejected_at TIMESTAMP,
        rejection_reason TEXT,
        
        -- Notifications
        email_notifications_sent JSONB, -- Track sent emails
        
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // E-Signature Configuration
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS esignature_configurations (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(50) NOT NULL, -- built_in, docusign, adobe_sign
        is_default BOOLEAN DEFAULT false,
        
        -- Built-in Signature Settings
        signature_field_config JSONB, -- Position, size, etc.
        
        -- DocuSign Settings
        docusign_account_id VARCHAR(255),
        docusign_client_id VARCHAR(255),
        docusign_client_secret_encrypted TEXT,
        docusign_access_token_encrypted TEXT,
        docusign_refresh_token_encrypted TEXT,
        
        -- Adobe Sign Settings
        adobe_account_id VARCHAR(255),
        adobe_client_id VARCHAR(255),
        adobe_client_secret_encrypted TEXT,
        adobe_access_token_encrypted TEXT,
        adobe_refresh_token_encrypted TEXT,
        
        webhook_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Quote Activity Log
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quote_activity_logs (
        id SERIAL PRIMARY KEY,
        quote_id INTEGER, -- References estimation_projects
        activity_type VARCHAR(100) NOT NULL, -- created, sent, viewed, downloaded, signed, accepted, rejected
        activity_details JSONB,
        performed_by VARCHAR(255),
        performed_by_type VARCHAR(50), -- user, client, system
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Handling Costs Configuration
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS handling_costs_config (
        id SERIAL PRIMARY KEY,
        config_name VARCHAR(255) NOT NULL,
        calculation_method VARCHAR(50) DEFAULT 'percentage', -- percentage, fixed_amount, per_unit
        percentage_value DECIMAL(5,2),
        fixed_amount DECIMAL(12,2),
        per_unit_rate DECIMAL(10,2),
        unit_type VARCHAR(50), -- kg, m, piece
        
        -- Display Settings
        show_as_separate_line BOOLEAN DEFAULT true,
        line_item_label VARCHAR(255) DEFAULT 'Handling & Processing',
        include_in_subtotal BOOLEAN DEFAULT true,
        
        -- Applicability
        apply_to_materials BOOLEAN DEFAULT true,
        apply_to_consumables BOOLEAN DEFAULT false,
        minimum_threshold DECIMAL(12,2), -- Don't apply if order < threshold
        
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Currency Configuration (for future multi-currency support)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS currency_configurations (
        id SERIAL PRIMARY KEY,
        currency_code VARCHAR(3) NOT NULL, -- NZD, AUD, USD
        currency_name VARCHAR(100),
        currency_symbol VARCHAR(10),
        exchange_rate DECIMAL(10,6) DEFAULT 1.000000,
        is_base_currency BOOLEAN DEFAULT false,
        decimal_places INTEGER DEFAULT 2,
        thousand_separator VARCHAR(1) DEFAULT ',',
        decimal_separator VARCHAR(1) DEFAULT '.',
        symbol_position VARCHAR(10) DEFAULT 'before', -- before, after
        is_active BOOLEAN DEFAULT true,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default data
    console.log("Inserting default configurations...");

    // Default NZD currency
    await db.execute(sql`
      INSERT INTO currency_configurations (currency_code, currency_name, currency_symbol, is_base_currency)
      VALUES ('NZD', 'New Zealand Dollar', '$', true)
      ON CONFLICT DO NOTHING
    `);

    // Default quote templates
    await db.execute(sql`
      INSERT INTO quote_templates (template_name, template_code, template_type, description, is_default)
      VALUES 
        ('Professional Template', 'professional', 'professional', 'Clean and professional layout suitable for most business quotes', true),
        ('Modern Template', 'modern', 'modern', 'Contemporary design with bold colors and modern typography', false),
        ('Industrial Template', 'industrial', 'industrial', 'Technical layout optimized for steel fabrication and construction', false),
        ('Minimal Template', 'minimal', 'minimal', 'Simple and clean design focusing on content', false),
        ('Executive Template', 'executive', 'executive', 'Premium layout for high-value projects and executive presentations', false)
      ON CONFLICT (template_code) DO NOTHING
    `);

    // Default email templates
    await db.execute(sql`
      INSERT INTO email_templates (template_name, template_code, template_type, subject_line, available_variables)
      VALUES 
        ('Quote Send Email', 'quote_send', 'quote_send', 
         'Quote {{quote_number}} - {{project_name}}', 
         '{"variables": ["quote_number", "project_name", "client_name", "total_amount", "valid_until"]}'),
        ('3 Day Follow-up', 'follow_up_3', 'follow_up', 
         'Following up on Quote {{quote_number}}', 
         '{"variables": ["quote_number", "project_name", "client_name", "days_since_sent"]}'),
        ('7 Day Follow-up', 'follow_up_7', 'follow_up', 
         'Checking in on your quote - {{project_name}}', 
         '{"variables": ["quote_number", "project_name", "client_name", "days_since_sent"]}'),
        ('14 Day Follow-up', 'follow_up_14', 'follow_up', 
         'Quote {{quote_number}} expiring soon', 
         '{"variables": ["quote_number", "project_name", "client_name", "days_until_expiry"]}')
      ON CONFLICT (template_code) DO NOTHING
    `);

    // Default handling costs config
    await db.execute(sql`
      INSERT INTO handling_costs_config (config_name, calculation_method, percentage_value, is_default)
      VALUES ('Standard Handling', 'percentage', 5.0, true)
      ON CONFLICT DO NOTHING
    `);

    console.log("Quote customization tables created successfully!");

    // Add columns to estimation_projects for quote customization
    await db.execute(sql`
      ALTER TABLE estimation_projects 
      ADD COLUMN IF NOT EXISTS quote_template_id INTEGER REFERENCES quote_templates(id),
      ADD COLUMN IF NOT EXISTS handling_cost_config_id INTEGER REFERENCES handling_costs_config(id),
      ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES company_locations(id),
      ADD COLUMN IF NOT EXISTS terms_conditions_ids INTEGER[],
      ADD COLUMN IF NOT EXISTS quote_pdf_path TEXT,
      ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS signature_required BOOLEAN DEFAULT false
    `);

    console.log("Updated estimation_projects table with quote customization fields!");

  } catch (error) {
    console.error("Error creating quote customization tables:", error);
    throw error;
  }
}

// Execute the migration
createQuoteCustomizationTables()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
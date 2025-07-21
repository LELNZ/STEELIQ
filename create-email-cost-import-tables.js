import { db } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function createEmailCostImportTables() {
  try {
    console.log("Creating email cost import tables...");

    // Create email_accounts table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_accounts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        access_token TEXT,
        refresh_token TEXT,
        imap_config JSONB,
        is_active BOOLEAN DEFAULT true,
        last_sync_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create supplier_templates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS supplier_templates (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER REFERENCES suppliers(id),
        supplier_email TEXT,
        template_name TEXT NOT NULL,
        parsing_rules JSONB,
        field_mappings JSONB,
        sample_invoices JSONB,
        accuracy DECIMAL(5,2),
        last_used_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create imported_costs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS imported_costs (
        id SERIAL PRIMARY KEY,
        email_account_id INTEGER REFERENCES email_accounts(id),
        email_message_id TEXT,
        email_subject TEXT,
        email_date TIMESTAMP,
        supplier_id INTEGER REFERENCES suppliers(id),
        supplier_name TEXT,
        invoice_number TEXT,
        purchase_order_number TEXT,
        job_id INTEGER REFERENCES jobs(id),
        job_number TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        match_confidence DECIMAL(5,2),
        total_amount DECIMAL(10,2),
        tax_amount DECIMAL(10,2),
        net_amount DECIMAL(10,2),
        currency TEXT DEFAULT 'NZD',
        invoice_date DATE,
        due_date DATE,
        attachments JSONB,
        extracted_data JSONB,
        line_items JSONB,
        review_notes TEXT,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create cost_variances table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cost_variances (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id) NOT NULL,
        cost_category TEXT NOT NULL,
        estimated_cost DECIMAL(10,2),
        actual_cost DECIMAL(10,2),
        variance DECIMAL(10,2),
        variance_percentage DECIMAL(5,2),
        notes TEXT,
        report_date DATE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create email_sync_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_sync_logs (
        id SERIAL PRIMARY KEY,
        email_account_id INTEGER REFERENCES email_accounts(id),
        sync_type TEXT,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        status TEXT,
        messages_processed INTEGER DEFAULT 0,
        costs_imported INTEGER DEFAULT 0,
        errors JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log("Email cost import tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating tables:", error);
    process.exit(1);
  }
}

createEmailCostImportTables();
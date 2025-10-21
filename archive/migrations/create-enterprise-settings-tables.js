import { db } from "./server/db.js";
import { sql } from "drizzle-orm";

async function createEnterpriseSettingsTables() {
  console.log("Creating enterprise settings tables...");
  
  try {
    // Create settings categories table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings_categories (
        id VARCHAR PRIMARY KEY,
        name VARCHAR NOT NULL,
        description TEXT,
        required_role VARCHAR,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✓ Created settings_categories table");
    
    // Create settings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        category_id VARCHAR REFERENCES settings_categories(id),
        key VARCHAR NOT NULL UNIQUE,
        value JSONB,
        data_type VARCHAR NOT NULL,
        default_value JSONB,
        description TEXT,
        is_encrypted BOOLEAN DEFAULT FALSE,
        required_role VARCHAR,
        validation_rules JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✓ Created settings table");
    
    // Create settings audit table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings_audit (
        id SERIAL PRIMARY KEY,
        setting_id INTEGER REFERENCES settings(id),
        user_id INTEGER REFERENCES users(id),
        previous_value JSONB,
        new_value JSONB,
        change_reason TEXT,
        ip_address VARCHAR,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✓ Created settings_audit table");
    
    // Create settings approvals table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS settings_approvals (
        id SERIAL PRIMARY KEY,
        setting_id INTEGER REFERENCES settings(id),
        requested_by INTEGER REFERENCES users(id),
        requested_value JSONB,
        current_value JSONB,
        change_reason TEXT,
        status VARCHAR DEFAULT 'pending',
        approved_by INTEGER REFERENCES users(id),
        approval_notes TEXT,
        requested_at TIMESTAMP DEFAULT NOW(),
        decided_at TIMESTAMP
      )
    `);
    console.log("✓ Created settings_approvals table");
    
    // Create organization settings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS organization_settings (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR NOT NULL,
        tax_number VARCHAR,
        business_number VARCHAR,
        primary_email VARCHAR,
        primary_phone VARCHAR,
        primary_address TEXT,
        logo_url VARCHAR,
        time_zone VARCHAR DEFAULT 'Pacific/Auckland',
        fiscal_year_start INTEGER DEFAULT 4,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✓ Created organization_settings table");
    
    // Create ai_cutting_optimization table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_cutting_optimization (
        id SERIAL PRIMARY KEY,
        job_id INTEGER,
        material_type VARCHAR NOT NULL,
        stock_lengths JSONB NOT NULL,
        cut_requirements JSONB NOT NULL,
        optimization_results JSONB,
        waste_percentage DECIMAL(5,2),
        total_stock_used INTEGER,
        kerf_width DECIMAL(5,2) DEFAULT 2.4,
        user_error_margin DECIMAL(5,2) DEFAULT 0.5,
        created_by VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✓ Created ai_cutting_optimization table");
    
    // Insert default organization settings only if table exists and is empty
    try {
      await db.execute(sql`
        INSERT INTO organization_settings (company_name)
        SELECT 'Lateral Engineering Limited'
        WHERE NOT EXISTS (SELECT 1 FROM organization_settings)
      `);
    } catch (error) {
      console.log("⚠ Organization settings already exist or table has different schema");
    }
    console.log("✓ Inserted default organization settings");
    
    // Insert default settings categories
    const categories = [
      { id: 'company', name: 'Company Information', description: 'Basic company details and branding', display_order: 1 },
      { id: 'financial', name: 'Financial Configuration', description: 'Financial settings and calculations', display_order: 2 },
      { id: 'operations', name: 'Operations Settings', description: 'Production and workflow configurations', display_order: 3 },
      { id: 'system', name: 'System Settings', description: 'System-wide configurations', display_order: 4 },
      { id: 'integration', name: 'Integration Settings', description: 'External system integrations', display_order: 5 }
    ];
    
    for (const category of categories) {
      await db.execute(sql`
        INSERT INTO settings_categories (id, name, description, display_order)
        VALUES (${category.id}, ${category.name}, ${category.description}, ${category.display_order})
        ON CONFLICT (id) DO NOTHING
      `);
    }
    console.log("✓ Inserted default settings categories");
    
    console.log("\n✅ All enterprise settings tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    process.exit(1);
  }
}

createEnterpriseSettingsTables();
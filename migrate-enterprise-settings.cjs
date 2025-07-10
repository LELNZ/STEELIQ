/**
 * Migrate to Enterprise Settings Architecture
 * Adds new tables for proper settings management, audit trails, and payroll integration
 */

const { Pool } = require('@neondatabase/serverless');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateEnterpriseSettings() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create settings categories table
    await client.query(`
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
    
    // Create settings table with audit capabilities
    await client.query(`
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
    
    // Create settings audit table
    await client.query(`
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
    
    // Create settings approvals table
    await client.query(`
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
    
    // Create simplified user preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE,
        theme VARCHAR DEFAULT 'system',
        language VARCHAR DEFAULT 'en',
        date_format VARCHAR DEFAULT 'DD/MM/YYYY',
        time_format VARCHAR DEFAULT '12h',
        timezone VARCHAR DEFAULT 'Pacific/Auckland',
        sidebar_collapsed BOOLEAN DEFAULT FALSE,
        email_notifications BOOLEAN DEFAULT TRUE,
        push_notifications BOOLEAN DEFAULT FALSE,
        dashboard_layout JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create enhanced labor rate cards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS labor_rate_cards (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        code VARCHAR UNIQUE,
        description TEXT,
        skill_level VARCHAR NOT NULL,
        employee_type VARCHAR NOT NULL,
        base_rate DECIMAL(10,2) NOT NULL,
        cost_rate DECIMAL(10,2) NOT NULL,
        overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
        weekend_multiplier DECIMAL(3,2) DEFAULT 1.5,
        holiday_multiplier DECIMAL(3,2) DEFAULT 2.0,
        night_shift_multiplier DECIMAL(3,2) DEFAULT 1.2,
        certification_requirements JSONB DEFAULT '[]',
        union_agreement_id VARCHAR,
        effective_from DATE NOT NULL,
        effective_to DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create labor rate regions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS labor_rate_regions (
        id SERIAL PRIMARY KEY,
        rate_card_id INTEGER REFERENCES labor_rate_cards(id),
        region VARCHAR NOT NULL,
        regional_multiplier DECIMAL(3,2) DEFAULT 1.0,
        site_allowance DECIMAL(10,2) DEFAULT 0,
        travel_allowance DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create enhanced time clocks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_clocks (
        id SERIAL PRIMARY KEY,
        team_member_id INTEGER REFERENCES team_members(id),
        clock_type VARCHAR NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        location VARCHAR,
        geolocation JSONB,
        clock_method VARCHAR,
        job_id INTEGER REFERENCES jobs(id),
        task_id INTEGER,
        photo_url VARCHAR,
        notes TEXT,
        sync_status VARCHAR DEFAULT 'synced',
        synced_at TIMESTAMP,
        device_info JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create payroll integration table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_integration (
        id SERIAL PRIMARY KEY,
        provider VARCHAR NOT NULL,
        api_endpoint VARCHAR,
        api_key VARCHAR,
        mapping_rules JSONB,
        sync_frequency VARCHAR DEFAULT 'daily',
        last_sync_at TIMESTAMP,
        sync_status VARCHAR,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create cost centers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cost_centers (
        id SERIAL PRIMARY KEY,
        code VARCHAR UNIQUE NOT NULL,
        name VARCHAR NOT NULL,
        description TEXT,
        parent_id INTEGER REFERENCES cost_centers(id),
        budget_annual DECIMAL(15,2),
        budget_monthly DECIMAL(15,2),
        manager_id INTEGER REFERENCES team_members(id),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create business units table
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_units (
        id SERIAL PRIMARY KEY,
        code VARCHAR UNIQUE NOT NULL,
        name VARCHAR NOT NULL,
        parent_id INTEGER REFERENCES business_units(id),
        address TEXT,
        phone VARCHAR,
        email VARCHAR,
        timezone VARCHAR,
        settings_overrides JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Insert default settings categories
    await client.query(`
      INSERT INTO settings_categories (id, name, description, required_role, display_order) VALUES
      ('organization', 'Organization Settings', 'Company profile, business units, and organizational structure', 'admin', 1),
      ('financial', 'Financial Settings', 'Cost centers, overhead rates, margin targets, and financial rules', 'finance_manager', 2),
      ('operations', 'Operations Settings', 'Fabrication standards, quality controls, and workflow rules', 'operations_manager', 3)
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Migrate existing overhead settings to new structure
    await client.query(`
      INSERT INTO settings (category_id, key, value, data_type, description, required_role) VALUES
      ('financial', 'overhead.opex.workshop_rent', '8000', 'number', 'Monthly workshop rent cost', 'finance_manager'),
      ('financial', 'overhead.opex.utilities', '2500', 'number', 'Monthly utilities cost', 'finance_manager'),
      ('financial', 'overhead.opex.insurance', '1250', 'number', 'Monthly insurance cost', 'finance_manager'),
      ('financial', 'overhead.opex.administration', '3000', 'number', 'Monthly administration cost', 'finance_manager'),
      ('financial', 'overhead.opex.non_billable_staff', '10000', 'number', 'Monthly non-billable staff cost', 'finance_manager'),
      ('financial', 'overhead.opex.maintenance', '1500', 'number', 'Monthly maintenance cost', 'finance_manager'),
      ('financial', 'overhead.capex.equipment_depreciation', '50000', 'number', 'Annual equipment depreciation', 'finance_manager'),
      ('financial', 'overhead.capex.vehicle_depreciation', '30000', 'number', 'Annual vehicle depreciation', 'finance_manager'),
      ('financial', 'overhead.capex.tools_depreciation', '14286', 'number', 'Annual tools depreciation', 'finance_manager'),
      ('financial', 'overhead.capex.software_licenses', '12000', 'number', 'Annual software licenses', 'finance_manager'),
      ('financial', 'margin.small_project.min', '20', 'number', 'Minimum margin % for small projects', 'finance_manager'),
      ('financial', 'margin.small_project.max', '30', 'number', 'Maximum margin % for small projects', 'finance_manager'),
      ('financial', 'margin.medium_project.min', '15', 'number', 'Minimum margin % for medium projects', 'finance_manager'),
      ('financial', 'margin.medium_project.max', '25', 'number', 'Maximum margin % for medium projects', 'finance_manager'),
      ('financial', 'margin.large_project.min', '10', 'number', 'Minimum margin % for large projects', 'finance_manager'),
      ('financial', 'margin.large_project.max', '20', 'number', 'Maximum margin % for large projects', 'finance_manager')
      ON CONFLICT (key) DO NOTHING
    `);
    
    // Insert default cost centers
    await client.query(`
      INSERT INTO cost_centers (code, name, description) VALUES
      ('WORKSHOP', 'Workshop Operations', 'Main fabrication workshop'),
      ('ADMIN', 'Administration', 'Office and administrative functions'),
      ('SALES', 'Sales & Marketing', 'Business development and sales'),
      ('R&D', 'Research & Development', 'New product development')
      ON CONFLICT (code) DO NOTHING
    `);
    
    // Insert default business unit
    await client.query(`
      INSERT INTO business_units (code, name) VALUES
      ('LEL-MAIN', 'Lateral Engineering Limited - Main')
      ON CONFLICT (code) DO NOTHING
    `);
    
    await client.query('COMMIT');
    console.log('✅ Enterprise settings migration completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
migrateEnterpriseSettings()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
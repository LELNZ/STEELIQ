import { sql } from 'drizzle-orm';
import { db } from './server/db.js';

async function createLaborRateTables() {
  try {
    console.log('Creating labor rate management tables...');

    // 1. Skill levels table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS skill_levels (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        multiplier DECIMAL(4, 2) NOT NULL DEFAULT 1.00,
        required_experience INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Master labor rates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS labor_rates (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id),
        skill_level_id INTEGER REFERENCES skill_levels(id),
        base_rate DECIMAL(10, 2) NOT NULL,
        overtime_multiplier DECIMAL(4, 2) DEFAULT 1.5,
        double_time_multiplier DECIMAL(4, 2) DEFAULT 2.0,
        site_allowance_rate DECIMAL(10, 2) DEFAULT 0,
        site_allowance_type VARCHAR(20) DEFAULT 'fixed', -- fixed or percentage
        effective_date DATE NOT NULL,
        expiry_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, skill_level_id, effective_date)
      )
    `);

    // 3. Labor rate history table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS labor_rate_history (
        id SERIAL PRIMARY KEY,
        rate_id INTEGER REFERENCES labor_rates(id),
        previous_rate DECIMAL(10, 2),
        new_rate DECIMAL(10, 2) NOT NULL,
        change_reason TEXT,
        changed_by INTEGER REFERENCES users(id),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Project-specific rate overrides
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS project_labor_rates (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES estimation_projects(id),
        role_id INTEGER REFERENCES roles(id),
        skill_level_id INTEGER REFERENCES skill_levels(id),
        custom_rate DECIMAL(10, 2) NOT NULL,
        reason TEXT,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Labor rate allowances
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS labor_allowances (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL, -- percentage, fixed, multiplier
        value DECIMAL(10, 2) NOT NULL,
        conditions JSONB, -- e.g., {"minHours": 4, "locations": ["remote"], "weather": ["rain"]}
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Role-allowance mappings
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS role_allowances (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id),
        allowance_id INTEGER REFERENCES labor_allowances(id),
        is_mandatory BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, allowance_id)
      )
    `);

    // Add indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_labor_rates_role_skill ON labor_rates(role_id, skill_level_id);
      CREATE INDEX IF NOT EXISTS idx_labor_rates_effective ON labor_rates(effective_date);
      CREATE INDEX IF NOT EXISTS idx_project_rates_project ON project_labor_rates(project_id);
    `);

    // Insert default skill levels
    await db.execute(sql`
      INSERT INTO skill_levels (code, name, description, multiplier, required_experience) VALUES
      ('APPRENTICE', 'Apprentice', 'Entry level, learning the trade', 0.65, 0),
      ('JUNIOR', 'Junior Tradesman', '1-3 years experience', 0.85, 1),
      ('STANDARD', 'Tradesman', '3-5 years experience', 1.00, 3),
      ('SENIOR', 'Senior Tradesman', '5-10 years experience', 1.15, 5),
      ('SPECIALIST', 'Specialist', '10+ years, specialized skills', 1.35, 10),
      ('SUPERVISOR', 'Supervisor', 'Team leadership experience', 1.50, 7)
      ON CONFLICT (code) DO NOTHING;
    `);

    // Insert common allowances
    await db.execute(sql`
      INSERT INTO labor_allowances (name, code, type, value, conditions) VALUES
      ('Site Work Premium', 'SITE_WORK', 'percentage', 15.0, '{"location": "onsite"}'),
      ('Overtime Rate', 'OVERTIME', 'multiplier', 1.5, '{"minHours": 8}'),
      ('Double Time', 'DOUBLE_TIME', 'multiplier', 2.0, '{"minHours": 12}'),
      ('Public Holiday', 'PUBLIC_HOLIDAY', 'multiplier', 2.5, '{"isPublicHoliday": true}'),
      ('Height Allowance', 'HEIGHT', 'fixed', 5.0, '{"minHeight": 10}'),
      ('Confined Space', 'CONFINED', 'fixed', 10.0, '{"isConfinedSpace": true}'),
      ('Hot Work', 'HOT_WORK', 'percentage', 10.0, '{"requiresHotWork": true}'),
      ('Night Shift', 'NIGHT_SHIFT', 'percentage', 25.0, '{"shift": "night"}'),
      ('Weekend Work', 'WEEKEND', 'percentage', 50.0, '{"dayOfWeek": ["saturday", "sunday"]}')
      ON CONFLICT (code) DO NOTHING;
    `);

    // Update estimation_labor table to include role and skill references
    await db.execute(sql`
      ALTER TABLE estimation_labor 
      ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id),
      ADD COLUMN IF NOT EXISTS skill_level_id INTEGER REFERENCES skill_levels(id),
      ADD COLUMN IF NOT EXISTS base_rate DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS allowances JSONB,
      ADD COLUMN IF NOT EXISTS rate_source VARCHAR(50) DEFAULT 'manual'; -- manual, role_based, custom
    `);

    // Add labor rate fields to team_members
    await db.execute(sql`
      ALTER TABLE team_members
      ADD COLUMN IF NOT EXISTS skill_level_id INTEGER REFERENCES skill_levels(id),
      ADD COLUMN IF NOT EXISTS rate_override DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS rate_effective_date DATE;
    `);

    console.log('Labor rate tables created successfully!');
    
  } catch (error) {
    console.error('Error creating labor rate tables:', error);
    throw error;
  }
}

// Run the migration
createLaborRateTables().catch(console.error);
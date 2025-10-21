import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function createLaborRateTables() {
  try {
    console.log('Creating labor rate management tables...');
    
    // Add new columns to estimation_labor table
    await db.execute(sql`
      ALTER TABLE estimation_labor 
      ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id),
      ADD COLUMN IF NOT EXISTS skill_level_id INTEGER REFERENCES skill_levels(id),
      ADD COLUMN IF NOT EXISTS base_rate DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS allowances JSONB,
      ADD COLUMN IF NOT EXISTS rate_source VARCHAR(50) DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS team_member_id INTEGER REFERENCES team_members(id)
    `);
    console.log('✓ Updated estimation_labor table');

    // Add new columns to team_members table
    await db.execute(sql`
      ALTER TABLE team_members
      ADD COLUMN IF NOT EXISTS skill_level_id INTEGER REFERENCES skill_levels(id),
      ADD COLUMN IF NOT EXISTS rate_override DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS rate_effective_date DATE
    `);
    console.log('✓ Updated team_members table');

    console.log('Labor rate tables updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating labor rate tables:', error);
    process.exit(1);
  }
}

createLaborRateTables();
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function createLaborRateTables() {
  try {
    console.log('Creating labor rate management tables...');

    // Create skill_levels table
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
    console.log('✓ Created skill_levels table');

    // Insert default skill levels
    await db.execute(sql`
      INSERT INTO skill_levels (code, name, description, multiplier, required_experience) VALUES
      ('APPRENTICE', 'Apprentice', 'Entry level, learning the trade', 0.65, 0),
      ('JUNIOR', 'Junior Tradesman', '1-3 years experience', 0.85, 1),
      ('STANDARD', 'Tradesman', '3-5 years experience', 1.00, 3),
      ('SENIOR', 'Senior Tradesman', '5-10 years experience', 1.15, 5),
      ('SPECIALIST', 'Specialist', '10+ years, specialized skills', 1.35, 10),
      ('SUPERVISOR', 'Supervisor', 'Team leadership experience', 1.50, 7)
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('✓ Inserted default skill levels');

    console.log('Labor rate tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating labor rate tables:', error);
    process.exit(1);
  }
}

createLaborRateTables();
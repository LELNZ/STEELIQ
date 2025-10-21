import { db } from "./db";
import { sql } from "drizzle-orm";

async function createLaborTables() {
  console.log("Creating labor rate tables...");
  
  try {
    // Create labor_rates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS labor_rates (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id),
        skill_level_id INTEGER REFERENCES skill_levels(id),
        base_rate DECIMAL(10,2) NOT NULL DEFAULT '0',
        overtime_multiplier DECIMAL(3,2) NOT NULL DEFAULT '1.5',
        double_time_multiplier DECIMAL(3,2) NOT NULL DEFAULT '2.0',
        night_shift_premium DECIMAL(5,2) DEFAULT '0',
        weekend_premium DECIMAL(5,2) DEFAULT '0',
        site_allowance_rate DECIMAL(10,2) DEFAULT '0',
        site_allowance_type VARCHAR(50) DEFAULT 'fixed',
        effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
        expiry_date DATE,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, skill_level_id, effective_date)
      )
    `);
    console.log("✓ Created labor_rates table");
    
    // Create labor_rate_history table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS labor_rate_history (
        id SERIAL PRIMARY KEY,
        rate_id INTEGER REFERENCES labor_rates(id),
        previous_rate DECIMAL(10,2) NOT NULL,
        new_rate DECIMAL(10,2) NOT NULL,
        change_reason TEXT,
        changed_by INTEGER REFERENCES users(id),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Created labor_rate_history table");
    
    // Create labor_rate_allowances table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS labor_rate_allowances (
        id SERIAL PRIMARY KEY,
        rate_id INTEGER REFERENCES labor_rates(id),
        allowance_id INTEGER REFERENCES labor_allowances(id),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Created labor_rate_allowances table");
    
    console.log("All labor tables created successfully!");
  } catch (error) {
    console.error("Error creating labor tables:", error);
  }
}

// Run the creation
createLaborTables().then(() => {
  console.log("Done");
  process.exit(0);
}).catch((error) => {
  console.error("Failed to create tables:", error);
  process.exit(1);
});
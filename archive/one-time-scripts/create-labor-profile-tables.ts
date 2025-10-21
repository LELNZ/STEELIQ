import { db } from "./db";
import { sql } from "drizzle-orm";

async function createLaborProfileTables() {
  console.log("Creating labor profile tables...");
  
  try {
    // Create labor_rate_profiles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS labor_rate_profiles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ Created labor_rate_profiles table");
    
    // Create role_rates table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS role_rates (
        id SERIAL PRIMARY KEY,
        profile_id INTEGER REFERENCES labor_rate_profiles(id),
        role_id INTEGER REFERENCES roles(id),
        base_rate DECIMAL(10,2) NOT NULL DEFAULT '0',
        overtime_multiplier DECIMAL(3,2) NOT NULL DEFAULT '1.5',
        double_time_multiplier DECIMAL(3,2) NOT NULL DEFAULT '2.0',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(profile_id, role_id)
      )
    `);
    console.log("✓ Created role_rates table");
    
    // Insert default profiles
    await db.execute(sql`
      INSERT INTO labor_rate_profiles (name, description, is_default, is_active)
      VALUES 
        ('Standard Rates', 'Default labor rates for all roles', true, true),
        ('Premium Rates', 'Higher rates for complex projects', false, true),
        ('Government Rates', 'Rates for government contracts', false, true)
    `);
    console.log("✓ Created default rate profiles");
    
    // Get all roles and create role rates for the default profile
    const roles = await db.execute(sql`SELECT id, hourly_rate FROM roles`);
    const defaultProfile = await db.execute(sql`SELECT id FROM labor_rate_profiles WHERE is_default = true LIMIT 1`);
    
    if (defaultProfile.rows.length > 0) {
      const profileId = defaultProfile.rows[0].id;
      
      for (const role of roles.rows) {
        await db.execute(sql`
          INSERT INTO role_rates (profile_id, role_id, base_rate)
          VALUES (${profileId}, ${role.id}, ${role.hourly_rate || 75})
        `);
      }
      console.log("✓ Created role rates for default profile");
    }
    
    console.log("All labor profile tables created successfully!");
  } catch (error) {
    console.error("Error creating labor profile tables:", error);
  }
}

// Run the creation
createLaborProfileTables().then(() => {
  console.log("Done");
  process.exit(0);
}).catch((error) => {
  console.error("Failed to create tables:", error);
  process.exit(1);
});
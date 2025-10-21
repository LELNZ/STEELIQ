/**
 * Create estimation_projects table if it doesn't exist
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createEstimationTables() {
  const client = await pool.connect();
  
  try {
    console.log("🔧 Creating estimation_projects table...");
    
    // Create estimation_projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS estimation_projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        client_id INTEGER REFERENCES clients(id),
        status TEXT NOT NULL DEFAULT 'draft',
        total_cost DECIMAL(12, 2) DEFAULT 0,
        margin DECIMAL(5, 2) DEFAULT 0,
        overhead_percentage DECIMAL(5, 2) DEFAULT 15,
        delivery_date TIMESTAMP,
        estimated_hours DECIMAL(8, 2),
        project_data JSONB,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    
    console.log("✅ estimation_projects table created successfully");
    
    // Create estimation_data table for storing detailed estimation data
    await client.query(`
      CREATE TABLE IF NOT EXISTS estimation_data (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES estimation_projects(id) ON DELETE CASCADE,
        materials JSONB DEFAULT '[]',
        labor JSONB DEFAULT '[]',
        equipment JSONB DEFAULT '[]',
        consumables JSONB DEFAULT '[]',
        coatings JSONB DEFAULT '[]',
        overheads JSONB DEFAULT '{}',
        margin JSONB DEFAULT '{}',
        totals JSONB DEFAULT '{}',
        overhead_percentage DECIMAL(5, 2) DEFAULT 20,
        margin_percentage DECIMAL(5, 2) DEFAULT 20,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE(project_id)
      )
    `);
    
    console.log("✅ estimation_data table created successfully");
    
    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('estimation_projects', 'estimation_data')
    `);
    
    console.log("\n📋 Created tables:");
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
  } catch (error) {
    console.error("❌ Error creating estimation tables:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
createEstimationTables()
  .then(() => {
    console.log("\n✅ All estimation tables created successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed to create estimation tables:", error);
    process.exit(1);
  });
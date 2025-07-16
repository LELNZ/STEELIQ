/**
 * Add project_data column to estimation_projects table
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addProjectDataColumn() {
  const client = await pool.connect();
  
  try {
    console.log("🔧 Adding project_data column to estimation_projects table...");
    
    // Add project_data column
    await client.query(`
      ALTER TABLE estimation_projects 
      ADD COLUMN IF NOT EXISTS project_data JSONB
    `);
    
    console.log("✅ project_data column added successfully");
    
    // Verify the column was added
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'estimation_projects' 
      AND column_name = 'project_data'
    `);
    
    if (columns.rows.length > 0) {
      console.log("✅ Verified: project_data column exists");
    }
    
  } catch (error) {
    console.error("❌ Error adding project_data column:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
addProjectDataColumn()
  .then(() => {
    console.log("\n✅ Project data column added successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed to add project data column:", error);
    process.exit(1);
  });
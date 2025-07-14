/**
 * Fix estimation_projects table - add missing columns
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixEstimationTable() {
  const client = await pool.connect();
  
  try {
    console.log("🔧 Checking estimation_projects table structure...");
    
    // Check if estimated_hours column exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'estimation_projects' 
      AND column_name = 'estimated_hours'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log("✅ Adding estimated_hours column...");
      await client.query(`
        ALTER TABLE estimation_projects 
        ADD COLUMN estimated_hours DECIMAL(8, 2)
      `);
      console.log("✅ Column added successfully");
    } else {
      console.log("✅ estimated_hours column already exists");
    }
    
    // List all columns for verification
    const allColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'estimation_projects' 
      ORDER BY ordinal_position
    `);
    
    console.log("\n📋 Current estimation_projects columns:");
    allColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
  } catch (error) {
    console.error("❌ Error fixing estimation table:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the fix
fixEstimationTable()
  .then(() => {
    console.log("\n✅ Estimation table fixed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed to fix estimation table:", error);
    process.exit(1);
  });
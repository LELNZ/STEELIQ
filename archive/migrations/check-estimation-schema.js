/**
 * Check Estimation Projects Table Schema
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkEstimationSchema() {
  const client = await pool.connect();
  
  try {
    // Check estimation_projects table structure
    const projectsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'estimation_projects' 
      ORDER BY ordinal_position
    `);
    
    console.log("📋 Estimation Projects Table Columns:");
    projectsColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check estimation_materials table structure  
    const materialsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'estimation_materials' 
      ORDER BY ordinal_position
    `);
    
    console.log("\n📋 Estimation Materials Table Columns:");
    materialsColumns.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // Check what estimation projects exist
    const existingProjects = await client.query(`
      SELECT id, name, client, status, created_at
      FROM estimation_projects 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log("\n📊 Existing Estimation Projects:");
    existingProjects.rows.forEach(proj => {
      console.log(`- ID: ${proj.id}, Name: ${proj.name}, Client: ${proj.client}, Status: ${proj.status}`);
    });
    
  } catch (error) {
    console.error("❌ Schema check failed:", error.message);
  } finally {
    client.release();
  }
}

checkEstimationSchema();
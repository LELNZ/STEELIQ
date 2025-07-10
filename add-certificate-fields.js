/**
 * Add certificate fields to team_members table
 */
import { pool } from './server/db';

async function addCertificateFields() {
  const client = await pool.connect();
  
  try {
    console.log("🔨 Adding certificate fields to team_members table...");
    
    // Add welding_certificates field
    await client.query(`
      ALTER TABLE team_members 
      ADD COLUMN IF NOT EXISTS welding_certificates jsonb DEFAULT '[]'::jsonb
    `);
    console.log("✅ Added welding_certificates field");
    
    // Add trade_licenses field
    await client.query(`
      ALTER TABLE team_members 
      ADD COLUMN IF NOT EXISTS trade_licenses jsonb DEFAULT '[]'::jsonb
    `);
    console.log("✅ Added trade_licenses field");
    
    // Add equipment_certificates field
    await client.query(`
      ALTER TABLE team_members 
      ADD COLUMN IF NOT EXISTS equipment_certificates jsonb DEFAULT '[]'::jsonb
    `);
    console.log("✅ Added equipment_certificates field");
    
    console.log("\n✨ All certificate fields added successfully!");
    
  } catch (error) {
    console.error("❌ Error adding fields:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addCertificateFields().catch(console.error);
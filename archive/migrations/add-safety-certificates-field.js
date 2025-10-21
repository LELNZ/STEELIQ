/**
 * Add safety_certificates field to team_members table
 */
import { pool } from './server/db';

async function addSafetyCertificatesField() {
  const client = await pool.connect();
  
  try {
    console.log("🔧 Adding safety_certificates field to team_members table...");
    
    // Check if field already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'team_members' 
      AND column_name = 'safety_certificates'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log("✅ safety_certificates field already exists");
      return;
    }
    
    // Add the field
    await client.query(`
      ALTER TABLE team_members 
      ADD COLUMN IF NOT EXISTS safety_certificates jsonb DEFAULT '[]'::jsonb
    `);
    
    console.log("✅ Added safety_certificates field successfully!");
    
  } catch (error) {
    console.error("❌ Error adding field:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addSafetyCertificatesField().catch(console.error);
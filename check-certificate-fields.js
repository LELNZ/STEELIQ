/**
 * Check if certificate fields exist in team_members table
 */
import { pool } from './server/db';

async function checkCertificateFields() {
  const client = await pool.connect();
  
  try {
    console.log("🔍 Checking for certificate fields in team_members table...");
    
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'team_members' 
      AND column_name IN ('welding_certificates', 'trade_licenses', 'equipment_certificates')
      ORDER BY column_name
    `);
    
    console.log("\nCertificate fields found:");
    if (result.rows.length === 0) {
      console.log("❌ No certificate fields found in team_members table");
      console.log("\n📝 These fields need to be added:");
      console.log("- welding_certificates (jsonb)");
      console.log("- trade_licenses (jsonb)");
      console.log("- equipment_certificates (jsonb)");
    } else {
      result.rows.forEach(row => {
        console.log(`✅ ${row.column_name} (${row.data_type})`);
      });
    }
    
  } catch (error) {
    console.error("❌ Error checking fields:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCertificateFields().catch(console.error);
/**
 * Check team members table structure
 */
import { pool } from './server/db.js';

async function checkTeamSchema() {
  const client = await pool.connect();
  
  try {
    console.log("🔍 Checking team_members table structure...");
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'team_members' 
      ORDER BY ordinal_position
    `);
    
    console.log("team_members columns:");
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error("❌ Error checking schema:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTeamSchema().catch(console.error);
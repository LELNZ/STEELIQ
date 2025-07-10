/**
 * Clean up all demo data from qualification reminders
 */
import { pool } from './server/db.ts';

async function cleanupDemoData() {
  const client = await pool.connect();
  
  try {
    console.log("🧹 Cleaning up demo qualification reminder data...");
    
    // Delete all existing qualification reminders
    const result = await client.query(`
      DELETE FROM qualification_reminders
    `);
    
    console.log(`✅ Deleted ${result.rowCount} qualification reminder records`);
    
    // Also check if there are any demo team members or users we should remove
    const demoUsers = await client.query(`
      SELECT id, username, name FROM users 
      WHERE username LIKE '%demo%' 
         OR username LIKE '%test%'
         OR name LIKE '%Demo%'
         OR name LIKE '%Test%'
    `);
    
    if (demoUsers.rows.length > 0) {
      console.log("\n🔍 Found demo users:");
      demoUsers.rows.forEach(user => {
        console.log(`  - ${user.name} (${user.username})`);
      });
    }
    
    console.log("\n✨ Demo data cleanup complete!");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupDemoData().catch(console.error);
/**
 * Fix Team Management Schema Column Names
 * Sync database column names with Drizzle schema definitions
 */
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixTeamSchema() {
  const client = await pool.connect();
  
  try {
    console.log("🔧 Fixing team management schema column names...");
    
    // Fix roles table - rename is_system_role to isSystemRole
    try {
      await client.query(`
        ALTER TABLE roles 
        RENAME COLUMN is_system_role TO "isSystemRole"
      `);
      console.log("✅ Fixed roles.isSystemRole column");
    } catch (error) {
      if (error.code === '42703') {
        console.log("⚠️ roles.is_system_role column already renamed or doesn't exist");
      } else {
        console.log("❌ Error fixing roles column:", error.message);
      }
    }
    
    // Fix departments table - rename head_user_id to headUserId
    try {
      await client.query(`
        ALTER TABLE departments 
        RENAME COLUMN head_user_id TO "headUserId"
      `);
      console.log("✅ Fixed departments.headUserId column");
    } catch (error) {
      if (error.code === '42703') {
        console.log("⚠️ departments.head_user_id column already renamed or doesn't exist");
      } else {
        console.log("❌ Error fixing departments column:", error.message);
      }
    }
    
    // Verify current schema
    const rolesColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles' 
      ORDER BY ordinal_position
    `);
    
    const departmentsColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'departments' 
      ORDER BY ordinal_position
    `);
    
    const teamMembersColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'team_members' 
      ORDER BY ordinal_position
    `);
    
    console.log("\n📋 Current schema verification:");
    console.log("Roles columns:", rolesColumns.rows.map(r => r.column_name));
    console.log("Departments columns:", departmentsColumns.rows.map(r => r.column_name));
    console.log("Team Members columns:", teamMembersColumns.rows.map(r => r.column_name));
    
  } catch (error) {
    console.error("❌ Schema fix failed:", error);
  } finally {
    client.release();
  }
}

fixTeamSchema();
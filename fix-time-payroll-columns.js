/**
 * Fix missing columns in time_clocks and payroll_integration tables
 */

import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function fixMissingColumns() {
  try {
    console.log("Checking and adding missing columns...");

    // Add geolocation column to time_clocks if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE time_clocks 
        ADD COLUMN IF NOT EXISTS geolocation jsonb
      `);
      console.log("✓ Added geolocation column to time_clocks table");
    } catch (error) {
      console.log("× Error adding geolocation column:", error.message);
    }

    // Add device_info column to time_clocks if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE time_clocks 
        ADD COLUMN IF NOT EXISTS device_info jsonb
      `);
      console.log("✓ Added device_info column to time_clocks table");
    } catch (error) {
      console.log("× Error adding device_info column:", error.message);
    }

    // Add task_id column to time_clocks if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE time_clocks 
        ADD COLUMN IF NOT EXISTS task_id integer REFERENCES job_tasks(id)
      `);
      console.log("✓ Added task_id column to time_clocks table");
    } catch (error) {
      console.log("× Error adding task_id column:", error.message);
    }

    // Add api_key column to payroll_integration if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE payroll_integration 
        ADD COLUMN IF NOT EXISTS api_key varchar
      `);
      console.log("✓ Added api_key column to payroll_integration table");
    } catch (error) {
      console.log("× Error adding api_key column:", error.message);
    }

    // Add api_endpoint column to payroll_integration if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE payroll_integration 
        ADD COLUMN IF NOT EXISTS api_endpoint varchar
      `);
      console.log("✓ Added api_endpoint column to payroll_integration table");
    } catch (error) {
      console.log("× Error adding api_endpoint column:", error.message);
    }

    // Add mapping_rules column to payroll_integration if it doesn't exist
    try {
      await pool.query(`
        ALTER TABLE payroll_integration 
        ADD COLUMN IF NOT EXISTS mapping_rules jsonb
      `);
      console.log("✓ Added mapping_rules column to payroll_integration table");
    } catch (error) {
      console.log("× Error adding mapping_rules column:", error.message);
    }

    console.log("\nColumn fixes completed!");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing columns:", error);
    process.exit(1);
  }
}

fixMissingColumns();
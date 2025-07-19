// Check jobs table structure
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function checkJobsTable() {
  try {
    console.log('Checking jobs table structure...\n');
    
    // Get all columns from jobs table
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'jobs'
      ORDER BY ordinal_position;
    `);
    
    if (columns.rows.length > 0) {
      console.log('Jobs table columns:');
      columns.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('Jobs table not found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkJobsTable();
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkEstimationStatus() {
  try {
    // Check all estimations and their statuses
    const result = await pool.query(`
      SELECT id, name, status, created_at, updated_at 
      FROM estimation_projects 
      ORDER BY id DESC
    `);
    
    console.log('All Estimations:');
    console.log('================');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Name: ${row.name}`);
      console.log(`Status: ${row.status}`);
      console.log(`Created: ${row.created_at}`);
      console.log(`Updated: ${row.updated_at}`);
      console.log('---');
    });
    
    // Check if the jobs table has estimation_id column
    const jobsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'jobs' 
      AND column_name = 'estimation_id'
    `);
    
    console.log('\nJobs table estimation_id column:', jobsColumns.rowCount > 0 ? 'EXISTS' : 'MISSING');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkEstimationStatus();
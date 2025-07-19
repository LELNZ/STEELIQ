// Check estimation_data table structure
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function checkEstimationDataStructure() {
  try {
    console.log('Checking estimation_data table structure...\n');
    
    // Check if estimation_data table exists
    const tableCheck = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'estimation_data'
      ORDER BY ordinal_position;
    `);
    
    console.log('Table columns:');
    tableCheck.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check existing data
    console.log('\nChecking existing data for estimation 4...');
    const existingData = await db.execute(sql`
      SELECT * FROM estimation_data WHERE project_id = 4
    `);
    
    if (existingData.rows.length > 0) {
      console.log(`Found ${existingData.rows.length} row(s)`);
      console.log('Data structure:', Object.keys(existingData.rows[0]));
      
      // Check if data is stored as JSON
      const firstRow = existingData.rows[0];
      if (firstRow.materials) {
        console.log('\nMaterials data type:', typeof firstRow.materials);
        console.log('Materials content:', firstRow.materials);
      }
    } else {
      console.log('No data found for estimation 4');
    }
    
    // Try alternative table structure
    console.log('\nChecking for alternative structure...');
    const altCheck = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%estimation%'
      ORDER BY table_name;
    `);
    
    console.log('Estimation-related tables:');
    altCheck.rows.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('Error checking structure:', error);
  } finally {
    process.exit(0);
  }
}

checkEstimationDataStructure();
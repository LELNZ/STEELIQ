// Test quote-to-job conversion
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function testQuoteToJobConversion() {
  try {
    console.log('Testing quote-to-job conversion process...\n');
    
    const estimationId = 4;
    
    // Check if a job already exists for this estimation
    const existingJob = await db.execute(sql`
      SELECT id, name, project_number 
      FROM jobs 
      WHERE estimation_id = ${estimationId}
    `);
    
    if (existingJob.rows.length > 0) {
      console.log('✅ Job already exists for this estimation:');
      console.log(`   ID: ${existingJob.rows[0].id}`);
      console.log(`   Name: ${existingJob.rows[0].name}`);
      console.log(`   Project Number: ${existingJob.rows[0].project_number}`);
    } else {
      console.log('ℹ️  No job exists yet for this estimation');
      console.log('   Use the "Create Job" button in the Estimation Pipeline to convert');
    }
    
    // Check the estimation status
    const estimation = await db.execute(sql`
      SELECT status, name, total_cost 
      FROM estimation_projects 
      WHERE id = ${estimationId}
    `);
    
    if (estimation.rows.length > 0) {
      const est = estimation.rows[0];
      console.log('\nEstimation details:');
      console.log(`   Name: ${est.name}`);
      console.log(`   Status: ${est.status}`);
      console.log(`   Total: $${parseFloat(est.total_cost).toLocaleString()}`);
      
      if (est.status === 'accepted') {
        console.log('   ✅ Ready for conversion (status = accepted)');
      } else {
        console.log('   ⚠️  Not ready for conversion (needs to be accepted)');
      }
    }
    
    // Check if resource_allocations table is ready
    const resourceCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'resource_allocations' 
      LIMIT 1
    `);
    
    if (resourceCheck.rows.length > 0) {
      console.log('\n✅ Resource allocations table exists and ready');
    } else {
      console.log('\n⚠️  Resource allocations table not found');
    }
    
    console.log('\n📋 Next steps:');
    console.log('1. Go to Estimation Pipeline (/estimation-pipeline)');
    console.log('2. Find "Steel Platform for Manufacturing Plant" in the Won column');
    console.log('3. Click the "Create Job" button');
    console.log('4. Verify all data transfers correctly to the new job');
    
  } catch (error) {
    console.error('Error testing conversion:', error);
  } finally {
    process.exit(0);
  }
}

testQuoteToJobConversion();
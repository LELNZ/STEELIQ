// Update estimation project total to match calculated value
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function updateEstimationTotal() {
  try {
    const estimationId = 4;
    const totalIncludingGst = 86455.10;
    
    // Update the estimation project total
    await db.execute(sql`
      UPDATE estimation_projects 
      SET 
        total_cost = ${totalIncludingGst},
        updated_at = NOW()
      WHERE id = ${estimationId}
    `);
    
    console.log(`✅ Updated estimation total to $${totalIncludingGst.toLocaleString()}`);
    
  } catch (error) {
    console.error('Error updating estimation total:', error);
  } finally {
    process.exit(0);
  }
}

updateEstimationTotal();
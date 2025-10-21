// Update existing estimation to accepted status for testing quote-to-job conversion
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function updateEstimationStatus() {
  try {
    console.log('Updating estimation status for quote-to-job conversion test...');
    
    // Update the Steel Platform estimation we just created
    await db.execute(sql`
      UPDATE estimation_projects 
      SET 
        status = 'accepted',
        total_cost = 125750.00,
        margin = 22.5,
        lifecycle_progress = 75,
        current_phase = 'Pre-Fabrication',
        project_number = 'QTE-2025-01-001',
        updated_at = NOW()
      WHERE id = 4
    `);
    
    console.log('✅ Estimation updated successfully!');
    console.log(`
Test Setup Complete!

To test quote-to-job conversion:
1. Navigate to "Estimation Pipeline" in the sidebar
2. Find "Steel Platform for Manufacturing Plant" in the Accepted column
3. Click the "Create Job" button on the card
4. The system will:
   - Create a new job with all estimation data
   - Link the job to the estimation
   - Update the status to show conversion
   - Initialize resource allocations
    `);
    
  } catch (error) {
    console.error('Error updating estimation:', error);
  } finally {
    process.exit(0);
  }
}

updateEstimationStatus();
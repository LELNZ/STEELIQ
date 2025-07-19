// Create test estimation project for quote-to-job conversion demonstration
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function createTestEstimation() {
  try {
    console.log('Creating test estimation project...');
    
    // First check if we have a client
    const clients = await db.execute(sql`SELECT id, name FROM clients LIMIT 1`);
    const clientId = clients.rows[0]?.id || null;
    const clientName = clients.rows[0]?.name || 'Test Client';
    
    // Create estimation project
    const estimation = await db.execute(sql`
      INSERT INTO estimation_projects (
        name,
        description,
        client_id,
        status,
        total_cost,
        margin,
        delivery_date,
        estimated_hours,
        lifecycle_progress,
        current_phase,
        project_number,
        created_at,
        updated_at
      ) VALUES (
        'Steel Platform for Manufacturing Plant',
        'Heavy-duty steel platform 15m x 10m with access stairs, handrails, and anti-slip decking. Designed for equipment loading up to 5 tonnes.',
        ${clientId},
        'accepted',
        125750.00,
        22.5,
        '2025-08-15',
        480,
        75,
        'Pre-Fabrication',
        'QTE-2025-01-001',
        NOW(),
        NOW()
      ) RETURNING id
    `);
    
    const estimationId = estimation.rows[0].id;
    console.log(`Created estimation project ID: ${estimationId}`);
    
    // Add estimation data - materials
    await db.execute(sql`
      INSERT INTO estimation_data (
        estimation_project_id,
        category,
        data,
        created_at,
        updated_at
      ) VALUES (
        ${estimationId},
        'materials',
        ${JSON.stringify({
          materials: [
            {
              id: 'mat-1',
              materialId: 123,
              materialCode: 'UB200x25.4',
              description: 'Universal Beam 200x25.4',
              quantity: 24,
              length: 6000,
              weight: 610,
              unitCost: 2.85,
              totalCost: 1738.50,
              notes: 'Main platform beams'
            },
            {
              id: 'mat-2',
              materialId: 456,
              materialCode: 'SHS100x100x6',
              description: 'Square Hollow Section 100x100x6',
              quantity: 12,
              length: 4000,
              weight: 215,
              unitCost: 3.10,
              totalCost: 666.50,
              notes: 'Support columns'
            }
          ]
        })},
        NOW(),
        NOW()
      )
    `);
    
    // Add labor data
    await db.execute(sql`
      INSERT INTO estimation_data (
        estimation_project_id,
        category,
        data,
        created_at,
        updated_at
      ) VALUES (
        ${estimationId},
        'labor',
        ${JSON.stringify({
          labor: [
            {
              id: 'labor-1',
              category: 'workshop',
              subcategory: 'fabrication',
              description: 'Cutting and welding of platform structure',
              hours: 160,
              rate: 85,
              totalCost: 13600,
              location: 'workshop'
            },
            {
              id: 'labor-2',
              category: 'onsite',
              subcategory: 'installation',
              description: 'Site installation and rigging',
              hours: 80,
              rate: 120,
              totalCost: 9600,
              location: 'site'
            }
          ]
        })},
        NOW(),
        NOW()
      )
    `);
    
    // Add lifecycle data for visual progress
    await db.execute(sql`
      INSERT INTO project_lifecycle (
        estimation_id,
        project_type,
        current_phase,
        phase_status,
        created_at,
        updated_at
      ) VALUES (
        ${estimationId},
        'steel_fabrication',
        'Pre-Fabrication',
        'approved',
        NOW(),
        NOW()
      ) RETURNING id
    `);
    
    console.log('✅ Test estimation project created successfully!');
    console.log(`
Test Project Details:
- Name: Steel Platform for Manufacturing Plant
- Status: ACCEPTED (Ready for Job Conversion)
- Total Value: $125,750.00
- Margin: 22.5%
- Lifecycle Progress: 75%
- Current Phase: Pre-Fabrication

To test quote-to-job conversion:
1. Navigate to Estimation Pipeline
2. Find this project in the "Accepted" column
3. Click "Create Job" button
4. Watch as it creates a job with all data transferred
    `);
    
  } catch (error) {
    console.error('Error creating test estimation:', error);
  } finally {
    process.exit(0);
  }
}

createTestEstimation();
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './shared/schema.js';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function fixLaborDefaults() {
  try {
    console.log('Fixing labor defaults data...');
    
    // Clear existing data
    await db.delete(schema.laborDefaults);
    
    // Insert correct data with required fields
    const laborDefaults = [
      { 
        operation_type: 'material_handling', 
        default_allocation: 'workshop',
        site_premium_percentage: 15.0,
        description: 'Loading, unloading, and moving materials', 
        is_active: true 
      },
      { 
        operation_type: 'marking_layout', 
        default_allocation: 'workshop',
        site_premium_percentage: 20.0,
        description: 'Marking out and layout of components', 
        is_active: true 
      },
      { 
        operation_type: 'fitting', 
        default_allocation: 'workshop',
        site_premium_percentage: 25.0,
        description: 'Component fitting and alignment', 
        is_active: true 
      },
      { 
        operation_type: 'welding', 
        default_allocation: 'workshop',
        site_premium_percentage: 30.0,
        description: 'All welding operations', 
        is_active: true 
      },
      { 
        operation_type: 'grinding', 
        default_allocation: 'workshop',
        site_premium_percentage: 20.0,
        description: 'Grinding and surface preparation', 
        is_active: true 
      },
      { 
        operation_type: 'inspection', 
        default_allocation: 'workshop',
        site_premium_percentage: 10.0,
        description: 'Quality inspection and checking', 
        is_active: true 
      },
      { 
        operation_type: 'painting', 
        default_allocation: 'workshop',
        site_premium_percentage: 25.0,
        description: 'Surface preparation and painting', 
        is_active: true 
      },
      { 
        operation_type: 'site_installation', 
        default_allocation: 'onsite',
        site_premium_percentage: 0.0,
        description: 'On-site installation and erection', 
        is_active: true 
      }
    ];
    
    for (const item of laborDefaults) {
      await db.insert(schema.laborDefaults).values(item);
    }
    
    console.log('✓ Labor defaults fixed and populated');
    
  } catch (error) {
    console.error('Error fixing labor defaults:', error);
  } finally {
    await pool.end();
  }
}

fixLaborDefaults();

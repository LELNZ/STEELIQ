import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './shared/schema.js';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function cleanDuplicateWelding() {
  try {
    console.log('Cleaning duplicate welding standards...');
    
    // Delete all existing welding standards
    await db.delete(schema.weldingStandards);
    console.log('✓ Cleared all welding standards');
    
    // Re-insert clean data
    const weldingStandards = [
      { name: '10mm Fillet Weld', weld_type: 'fillet', size: 10.00, time_per_meter: 25.00, is_active: true },
      { name: '12mm Fillet Weld', weld_type: 'fillet', size: 12.00, time_per_meter: 30.00, is_active: true },
      { name: '3mm Fillet Weld', weld_type: 'fillet', size: 3.00, time_per_meter: 8.00, is_active: true },
      { name: '4mm Fillet Weld', weld_type: 'fillet', size: 4.00, time_per_meter: 10.00, is_active: true },
      { name: '6mm Fillet Weld', weld_type: 'fillet', size: 6.00, time_per_meter: 15.00, is_active: true },
      { name: '8mm Fillet Weld', weld_type: 'fillet', size: 8.00, time_per_meter: 20.00, is_active: true }
    ];
    
    for (const standard of weldingStandards) {
      await db.insert(schema.weldingStandards).values(standard);
    }
    console.log('✓ Re-inserted clean welding standards');
    
  } catch (error) {
    console.error('Error cleaning welding standards:', error);
  } finally {
    await pool.end();
  }
}

cleanDuplicateWelding();

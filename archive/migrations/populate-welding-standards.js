import { db } from './server/db.js';
import { weldingStandards } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function populateWeldingStandards() {
  console.log('Adding more welding standards...');
  
  const additionalStandards = [
    // Groove welds
    { name: '3mm Groove', weld_type: 'butt_single_v', size: 3, time_per_meter: 8.5, is_active: true },
    { name: '6mm Groove', weld_type: 'butt_single_v', size: 6, time_per_meter: 15.0, is_active: true },
    { name: '8mm Groove', weld_type: 'butt_single_v', size: 8, time_per_meter: 20.0, is_active: true },
    { name: '12mm Groove', weld_type: 'butt_double_v', size: 12, time_per_meter: 35.0, is_active: true },
    { name: '16mm Groove', weld_type: 'butt_double_v', size: 16, time_per_meter: 45.0, is_active: true },
    { name: '20mm Groove', weld_type: 'butt_double_v', size: 20, time_per_meter: 60.0, is_active: true },
    
    // Butt welds
    { name: '4mm Butt Weld', weld_type: 'butt_single_v', size: 4, time_per_meter: 12.0, is_active: true },
    { name: '6mm Butt Weld', weld_type: 'butt_single_v', size: 6, time_per_meter: 18.0, is_active: true },
    { name: '10mm Butt Weld', weld_type: 'butt_double_v', size: 10, time_per_meter: 30.0, is_active: true },
    { name: '12mm Butt Weld', weld_type: 'butt_double_v', size: 12, time_per_meter: 38.0, is_active: true },
    
    // Stainless steel welding
    { name: '4mm Fillet SS', weld_type: 'fillet', size: 4, time_per_meter: 10.0, is_active: true },
    { name: '6mm Fillet SS', weld_type: 'fillet', size: 6, time_per_meter: 14.0, is_active: true },
    { name: '8mm Fillet SS', weld_type: 'fillet', size: 8, time_per_meter: 20.0, is_active: true },
    { name: '6mm Groove SS', weld_type: 'butt_single_v', size: 6, time_per_meter: 22.0, is_active: true },
    { name: '10mm Groove SS', weld_type: 'butt_double_v', size: 10, time_per_meter: 40.0, is_active: true },
    
    // Aluminum welding
    { name: '4mm Fillet AL', weld_type: 'fillet', size: 4, time_per_meter: 8.0, is_active: true },
    { name: '6mm Fillet AL', weld_type: 'fillet', size: 6, time_per_meter: 12.0, is_active: true },
    { name: '8mm Fillet AL', weld_type: 'fillet', size: 8, time_per_meter: 18.0, is_active: true },
    { name: '5mm Groove AL', weld_type: 'butt_single_v', size: 5, time_per_meter: 20.0, is_active: true },
    
    // Special welds
    { name: 'Plug Weld 10mm', weld_type: 'plug', size: 10, time_per_meter: 2.5, is_active: true },
    { name: 'Slot Weld 8x20mm', weld_type: 'seal', size: 8, time_per_meter: 4.0, is_active: true },
    { name: 'Tack Weld', weld_type: 'fillet', size: 3, time_per_meter: 0.5, is_active: true },
    { name: 'Seal Weld', weld_type: 'seal', size: 3, time_per_meter: 5.0, is_active: true }
  ];
  
  try {
    for (const standard of additionalStandards) {
      // Check if already exists
      const existing = await db.select()
        .from(weldingStandards)
        .where(eq(weldingStandards.name, standard.name))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(weldingStandards).values(standard);
        console.log(`Added welding standard: ${standard.name}`);
      } else {
        console.log(`Welding standard already exists: ${standard.name}`);
      }
    }
    console.log('Welding standards population complete!');
  } catch (error) {
    console.error('Error populating welding standards:', error);
  }
  process.exit(0);
}

populateWeldingStandards();
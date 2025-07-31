import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from './shared/schema.js';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

async function populateOperationsStandards() {
  console.log('Populating operations standards with default data...');

  try {
    // Populate Welding Standards
    const weldingStandards = [
      { name: '10mm Fillet Weld', weld_type: 'fillet', size: 10.00, time_per_meter: 25.00, description: 'Standard 10mm fillet weld', is_active: true },
      { name: '12mm Fillet Weld', weld_type: 'fillet', size: 12.00, time_per_meter: 30.00, description: 'Standard 12mm fillet weld', is_active: true },
      { name: '3mm Fillet Weld', weld_type: 'fillet', size: 3.00, time_per_meter: 8.00, description: 'Light 3mm fillet weld', is_active: true },
      { name: '4mm Fillet Weld', weld_type: 'fillet', size: 4.00, time_per_meter: 10.00, description: 'Standard 4mm fillet weld', is_active: true },
      { name: '5mm Fillet Weld', weld_type: 'fillet', size: 5.00, time_per_meter: 12.00, description: 'Standard 5mm fillet weld', is_active: true },
      { name: '6mm Fillet Weld', weld_type: 'fillet', size: 6.00, time_per_meter: 15.00, description: 'Standard 6mm fillet weld', is_active: true },
      { name: '8mm Fillet Weld', weld_type: 'fillet', size: 8.00, time_per_meter: 20.00, description: 'Standard 8mm fillet weld', is_active: true },
      { name: 'Double-Bevel Butt Weld', weld_type: 'butt_double_bevel', size: null, time_per_meter: 40.00, description: 'Full penetration double bevel', is_active: true },
      { name: 'Double-V Butt Weld', weld_type: 'butt_double_v', size: null, time_per_meter: 45.00, description: 'Full penetration double V', is_active: true },
      { name: 'Plug Weld', weld_type: 'plug', size: null, time_per_meter: 3.00, description: 'Per plug weld', is_active: true },
      { name: 'Seal Weld', weld_type: 'seal', size: null, time_per_meter: 5.00, description: 'Seal weld for weather protection', is_active: true },
      { name: 'Single-Bevel Butt Weld', weld_type: 'butt_single_bevel', size: null, time_per_meter: 30.00, description: 'Single bevel preparation', is_active: true },
      { name: 'Single-V Butt Weld', weld_type: 'butt_single_v', size: null, time_per_meter: 35.00, description: 'Single V preparation', is_active: true }
    ];

    for (const standard of weldingStandards) {
      await db.insert(schema.weldingStandards).values(standard).onConflictDoNothing();
    }
    console.log('✓ Welding standards populated');

    // Populate Drilling Standards
    const drillingStandards = [
      { name: 'Small Holes (8-12mm) - Mag Drill', method: 'mag_drill', diameter_min: 8, diameter_max: 12, time_per_hole: 1.5, description: 'Magnetic drill for small holes', is_active: true },
      { name: 'Medium Holes (13-20mm) - Mag Drill', method: 'mag_drill', diameter_min: 13, diameter_max: 20, time_per_hole: 2.5, description: 'Magnetic drill for medium holes', is_active: true },
      { name: 'Large Holes (21-30mm) - Mag Drill', method: 'mag_drill', diameter_min: 21, diameter_max: 30, time_per_hole: 4.0, description: 'Magnetic drill for large holes', is_active: true },
      { name: 'Extra Large Holes (31-50mm) - Mag Drill', method: 'mag_drill', diameter_min: 31, diameter_max: 50, time_per_hole: 6.0, description: 'Magnetic drill for extra large holes', is_active: true },
      { name: 'Small Holes (6-10mm) - Hand Drill', method: 'hand_drill', diameter_min: 6, diameter_max: 10, time_per_hole: 2.0, description: 'Hand drill for field work', is_active: true },
      { name: 'Plasma Cut Holes (10-100mm)', method: 'plasma', diameter_min: 10, diameter_max: 100, time_per_hole: 1.0, description: 'Plasma cutting for large holes', is_active: true },
      { name: 'Laser Cut Holes (3-25mm)', method: 'laser', diameter_min: 3, diameter_max: 25, time_per_hole: 0.5, description: 'Laser cutting for precision holes', is_active: true },
      { name: 'Punch Holes (10-30mm)', method: 'punch', diameter_min: 10, diameter_max: 30, time_per_hole: 0.3, description: 'Hydraulic punch for production', is_active: true }
    ];

    for (const standard of drillingStandards) {
      await db.insert(schema.drillingStandards).values(standard).onConflictDoNothing();
    }
    console.log('✓ Drilling standards populated');

    // Populate Cutting Standards
    const cuttingStandards = [
      { name: 'Mild Steel Thin (3-6mm)', material_type: 'mild_steel', thickness_min: 3, thickness_max: 6, time_per_meter: 2.0, description: 'Plasma cutting thin mild steel', is_active: true },
      { name: 'Mild Steel Medium (7-12mm)', material_type: 'mild_steel', thickness_min: 7, thickness_max: 12, time_per_meter: 3.5, description: 'Plasma cutting medium mild steel', is_active: true },
      { name: 'Mild Steel Thick (13-25mm)', material_type: 'mild_steel', thickness_min: 13, thickness_max: 25, time_per_meter: 5.0, description: 'Plasma cutting thick mild steel', is_active: true },
      { name: 'Mild Steel Extra Thick (26-50mm)', material_type: 'mild_steel', thickness_min: 26, thickness_max: 50, time_per_meter: 8.0, description: 'Oxy cutting extra thick mild steel', is_active: true },
      { name: 'Stainless Steel Thin (3-6mm)', material_type: 'stainless', thickness_min: 3, thickness_max: 6, time_per_meter: 3.0, description: 'Plasma cutting thin stainless', is_active: true },
      { name: 'Stainless Steel Medium (7-12mm)', material_type: 'stainless', thickness_min: 7, thickness_max: 12, time_per_meter: 5.0, description: 'Plasma cutting medium stainless', is_active: true },
      { name: 'Aluminum Thin (3-6mm)', material_type: 'aluminum', thickness_min: 3, thickness_max: 6, time_per_meter: 1.5, description: 'Plasma cutting thin aluminum', is_active: true },
      { name: 'Aluminum Medium (7-12mm)', material_type: 'aluminum', thickness_min: 7, thickness_max: 12, time_per_meter: 2.5, description: 'Plasma cutting medium aluminum', is_active: true },
      { name: 'High Tensile Thin (3-6mm)', material_type: 'high_tensile', thickness_min: 3, thickness_max: 6, time_per_meter: 3.5, description: 'Plasma cutting thin high tensile', is_active: true },
      { name: 'High Tensile Medium (7-12mm)', material_type: 'high_tensile', thickness_min: 7, thickness_max: 12, time_per_meter: 5.5, description: 'Plasma cutting medium high tensile', is_active: true }
    ];

    for (const standard of cuttingStandards) {
      await db.insert(schema.cuttingStandards).values(standard).onConflictDoNothing();
    }
    console.log('✓ Cutting standards populated');

    // Populate Position Factors
    const positionFactors = [
      { position: 'PA - Flat', factor: 1.0, description: 'Flat position (downhand)', is_active: true },
      { position: 'PB - Horizontal Fillet', factor: 1.2, description: 'Horizontal fillet position', is_active: true },
      { position: 'PC - Horizontal', factor: 1.3, description: 'Horizontal butt position', is_active: true },
      { position: 'PD - Horizontal Overhead Fillet', factor: 1.5, description: 'Overhead fillet position', is_active: true },
      { position: 'PE - Overhead', factor: 1.8, description: 'Overhead butt position', is_active: true },
      { position: 'PF - Vertical Up', factor: 1.5, description: 'Vertical upward progression', is_active: true },
      { position: 'PG - Vertical Down', factor: 1.2, description: 'Vertical downward progression', is_active: true },
      { position: 'H-L045 - Pipe Fixed 45°', factor: 1.4, description: 'Fixed pipe at 45 degrees', is_active: true },
      { position: 'J-L045 - Pipe Fixed Inclined', factor: 1.6, description: 'Fixed inclined pipe', is_active: true }
    ];

    for (const factor of positionFactors) {
      await db.insert(schema.positionFactors).values(factor).onConflictDoNothing();
    }
    console.log('✓ Position factors populated');

    // Populate Assembly Templates
    const assemblyTemplates = [
      { 
        code: 'COL-STD', 
        name: 'Standard Column Assembly', 
        components: ['Column Section', 'Base Plate', '4x Stiffeners', '4x Anchor Bolts'], 
        main_material: '250UC89.5',
        description: 'Standard column with base plate and stiffeners', 
        is_active: true 
      },
      { 
        code: 'BEAM-STD', 
        name: 'Standard Beam Assembly', 
        components: ['Beam Section', '2x End Plates', 'Web Stiffeners'], 
        main_material: '310UB40.4',
        description: 'Standard beam with end plate connections', 
        is_active: true 
      },
      { 
        code: 'TRUSS-SML', 
        name: 'Small Truss Assembly', 
        components: ['Top Chord', 'Bottom Chord', 'Web Members', 'Gusset Plates'], 
        main_material: '150x90x8 EA',
        description: 'Small span truss up to 12m', 
        is_active: true 
      },
      { 
        code: 'FRAME-PRT', 
        name: 'Portal Frame Assembly', 
        components: ['2x Columns', '2x Rafters', 'Haunch Plates', 'Base Plates'], 
        main_material: '360UB56.7',
        description: 'Standard portal frame assembly', 
        is_active: true 
      },
      { 
        code: 'STAIR-STD', 
        name: 'Standard Stair Assembly', 
        components: ['2x Stringers', 'Treads', 'Landing Platform', 'Handrails'], 
        main_material: '200PFC',
        description: 'Single flight stair with landing', 
        is_active: true 
      },
      { 
        code: 'BRACE-STD', 
        name: 'Standard Bracing Assembly', 
        components: ['Brace Members', 'Gusset Plates', 'Bolts'], 
        main_material: '100x100x6 SHS',
        description: 'Cross bracing or K-bracing assembly', 
        is_active: true 
      }
    ];

    for (const template of assemblyTemplates) {
      await db.insert(schema.assemblyTemplates).values(template).onConflictDoNothing();
    }
    console.log('✓ Assembly templates populated');

    // Populate Labor Defaults
    const laborDefaults = [
      { 
        operation_type: 'material_handling', 
        base_time_hours: 0.5, 
        skill_level: 'general', 
        crew_size: 2, 
        description: 'Loading, unloading, and moving materials', 
        is_active: true 
      },
      { 
        operation_type: 'marking_layout', 
        base_time_hours: 1.0, 
        skill_level: 'skilled', 
        crew_size: 1, 
        description: 'Marking out and layout of components', 
        is_active: true 
      },
      { 
        operation_type: 'fitting', 
        base_time_hours: 2.0, 
        skill_level: 'skilled', 
        crew_size: 2, 
        description: 'Component fitting and alignment', 
        is_active: true 
      },
      { 
        operation_type: 'tack_welding', 
        base_time_hours: 1.0, 
        skill_level: 'skilled', 
        crew_size: 1, 
        description: 'Tack welding for assembly', 
        is_active: true 
      },
      { 
        operation_type: 'grinding', 
        base_time_hours: 0.5, 
        skill_level: 'general', 
        crew_size: 1, 
        description: 'Grinding and surface preparation', 
        is_active: true 
      },
      { 
        operation_type: 'inspection', 
        base_time_hours: 0.5, 
        skill_level: 'supervisor', 
        crew_size: 1, 
        description: 'Quality inspection and checking', 
        is_active: true 
      },
      { 
        operation_type: 'paint_prep', 
        base_time_hours: 1.0, 
        skill_level: 'general', 
        crew_size: 2, 
        description: 'Surface preparation for painting', 
        is_active: true 
      },
      { 
        operation_type: 'crane_operation', 
        base_time_hours: 1.0, 
        skill_level: 'certified', 
        crew_size: 2, 
        description: 'Crane operation and rigging', 
        is_active: true 
      }
    ];

    for (const laborDefault of laborDefaults) {
      await db.insert(schema.laborDefaults).values(laborDefault).onConflictDoNothing();
    }
    console.log('✓ Labor defaults populated');

    console.log('\n✅ All operations standards populated successfully!');
    
  } catch (error) {
    console.error('Error populating operations standards:', error);
  } finally {
    await pool.end();
  }
}

populateOperationsStandards();
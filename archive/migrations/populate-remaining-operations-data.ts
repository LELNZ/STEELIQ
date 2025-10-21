import { db } from './server/db';
import { 
  drillingStandards, 
  cuttingStandards, 
  positionFactors, 
  assemblyTemplates, 
  laborDefaults 
} from './shared/schema';

async function populateRemainingData() {
  console.log('Populating remaining operations standards data...');

  try {
    // Check if drilling standards exist
    const existingDrilling = await db.select().from(drillingStandards).limit(1);
    if (existingDrilling.length === 0) {
      console.log('Populating drilling standards...');
      await db.insert(drillingStandards).values([
        { name: 'Small Holes (≤10mm)', hole_diameter: 8, material_type: 'steel', time_per_hole: 0.5, is_active: true },
        { name: 'Medium Holes (11-20mm)', hole_diameter: 16, material_type: 'steel', time_per_hole: 1.0, is_active: true },
        { name: 'Large Holes (21-30mm)', hole_diameter: 25, material_type: 'steel', time_per_hole: 2.0, is_active: true },
        { name: 'Extra Large Holes (>30mm)', hole_diameter: 40, material_type: 'steel', time_per_hole: 3.5, is_active: true },
        { name: 'Stainless Steel Small', hole_diameter: 8, material_type: 'stainless_steel', time_per_hole: 0.8, is_active: true },
        { name: 'Stainless Steel Medium', hole_diameter: 16, material_type: 'stainless_steel', time_per_hole: 1.5, is_active: true }
      ]);
    }

    // Check if cutting standards exist
    const existingCutting = await db.select().from(cuttingStandards).limit(1);
    if (existingCutting.length === 0) {
      console.log('Populating cutting standards...');
      await db.insert(cuttingStandards).values([
        { name: 'Steel Plasma ≤10mm', material_type: 'steel', thickness_min: 0, thickness_max: 10, time_per_meter: 0.5, is_active: true },
        { name: 'Steel Plasma 11-20mm', material_type: 'steel', thickness_min: 11, thickness_max: 20, time_per_meter: 1.0, is_active: true },
        { name: 'Steel Plasma 21-40mm', material_type: 'steel', thickness_min: 21, thickness_max: 40, time_per_meter: 2.0, is_active: true },
        { name: 'Steel Oxy-Cut 10-25mm', material_type: 'steel', thickness_min: 10, thickness_max: 25, time_per_meter: 1.5, is_active: true },
        { name: 'Steel Oxy-Cut 26-50mm', material_type: 'steel', thickness_min: 26, thickness_max: 50, time_per_meter: 3.0, is_active: true },
        { name: 'Aluminum ≤10mm', material_type: 'aluminum', thickness_min: 0, thickness_max: 10, time_per_meter: 0.3, is_active: true }
      ]);
    }

    // Check if position factors exist
    const existingPositions = await db.select().from(positionFactors).limit(1);
    if (existingPositions.length === 0) {
      console.log('Populating position factors...');
      await db.insert(positionFactors).values([
        { position: 'PA - Flat', factor: 1.00, description: 'Flat position (downhand)', is_active: true },
        { position: 'PB - Horizontal Fillet', factor: 1.20, description: 'Horizontal fillet position', is_active: true },
        { position: 'PC - Horizontal', factor: 1.30, description: 'Horizontal butt position', is_active: true },
        { position: 'PD - Horizontal Overhead Fillet', factor: 1.50, description: 'Overhead fillet position', is_active: true },
        { position: 'PE - Overhead', factor: 1.80, description: 'Overhead butt position', is_active: true },
        { position: 'PF - Vertical Up', factor: 1.50, description: 'Vertical upward progression', is_active: true },
        { position: 'PG - Vertical Down', factor: 1.20, description: 'Vertical downward progression', is_active: true }
      ]);
    }

    // Check if assembly templates exist
    const existingAssembly = await db.select().from(assemblyTemplates).limit(1);
    if (existingAssembly.length === 0) {
      console.log('Populating assembly templates...');
      await db.insert(assemblyTemplates).values([
        { 
          code: 'COL-STD', 
          name: 'Standard Column Assembly', 
          description: 'Standard column with base plate and stiffeners',
          main_material: '250UC89.5',
          components: ['Column Section', 'Base Plate', '4x Stiffeners', '4x Anchor Bolts'],
          is_active: true 
        },
        { 
          code: 'BEAM-STD', 
          name: 'Standard Beam Assembly', 
          description: 'Standard beam with end plate connections',
          main_material: '310UB40.4',
          components: ['Beam Section', '2x End Plates', 'Web Stiffeners'],
          is_active: true 
        },
        { 
          code: 'TRUSS-SML', 
          name: 'Small Truss Assembly', 
          description: 'Small span truss up to 12m',
          main_material: '150x90x8 EA',
          components: ['Top Chord', 'Bottom Chord', 'Web Members', 'Gusset Plates'],
          is_active: true 
        }
      ]);
    }

    // Check if labor defaults exist
    const existingLabor = await db.select().from(laborDefaults).limit(1);
    if (existingLabor.length === 0) {
      console.log('Populating labor defaults...');
      await db.insert(laborDefaults).values([
        { operation_type: 'material_handling', default_allocation: 'workshop', site_premium_percentage: 15.0, description: 'Loading, unloading, and moving materials', is_active: true },
        { operation_type: 'marking_layout', default_allocation: 'workshop', site_premium_percentage: 20.0, description: 'Marking out and layout of components', is_active: true },
        { operation_type: 'fitting', default_allocation: 'workshop', site_premium_percentage: 25.0, description: 'Component fitting and alignment', is_active: true },
        { operation_type: 'welding', default_allocation: 'workshop', site_premium_percentage: 30.0, description: 'All welding operations', is_active: true },
        { operation_type: 'grinding', default_allocation: 'workshop', site_premium_percentage: 20.0, description: 'Grinding and surface preparation', is_active: true },
        { operation_type: 'inspection', default_allocation: 'workshop', site_premium_percentage: 10.0, description: 'Quality inspection and checking', is_active: true },
        { operation_type: 'painting', default_allocation: 'workshop', site_premium_percentage: 25.0, description: 'Surface preparation and painting', is_active: true },
        { operation_type: 'site_installation', default_allocation: 'onsite', site_premium_percentage: 0.0, description: 'On-site installation and erection', is_active: true }
      ]);
    }

    console.log('All operations standards data populated successfully!');
  } catch (error) {
    console.error('Error populating data:', error);
    process.exit(1);
  }

  process.exit(0);
}

populateRemainingData();
// Fix estimation data for Steel Platform project
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function fixEstimationData() {
  try {
    console.log('Fixing estimation data for Steel Platform project...\n');
    
    const estimationId = 4;
    
    // Sample data matching the structure
    const materialsData = [
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
      },
      {
        id: 'mat-3',
        materialId: 789,
        materialCode: 'FL100x10',
        description: 'Flat Bar 100x10',
        quantity: 50,
        length: 3000,
        weight: 118,
        unitCost: 2.20,
        totalCost: 259.60,
        notes: 'Gussets and connections'
      }
    ];
    
    const laborData = [
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
      },
      {
        id: 'labor-3',
        category: 'workshop',
        subcategory: 'preparation',
        description: 'Material handling and preparation',
        hours: 40,
        rate: 75,
        totalCost: 3000,
        location: 'workshop'
      }
    ];
    
    const equipmentData = [
      {
        id: 'equip-1',
        equipmentType: 'rental',
        category: 'transport',
        name: 'Mobile Crane 50T',
        hours: 16,
        rate: 350,
        totalCost: 5600,
        fuelCost: 800,
        operatorCost: 1920,
        notes: 'For installation'
      },
      {
        id: 'equip-2',
        equipmentType: 'inhouse',
        category: 'fabrication',
        name: 'Plasma Cutter',
        hours: 40,
        rate: 25,
        totalCost: 1000,
        fuelCost: 320,
        operatorCost: 0,
        notes: 'Cutting operations'
      }
    ];
    
    const consumablesData = [
      {
        id: 'cons-1',
        category: 'welding',
        itemType: 'welding_wire',
        specification: 'ER70S-6',
        quantity: 25,
        unit: 'kg',
        unitCost: 12.50,
        totalCost: 312.50,
        notes: 'MIG welding wire'
      },
      {
        id: 'cons-2',
        category: 'cutting',
        itemType: 'cutting_disc',
        specification: '230mm x 2.0mm',
        quantity: 50,
        unit: 'pieces',
        unitCost: 3.80,
        totalCost: 190.00,
        notes: 'Angle grinder discs'
      }
    ];
    
    const coatingsData = [
      {
        id: 'coat-1',
        systemId: 4325,
        systemCode: 'EP2',
        systemName: 'Epoxy zinc primer + epoxy MIO',
        area: 450,
        unitCost: 28.50,
        totalCost: 12825.00,
        notes: 'C3 environment protection'
      }
    ];
    
    const overheadsData = {
      percentage: 22,
      amount: 10465.00
    };
    
    const marginData = {
      percentage: 22.5,
      amount: 12881.25
    };
    
    const totalsData = {
      materials: 2664.60,
      labor: 26200.00,
      equipment: 9640.00,
      consumables: 502.50,
      coatings: 12825.00,
      subcontractors: 0,
      directCosts: 51832.10,
      overheads: 10465.00,
      subtotal: 62297.10,
      margin: 12881.25,
      totalBeforeGst: 75178.35,
      gst: 11276.75,
      totalIncludingGst: 86455.10
    };
    
    // Update the existing row
    const result = await db.execute(sql`
      UPDATE estimation_data 
      SET 
        materials = ${JSON.stringify(materialsData)}::jsonb,
        labor = ${JSON.stringify(laborData)}::jsonb,
        equipment = ${JSON.stringify(equipmentData)}::jsonb,
        consumables = ${JSON.stringify(consumablesData)}::jsonb,
        coatings = ${JSON.stringify(coatingsData)}::jsonb,
        overheads = ${JSON.stringify(overheadsData)}::jsonb,
        margin = ${JSON.stringify(marginData)}::jsonb,
        totals = ${JSON.stringify(totalsData)}::jsonb,
        overhead_percentage = ${overheadsData.percentage},
        margin_percentage = ${marginData.percentage},
        updated_at = NOW()
      WHERE project_id = ${estimationId}
      RETURNING id
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Successfully updated estimation data!');
      
      // Verify the update
      const verify = await db.execute(sql`
        SELECT 
          jsonb_array_length(materials) as material_count,
          jsonb_array_length(labor) as labor_count,
          jsonb_array_length(equipment) as equipment_count,
          jsonb_array_length(consumables) as consumables_count,
          jsonb_array_length(coatings) as coatings_count
        FROM estimation_data 
        WHERE project_id = ${estimationId}
      `);
      
      const counts = verify.rows[0];
      console.log('\nData counts:');
      console.log(`- Materials: ${counts.material_count} items`);
      console.log(`- Labor: ${counts.labor_count} items`);
      console.log(`- Equipment: ${counts.equipment_count} items`);
      console.log(`- Consumables: ${counts.consumables_count} items`);
      console.log(`- Coatings: ${counts.coatings_count} items`);
      console.log(`\nTotal project value: $${totalsData.totalIncludingGst.toLocaleString()}`);
    } else {
      console.log('⚠️  No rows updated - estimation data may not exist');
    }
    
  } catch (error) {
    console.error('Error fixing estimation data:', error);
  } finally {
    process.exit(0);
  }
}

fixEstimationData();
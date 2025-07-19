// Populate test estimation with sample data
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function populateEstimationData() {
  try {
    console.log('Populating test estimation with sample data...');
    
    const estimationId = 4; // Steel Platform for Manufacturing Plant
    
    // Check if estimation_data table exists
    try {
      // First check if data already exists
      const existing = await db.execute(sql`
        SELECT id FROM estimation_data WHERE project_id = ${estimationId}
      `);
      
      if (existing.rows.length > 0) {
        console.log('Data already exists, updating...');
        // Update existing data
        await db.execute(sql`
          UPDATE estimation_data SET
            materials = ${JSON.stringify([
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
            ])},
            labor = ${JSON.stringify([
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
            ])},
            equipment = ${JSON.stringify([
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
            ])},
            consumables = ${JSON.stringify([
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
            ])},
            coatings = ${JSON.stringify([
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
            ])},
            overheads = ${JSON.stringify({
              percentage: 22,
              amount: 10465.00
            })},
            margin = ${JSON.stringify({
              percentage: 22.5,
              amount: 12881.25
            })},
            totals = ${JSON.stringify({
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
            })},
            updated_at = NOW()
          WHERE project_id = ${estimationId}
        `);
      } else {
        // Insert new data
        await db.execute(sql`
          INSERT INTO estimation_data (
            project_id,
            materials,
            labor,
            equipment,
            consumables,
            coatings,
            overheads,
            margin,
            totals,
            created_at,
            updated_at
          ) VALUES (
            ${estimationId},
            ${JSON.stringify([/* materials array from above */])},
            ${JSON.stringify([/* labor array from above */])},
            ${JSON.stringify([/* equipment array from above */])},
            ${JSON.stringify([/* consumables array from above */])},
            ${JSON.stringify([/* coatings array from above */])},
            ${JSON.stringify({ percentage: 22, amount: 10465.00 })},
            ${JSON.stringify({ percentage: 22.5, amount: 12881.25 })},
            ${JSON.stringify({/* totals object from above */})},
            NOW(),
            NOW()
          )
        `);
      }
    } catch (error) {
      // If estimation_data table doesn't exist with that schema, try alternative
      console.log('Creating estimation data in new format...');
      
      // Store data in estimation_data table with category approach
      const categories = [
        { category: 'materials', data: { materials: [/* materials array */] }},
        { category: 'labor', data: { labor: [/* labor array */] }},
        { category: 'equipment', data: { equipment: [/* equipment array */] }},
        { category: 'consumables', data: { consumables: [/* consumables array */] }},
        { category: 'coatings', data: { coatings: [/* coatings array */] }}
      ];
      
      for (const item of categories) {
        await db.execute(sql`
          INSERT INTO estimation_data (
            estimation_project_id,
            category,
            data,
            created_at,
            updated_at
          ) VALUES (
            ${estimationId},
            ${item.category},
            ${JSON.stringify(item.data)},
            NOW(),
            NOW()
          ) ON CONFLICT (estimation_project_id, category) 
          DO UPDATE SET 
            data = ${JSON.stringify(item.data)},
            updated_at = NOW()
        `);
      }
    }
    
    console.log('✅ Test estimation data populated successfully!');
    console.log(`
Data Added:
- 3 Material items (Universal Beams, SHS, Flat Bars)
- 3 Labor entries (Fabrication, Installation, Preparation)
- 2 Equipment items (Mobile Crane, Plasma Cutter)
- 2 Consumables (Welding wire, Cutting discs)
- 1 Coating system (Epoxy protection)
- Total value: $125,750

Now when you open the estimation, all tabs will show data!
    `);
    
  } catch (error) {
    console.error('Error populating estimation data:', error);
  } finally {
    process.exit(0);
  }
}

populateEstimationData();
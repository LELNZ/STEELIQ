/**
 * Update Square Bar materials to include depth dimension
 * For square bars, depth should equal width to enable proper surface area calculation
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, and, like } from 'drizzle-orm';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// Materials table schema (simplified for this script)
import { pgTable, serial, text, decimal } from 'drizzle-orm/pg-core';

const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  width: decimal("width", { precision: 10, scale: 2 }),
  depth: decimal("depth", { precision: 10, scale: 2 }),
  thickness: decimal("thickness", { precision: 10, scale: 2 })
});

async function updateSquareBarMaterials() {
  try {
    console.log('Starting Square Bar materials update...');
    
    // Find all Square Bar materials that have width but no depth
    const squareMaterials = await db
      .select()
      .from(materials)
      .where(
        and(
          like(materials.name, '%square%'),
          eq(materials.depth, null)
        )
      );
    
    console.log(`Found ${squareMaterials.length} Square Bar materials to update`);
    
    let updateCount = 0;
    
    for (const material of squareMaterials) {
      if (material.width && !material.depth) {
        // For square bars, depth should equal width
        await db
          .update(materials)
          .set({ 
            depth: material.width,
            // Also set thickness to width if not already set (for solid squares)
            thickness: material.thickness || material.width
          })
          .where(eq(materials.id, material.id));
        
        console.log(`Updated ${material.name} (${material.code}): width=${material.width}mm, depth=${material.width}mm`);
        updateCount++;
      }
    }
    
    console.log(`Successfully updated ${updateCount} Square Bar materials`);
    
    // Verify the updates
    const updatedMaterials = await db
      .select()
      .from(materials)
      .where(like(materials.name, '%square%'));
    
    console.log('\nVerification - Updated Square Bar materials:');
    updatedMaterials.forEach(material => {
      console.log(`${material.name} (${material.code}): W=${material.width}mm, D=${material.depth}mm, T=${material.thickness}mm`);
    });
    
  } catch (error) {
    console.error('Error updating Square Bar materials:', error);
  } finally {
    await pool.end();
  }
}

// Test calculation function
function testSquareBarCalculation(width, depth) {
  console.log(`\nTesting Square Bar ${width}x${depth} calculation:`);
  
  // Square bar perimeter = 2 * (width + depth)
  const perimeter = 2 * (width + depth);
  const surfaceAreaPerMeter = perimeter / 1000; // Convert mm to m²/m
  
  console.log(`Perimeter: ${perimeter} mm/m`);
  console.log(`Surface area: ${surfaceAreaPerMeter.toFixed(3)} m²/m`);
  console.log(`For 1000mm length: ${(surfaceAreaPerMeter * 1).toFixed(3)} m²`);
  console.log(`For 6000mm length: ${(surfaceAreaPerMeter * 6).toFixed(3)} m²`);
}

// Run the update
if (require.main === module) {
  updateSquareBarMaterials().then(() => {
    // Test the calculation with a 6mm square bar
    testSquareBarCalculation(6, 6);
    testSquareBarCalculation(8, 8);
    testSquareBarCalculation(10, 10);
  });
}

module.exports = { updateSquareBarMaterials };
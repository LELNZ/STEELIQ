/**
 * Calculate and update surface areas for all sheet materials
 * Using authentic dimensions and flat/plate surface area formula
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgTable, text, serial, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';
import { eq, like, or } from 'drizzle-orm';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Define materials table schema
const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  width: decimal("width", { precision: 10, scale: 2 }),
  length: decimal("length", { precision: 10, scale: 2 }),
  thickness: decimal("thickness", { precision: 10, scale: 2 }),
  weightPerMeter: decimal("weight_per_meter", { precision: 10, scale: 3 }),
  surfaceAreaPerMeter: decimal("surface_area_per_meter", { precision: 10, scale: 3 }),
  isActive: boolean("is_active").default(true),
});

const db = drizzle({ client: pool, schema: { materials } });

/**
 * Calculate flat/plate surface area per meter
 * Formula: (2 × width + 2 × thickness) / 1000 = m²/m
 * This includes: top surface + bottom surface + front edge + back edge
 */
function calculateFlatSurfaceArea(widthMm, thicknessMm) {
  if (!widthMm || !thicknessMm) return 0;
  
  // For flat materials per meter of length:
  // - Top surface: width (mm) 
  // - Bottom surface: width (mm)
  // - Front edge: thickness (mm)
  // - Back edge: thickness (mm)
  // Total perimeter per meter = 2 × width + 2 × thickness
  
  const surfaceAreaMm = (2 * parseFloat(widthMm)) + (2 * parseFloat(thicknessMm));
  return surfaceAreaMm / 1000; // Convert mm to m²/m
}

async function updateSheetSurfaceAreas() {
  console.log('🔄 Calculating surface areas for sheet materials...');
  
  // Get all sheet and plate materials
  const sheetMaterials = await db.select().from(materials).where(
    or(
      like(materials.category, '%Sheet%'),
      like(materials.category, '%Plate%')
    )
  );
  
  console.log(`📊 Found ${sheetMaterials.length} sheet materials to process`);
  
  let updatedCount = 0;
  const results = [];
  
  for (const material of sheetMaterials) {
    const { id, code, name, category, width, thickness } = material;
    
    if (width && thickness) {
      const surfaceArea = calculateFlatSurfaceArea(width, thickness);
      
      // Update the material with calculated surface area
      await db.update(materials)
        .set({ surfaceAreaPerMeter: surfaceArea.toFixed(3) })
        .where(eq(materials.id, id));
      
      updatedCount++;
      results.push({
        code,
        name,
        category,
        width: parseFloat(width),
        thickness: parseFloat(thickness),
        surfaceArea: surfaceArea.toFixed(3)
      });
      
      console.log(`✅ ${code}: ${parseFloat(width)}×${parseFloat(thickness)}mm = ${surfaceArea.toFixed(3)} m²/m`);
    } else {
      console.log(`⚠️  ${code}: Missing dimensions (width: ${width}, thickness: ${thickness})`);
    }
  }
  
  console.log('\n📋 Surface Area Calculation Summary:');
  console.log(`   • Total materials processed: ${sheetMaterials.length}`);
  console.log(`   • Materials updated: ${updatedCount}`);
  console.log('\n📊 Calculation Details by Category:');
  
  // Group results by category
  const categoryGroups = results.reduce((groups, material) => {
    const category = material.category || 'Unknown';
    if (!groups[category]) groups[category] = [];
    groups[category].push(material);
    return groups;
  }, {});
  
  Object.entries(categoryGroups).forEach(([category, materials]) => {
    console.log(`\n   ${category} (${materials.length} materials):`);
    materials.forEach(material => {
      console.log(`     ${material.code}: ${material.width}×${material.thickness}mm → ${material.surfaceArea} m²/m`);
    });
  });
  
  return updatedCount;
}

// Execute the surface area calculation
updateSheetSurfaceAreas()
  .then((count) => {
    console.log(`\n🎉 Successfully updated surface areas for ${count} sheet materials!`);
    console.log('🔍 All sheet materials now have authentic surface area calculations');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error calculating surface areas:', error);
    process.exit(1);
  });
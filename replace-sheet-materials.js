/**
 * Replace existing sheet materials with authentic catalog specifications
 * Based on provided sheet metal catalog images
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgTable, text, serial, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';
import { eq, or, like } from 'drizzle-orm';
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
  categoryId: serial("category_id"),
  category: text("category"),
  width: decimal("width", { precision: 10, scale: 2 }),
  length: decimal("length", { precision: 10, scale: 2 }),
  thickness: decimal("thickness", { precision: 10, scale: 2 }),
  weightPerMeter: decimal("weight_per_meter", { precision: 10, scale: 3 }),
  grade: text("grade"),
  standard: text("standard"),
  lengthOptions: text("length_options"),
  supplier: text("supplier"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

const db = drizzle({ client: pool, schema: { materials } });

async function replaceSheetMaterials() {
  console.log('🗑️  Removing existing sheet materials...');
  
  // Remove existing sheet materials that don't match new specifications
  await db.delete(materials).where(
    or(
      like(materials.code, 'EGS%'),
      like(materials.code, 'GSH%'),
      like(materials.code, 'PL%'),
      like(materials.code, 'PLCQ%'),
      like(materials.code, 'PLWR%'),
      like(materials.code, 'SH%'),
      like(materials.category, '%Sheet%'),
      like(materials.category, '%Plate%')
    )
  );
  
  console.log('📊 Adding authentic sheet material specifications...');
  
  // Mild Steel Plates AS1594 & AS3678 - G250 & G300
  const mildSteelPlates = [
    { code: 'SPL003', name: 'Mild Steel Plate 3mm', thickness: 3, weight: 23.60, sizes: ['2400x1200', '3000x1520', '3600x1520', '3600x1800'] },
    { code: 'SPL004', name: 'Mild Steel Plate 4mm', thickness: 4, weight: 31.40, sizes: ['2400x1200', '3000x1520', '3600x1520', '3600x1800'] },
    { code: 'SPL005', name: 'Mild Steel Plate 5mm', thickness: 5, weight: 39.30, sizes: ['2400x1200', '3000x1520', '3600x1520', '3600x1800'] },
    { code: 'SPL006', name: 'Mild Steel Plate 6mm', thickness: 6, weight: 47.10, sizes: ['2400x1200', '3000x1520', '3600x1520'] },
    { code: 'SPL008', name: 'Mild Steel Plate 8mm', thickness: 8, weight: 62.80, sizes: ['2400x1200', '3000x1520', '3600x1520'] },
    { code: 'SPL010', name: 'Mild Steel Plate 10mm', thickness: 10, weight: 78.50, sizes: ['2400x1200', '3000x1520', '3600x1520'] },
    { code: 'SPL012', name: 'Mild Steel Plate 12mm', thickness: 12, weight: 94.20, sizes: ['2400x1200', '3600x1520'] },
    { code: 'SPL016', name: 'Mild Steel Plate 16mm', thickness: 16, weight: 125.60, sizes: ['2400x1200', '3600x1520'] },
    { code: 'SPL020', name: 'Mild Steel Plate 20mm', thickness: 20, weight: 157.00, sizes: ['2400x1200', '3000x1520', '3600x1520'] },
    { code: 'SPL025', name: 'Mild Steel Plate 25mm', thickness: 25, weight: 196.30, sizes: ['2400x1200', '3600x1520'] },
    { code: 'SPL032', name: 'Mild Steel Plate 32mm', thickness: 32, weight: 251.20, sizes: ['2400x1200', '3600x1520'] },
    { code: 'SPL040', name: 'Mild Steel Plate 40mm', thickness: 40, weight: 314.00, sizes: ['2400x1200'] },
    { code: 'SPL050', name: 'Mild Steel Plate 50mm', thickness: 50, weight: 392.50, sizes: ['2400x1200'] }
  ];

  // Mild Steel Chequer Plate AS1594 - HA1 or Equivalent
  const chequerPlates = [
    { code: 'SPLF03', name: 'Mild Steel Chequer Plate 3mm', thickness: 3, weight: 25.65, sizes: ['2400x1220', '3600x1520'] },
    { code: 'SPLF05', name: 'Mild Steel Chequer Plate 5mm', thickness: 5, weight: 41.35, sizes: ['2400x1220', '3600x1520'] },
    { code: 'SPLF06', name: 'Mild Steel Chequer Plate 6mm', thickness: 6, weight: 49.20, sizes: ['2400x1220', '3600x1520'] },
    { code: 'SPLF08', name: 'Mild Steel Chequer Plate 8mm', thickness: 8, weight: 64.90, sizes: ['2400x1220', '3600x1520'] },
    { code: 'SPLF10', name: 'Mild Steel Chequer Plate 10mm', thickness: 10, weight: 80.60, sizes: ['2400x1220', '3600x1520'] }
  ];

  // Weather Resistant Plate AS1594 - HW350 or Equivalent
  const weatherResistantPlates = [
    { code: 'WRP25', name: 'Weather Resistant Plate 2.5mm', thickness: 2.5, weight: 19.63, sizes: ['2500x1250'] },
    { code: 'WRP3', name: 'Weather Resistant Plate 3mm', thickness: 3, weight: 23.60, sizes: ['2500x1250'] },
    { code: 'WRP4', name: 'Weather Resistant Plate 4mm', thickness: 4, weight: 31.40, sizes: ['2500x1250'] },
    { code: 'WRP5', name: 'Weather Resistant Plate 5mm', thickness: 5, weight: 39.30, sizes: ['2500x1250'] },
    { code: 'WRP6', name: 'Weather Resistant Plate 6mm', thickness: 6, weight: 47.10, sizes: ['2500x1250'] }
  ];

  // Cold Rolled Sheet JIS G3141 SPCC SD or Equivalent
  const coldRolledSheets = [
    { code: 'SHCR10', name: 'Cold Rolled Sheet 1.0mm', thickness: 1.0, weight: 7.85, sizes: ['2438x1219'] },
    { code: 'SHCR12', name: 'Cold Rolled Sheet 1.2mm', thickness: 1.2, weight: 9.42, sizes: ['2438x1219'] },
    { code: 'SHCR16', name: 'Cold Rolled Sheet 1.6mm', thickness: 1.6, weight: 12.56, sizes: ['2438x1219'] },
    { code: 'SHCR20', name: 'Cold Rolled Sheet 2.0mm', thickness: 2.0, weight: 15.70, sizes: ['2438x1219'] },
    { code: 'SHCR25', name: 'Cold Rolled Sheet 2.5mm', thickness: 2.5, weight: 19.63, sizes: ['2438x1219'] },
    { code: 'SHCR30', name: 'Cold Rolled Sheet 3.0mm', thickness: 3.0, weight: 23.55, sizes: ['2438x1219'] }
  ];

  // Electrogalvanised Sheet JIS G3313 SECC-P or Equivalent
  const electrogalvanisedSheets = [
    { code: 'SHEG08', name: 'Electrogalvanised Sheet 0.8mm', thickness: 0.8, weight: 6.28, sizes: ['2438x1219'] },
    { code: 'SHEG10', name: 'Electrogalvanised Sheet 1.0mm', thickness: 1.0, weight: 7.85, sizes: ['2438x1219'] },
    { code: 'SHEG12', name: 'Electrogalvanised Sheet 1.2mm', thickness: 1.2, weight: 9.42, sizes: ['2438x1219'] },
    { code: 'SHEG16', name: 'Electrogalvanised Sheet 1.6mm', thickness: 1.6, weight: 12.56, sizes: ['2438x1219'] },
    { code: 'SHEG19', name: 'Electrogalvanised Sheet 1.9mm', thickness: 1.9, weight: 14.92, sizes: ['2438x1219'] },
    { code: 'SHEG25', name: 'Electrogalvanised Sheet 2.5mm', thickness: 2.5, weight: 19.63, sizes: ['2438x1219'] },
    { code: 'SHEG30', name: 'Electrogalvanised Sheet 3.0mm', thickness: 3.0, weight: 23.55, sizes: ['2438x1219'] }
  ];

  // Galvanized Sheet JIS G3302 SGCC S250 Z275 or Equivalent
  const galvanizedSheets = [
    { code: 'SHG055', name: 'Galvanized Sheet 0.55mm', thickness: 0.55, weight: 4.71, sizes: ['2438x1219'] },
    { code: 'SHG075', name: 'Galvanized Sheet 0.75mm', thickness: 0.75, weight: 6.28, sizes: ['2438x1219'] },
    { code: 'SHG095', name: 'Galvanized Sheet 0.95mm', thickness: 0.95, weight: 7.85, sizes: ['2438x1219'] },
    { code: 'SHG115', name: 'Galvanized Sheet 1.15mm', thickness: 1.15, weight: 9.42, sizes: ['2438x1219'] },
    { code: 'SHG155', name: 'Galvanized Sheet 1.55mm', thickness: 1.55, weight: 12.56, sizes: ['2438x1219'] },
    { code: 'SHG200', name: 'Galvanized Sheet 2.0mm', thickness: 2.0, weight: 15.66, sizes: ['2438x1219'] },
    { code: 'SHG250', name: 'Galvanized Sheet 2.5mm', thickness: 2.5, weight: 19.85, sizes: ['2438x1219'] },
    { code: 'SHG300', name: 'Galvanized Sheet 3.0mm', thickness: 3.0, weight: 23.89, sizes: ['2438x1219'] }
  ];

  // Helper function to create material entries for multiple sizes
  function createMaterialVariants(materialData, category, standard = null) {
    const variants = [];
    const primarySize = materialData.sizes[0].split('x');
    const width = parseFloat(primarySize[0]);
    const length = parseFloat(primarySize[1]);
    
    variants.push({
      code: materialData.code,
      name: materialData.name,
      category: category,
      width: width.toString(),
      length: length.toString(),
      thickness: materialData.thickness.toString(),
      weightPerMeter: materialData.weight.toString(),
      grade: 'G250',
      standard: standard,
      lengthOptions: materialData.sizes.join(', '),
      supplier: 'Lateral Engineering',
      isActive: true
    });
    
    return variants;
  }

  // Insert all material categories
  const allMaterials = [];

  // Add Mild Steel Plates
  for (const plate of mildSteelPlates) {
    allMaterials.push(...createMaterialVariants(plate, 'Mild Steel Plates', 'AS1594 & AS3678'));
  }

  // Add Chequer Plates
  for (const plate of chequerPlates) {
    allMaterials.push(...createMaterialVariants(plate, 'Mild Steel Chequer Plates', 'AS1594 - HA1'));
  }

  // Add Weather Resistant Plates
  for (const plate of weatherResistantPlates) {
    allMaterials.push(...createMaterialVariants(plate, 'Weather Resistant Plates', 'AS1594 - HW350'));
  }

  // Add Cold Rolled Sheets
  for (const sheet of coldRolledSheets) {
    allMaterials.push(...createMaterialVariants(sheet, 'Cold Rolled Sheets', 'JIS G3141 SPCC SD'));
  }

  // Add Electrogalvanised Sheets
  for (const sheet of electrogalvanisedSheets) {
    allMaterials.push(...createMaterialVariants(sheet, 'Electrogalvanised Sheets', 'JIS G3313 SECC-P'));
  }

  // Add Galvanized Sheets
  for (const sheet of galvanizedSheets) {
    allMaterials.push(...createMaterialVariants(sheet, 'Galvanized Sheets', 'JIS G3302 SGCC S250 Z275'));
  }

  // Insert all materials
  const result = await db.insert(materials).values(allMaterials).returning();
  
  console.log(`✅ Successfully added ${result.length} authentic sheet materials`);
  console.log('📋 Summary:');
  console.log(`   • ${mildSteelPlates.length} Mild Steel Plates (SPL series)`);
  console.log(`   • ${chequerPlates.length} Mild Steel Chequer Plates (SPLF series)`);
  console.log(`   • ${weatherResistantPlates.length} Weather Resistant Plates (WRP series)`);
  console.log(`   • ${coldRolledSheets.length} Cold Rolled Sheets (SHCR series)`);
  console.log(`   • ${electrogalvanisedSheets.length} Electrogalvanised Sheets (SHEG series)`);
  console.log(`   • ${galvanizedSheets.length} Galvanized Sheets (SHG series)`);
  
  return result;
}

// Execute the replacement
replaceSheetMaterials()
  .then(() => {
    console.log('🎉 Sheet material replacement completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error replacing sheet materials:', error);
    process.exit(1);
  });
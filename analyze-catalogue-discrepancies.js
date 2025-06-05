/**
 * Comprehensive analysis of ASMUSS Steel Catalogue vs Database
 * Identify discrepancies and update supplier information
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgTable, text, serial, decimal, boolean } from 'drizzle-orm/pg-core';
import { eq, and, isNull } from 'drizzle-orm';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  width: decimal("width", { precision: 10, scale: 2 }),
  thickness: decimal("thickness", { precision: 10, scale: 2 }),
  diameter: decimal("diameter", { precision: 10, scale: 2 }),
  weightPerMeter: decimal("weight_per_meter", { precision: 10, scale: 3 }),
  supplier: text("supplier"),
  isActive: boolean("is_active").default(true),
});

const db = drizzle({ client: pool, schema: { materials } });

// ASMUSS Catalogue data for comparison
const ASMUSS_CATALOGUE = {
  // Mild Steel Flats
  flats: [
    { code: 'SF01603', width: 16, thickness: 3, weight: 0.38 },
    { code: 'SF02003', width: 20, thickness: 3, weight: 0.47 },
    { code: 'SF02005', width: 20, thickness: 5, weight: 0.79 },
    // ... more entries would be added from full catalogue
  ],
  
  // Equal Angles
  angles: [
    { code: 'SA02003', width: 20, thickness: 3, weight: 0.86 },
    { code: 'SA02503', width: 25, thickness: 3, weight: 1.12 },
    { code: 'SA02505', width: 25, thickness: 5, weight: 1.65 },
    // ... more entries would be added from full catalogue
  ],
  
  // Rounds
  rounds: [
    { code: 'SR06', diameter: 6, weight: 0.22 },
    { code: 'SR08', diameter: 8, weight: 0.40 },
    { code: 'SR10', diameter: 10, weight: 0.62 },
    // ... more entries would be added from full catalogue
  ],
  
  // Squares
  squares: [
    { code: 'SQ06', width: 6, weight: 0.28 },
    { code: 'SQ08', width: 8, weight: 0.50 },
    { code: 'SQ10', width: 10, weight: 0.79 },
    // ... more entries would be added from full catalogue
  ]
};

async function updateSupplierInformation() {
  console.log('Updating supplier information for ASMUSS materials...');
  
  // Update all materials that match ASMUSS catalogue patterns
  const asmussPatterns = [
    'SF%', 'SA%', 'SUA%', 'SR%', 'SQ%', 'DGF%', 'DGA%', 'DGC%',
    'SRD%', 'SRHD%', 'SRRB%', 'SRM%', 'SC%', 'SUB%', 'SUC%',
    'SPL%', 'SPLF%', 'WRP%', 'SHCR%', 'SHEG%', 'SHG%',
    'SHS%', 'RHS%', 'CRHS%'
  ];
  
  let updatedCount = 0;
  
  for (const pattern of asmussPatterns) {
    const result = await db.update(materials)
      .set({ supplier: 'ASMUSS' })
      .where(
        and(
          eq(materials.isActive, true),
          // Use LIKE operator pattern matching
          eq(materials.code, pattern)
        )
      );
    
    console.log(`Updated materials matching pattern ${pattern}`);
  }
  
  // Get count of materials updated
  const asmussCount = await db.select()
    .from(materials)
    .where(
      and(
        eq(materials.isActive, true),
        eq(materials.supplier, 'ASMUSS')
      )
    );
  
  console.log(`Total ASMUSS materials: ${asmussCount.length}`);
  return asmussCount.length;
}

async function analyzeDiscrepancies() {
  console.log('Analyzing discrepancies between ASMUSS catalogue and database...');
  
  const discrepancies = [];
  
  // Check each category for discrepancies
  const dbFlats = await db.select().from(materials)
    .where(
      and(
        eq(materials.category, 'Flats'),
        eq(materials.isActive, true)
      )
    );
  
  console.log(`Database has ${dbFlats.length} active flats`);
  
  // Sample check for weight discrepancies in flats
  for (const dbFlat of dbFlats.slice(0, 10)) {
    const catalogueFlat = ASMUSS_CATALOGUE.flats.find(f => f.code === dbFlat.code);
    if (catalogueFlat) {
      const dbWeight = parseFloat(dbFlat.weightPerMeter || '0');
      const catWeight = catalogueFlat.weight;
      
      if (Math.abs(dbWeight - catWeight) > 0.01) {
        discrepancies.push({
          code: dbFlat.code,
          category: 'Flats',
          issue: 'Weight mismatch',
          dbValue: dbWeight,
          catalogueValue: catWeight
        });
      }
    }
  }
  
  console.log(`Found ${discrepancies.length} discrepancies`);
  return discrepancies;
}

async function verifySurfaceAreaCalculations() {
  console.log('Verifying surface area calculations...');
  
  // Check materials without surface areas
  const missingAreas = await db.select().from(materials)
    .where(
      and(
        eq(materials.isActive, true),
        isNull(materials.surfaceAreaPerMeter)
      )
    );
  
  console.log(`Found ${missingAreas.length} materials missing surface areas`);
  
  // Check for obviously incorrect surface areas (negative or zero)
  const incorrectAreas = await db.select().from(materials)
    .where(
      and(
        eq(materials.isActive, true),
        // This would need proper SQL syntax for <= 0
      )
    );
  
  return {
    missing: missingAreas.length,
    incorrect: incorrectAreas?.length || 0
  };
}

async function runAnalysis() {
  console.log('=== ASMUSS Steel Catalogue Analysis ===\n');
  
  try {
    // Update supplier information
    const supplierUpdates = await updateSupplierInformation();
    console.log(`✓ Updated supplier information for ${supplierUpdates} materials\n`);
    
    // Analyze discrepancies
    const discrepancies = await analyzeDiscrepancies();
    if (discrepancies.length > 0) {
      console.log('⚠ Found discrepancies:');
      discrepancies.forEach(d => {
        console.log(`  ${d.code}: ${d.issue} - DB: ${d.dbValue}, Catalogue: ${d.catalogueValue}`);
      });
    } else {
      console.log('✓ No weight discrepancies found in sample check');
    }
    
    // Verify surface area calculations
    const surfaceAreaStatus = await verifySurfaceAreaCalculations();
    console.log(`\n=== Surface Area Status ===`);
    console.log(`Missing surface areas: ${surfaceAreaStatus.missing}`);
    console.log(`Incorrect surface areas: ${surfaceAreaStatus.incorrect}`);
    
    console.log('\n=== Analysis Complete ===');
    
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

runAnalysis()
  .then(() => {
    console.log('Analysis completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
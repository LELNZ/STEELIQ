/**
 * Complete surface area calculations for remaining materials
 * DHS Purlins, Reinforcing Mesh, and Square bars
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgTable, text, serial, decimal, boolean } from 'drizzle-orm/pg-core';
import { eq, isNull, and } from 'drizzle-orm';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  width: decimal("width", { precision: 10, scale: 2 }),
  depth: decimal("depth", { precision: 10, scale: 2 }),
  thickness: decimal("thickness", { precision: 10, scale: 2 }),
  diameter: decimal("diameter", { precision: 10, scale: 2 }),
  surfaceAreaPerMeter: decimal("surface_area_per_meter", { precision: 10, scale: 3 }),
  isActive: boolean("is_active").default(true),
});

const db = drizzle({ client: pool, schema: { materials } });

/**
 * Calculate DHS Purlin surface area (C-shaped channel)
 * Approximation: 2 × width + depth (external surfaces only)
 */
function calculateDHSPurlinArea(widthMm, depthMm) {
  if (!widthMm || !depthMm) return 0;
  
  // DHS Purlins are C-shaped channels
  // External surfaces: 2 flanges + web
  const flangePerimeter = 2 * parseFloat(widthMm);
  const webPerimeter = parseFloat(depthMm);
  const totalPerimeter = flangePerimeter + webPerimeter;
  
  return totalPerimeter / 1000; // Convert to m²/m
}

/**
 * Calculate Reinforcing Mesh surface area
 * Based on mesh grid pattern with wire spacing
 */
function calculateMeshArea(spacingMm, wireDiameter) {
  if (!spacingMm || !wireDiameter) return 0;
  
  // For mesh: wire surface area per square meter of mesh
  // Approximate as wire circumference per unit area
  const spacing = parseFloat(spacingMm);
  const diameter = parseFloat(wireDiameter);
  
  // Wires per meter in each direction
  const wiresPerMeter = 1000 / spacing;
  // Total wire length per square meter (horizontal + vertical)
  const totalWireLength = 2 * wiresPerMeter * 1000; // mm per m²
  // Wire circumference per mm length
  const wireCircumference = Math.PI * diameter; // mm
  // Total surface area per square meter of mesh
  const surfaceArea = (totalWireLength * wireCircumference) / 1000000; // m²/m²
  
  return surfaceArea;
}

/**
 * Calculate Square Bar surface area
 * Formula: 4 × width (perimeter) / 1000
 */
function calculateSquareBarArea(widthMm) {
  if (!widthMm) return 0;
  
  // Square perimeter = 4 × width
  const perimeter = 4 * parseFloat(widthMm);
  return perimeter / 1000; // Convert to m²/m
}

async function completeMissingSurfaceAreas() {
  console.log('Calculating missing surface areas...');
  
  // Get materials without surface area
  const missingMaterials = await db.select().from(materials).where(
    and(
      isNull(materials.surfaceAreaPerMeter),
      eq(materials.isActive, true)
    )
  );
  
  console.log(`Found ${missingMaterials.length} materials without surface areas`);
  
  let updatedCount = 0;
  
  for (const material of missingMaterials) {
    const { id, code, name, category, width, depth, thickness, diameter } = material;
    let surfaceArea = 0;
    let calculationMethod = '';
    
    if (category === 'DHS Purlins') {
      // DHS Purlins need depth calculation - estimate from naming convention
      const depthFromCode = code.match(/DHS(\d+)/)?.[1];
      const estimatedDepth = depthFromCode ? parseFloat(depthFromCode) : 150;
      
      surfaceArea = calculateDHSPurlinArea(width, estimatedDepth);
      calculationMethod = `DHS Purlin: 2×${width} + ${estimatedDepth}`;
      
    } else if (category === 'Reinforcing Mesh') {
      // Extract spacing from name (e.g., "25x25x4mm" -> spacing=25, diameter=4)
      const meshMatch = name.match(/(\d+)x\d+x([\d.]+)mm/);
      if (meshMatch) {
        const spacing = parseFloat(meshMatch[1]);
        const wireDiameter = parseFloat(meshMatch[2]);
        surfaceArea = calculateMeshArea(spacing, wireDiameter);
        calculationMethod = `Mesh: ${spacing}mm spacing, ${wireDiameter}mm wire`;
      }
      
    } else if (category === 'Squares') {
      surfaceArea = calculateSquareBarArea(width);
      calculationMethod = `Square: 4×${width}`;
    }
    
    if (surfaceArea > 0) {
      await db.update(materials)
        .set({ surfaceAreaPerMeter: surfaceArea.toFixed(3) })
        .where(eq(materials.id, id));
      
      updatedCount++;
      console.log(`✓ ${code}: ${calculationMethod} = ${surfaceArea.toFixed(3)} m²/m`);
    } else {
      console.log(`⚠ ${code}: Unable to calculate (${category})`);
    }
  }
  
  console.log(`\nCompleted: ${updatedCount} materials updated with surface areas`);
  return updatedCount;
}

completeMissingSurfaceAreas()
  .then((count) => {
    console.log(`Successfully completed ${count} surface area calculations`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
// Update UB and UC surface areas using unified calculator logic
import { Pool } from '@neondatabase/serverless';
import ws from "ws";

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Surface area calculation for Universal sections (UB/UC)
function calculateUniversalSectionArea(width, depth, webThickness, flangeThickness) {
  // External surfaces: 2 flanges (no external web)
  const externalFlanges = 2 * width; // mm
  
  // Internal surfaces: web depth + separated flange portions
  const internalWebDepth = depth - (2 * flangeThickness);
  const internalWeb = 2 * internalWebDepth; // mm (both web sides)
  
  // Each internal flange portion excludes web thickness
  const internalFlangePortionWidth = (width - webThickness) / 2; // mm per portion
  const totalInternalFlanges = 4 * internalFlangePortionWidth; // 4 portions
  
  const external = externalFlanges / 1000; // Convert to m²/m
  const internal = (internalWeb + totalInternalFlanges) / 1000; // Convert to m²/m
  const total = external + internal;
  
  return {
    external: external,
    internal: internal,
    total: total
  };
}

async function updateUniversalSectionSurfaceAreas() {
  try {
    console.log('Fetching UB and UC materials...');
    
    // Get all UB and UC materials
    const query = `
      SELECT id, code, name, category, width, depth, web_tw, flange_tf, surface_area_per_meter 
      FROM materials 
      WHERE (category ILIKE '%universal beam%' OR category ILIKE '%universal column%')
      AND width IS NOT NULL 
      AND depth IS NOT NULL 
      AND web_tw IS NOT NULL 
      AND flange_tf IS NOT NULL
      ORDER BY category, code
    `;
    
    const result = await pool.query(query);
    const materials = result.rows;
    
    console.log(`Found ${materials.length} UB/UC materials to update`);
    
    let updatedCount = 0;
    
    for (const material of materials) {
      const width = parseFloat(material.width);
      const depth = parseFloat(material.depth);
      const webThickness = parseFloat(material.web_tw);
      const flangeThickness = parseFloat(material.flange_tf);
      
      // Calculate new surface area
      const calculation = calculateUniversalSectionArea(width, depth, webThickness, flangeThickness);
      const newSurfaceArea = parseFloat(calculation.total.toFixed(4));
      const currentSurfaceArea = parseFloat(material.surface_area_per_meter || 0);
      
      console.log(`\n${material.code} (${material.name}):`);
      console.log(`  Dimensions: ${width}mm x ${depth}mm, Web: ${webThickness}mm, Flange: ${flangeThickness}mm`);
      console.log(`  External: ${calculation.external.toFixed(3)} m²/m`);
      console.log(`  Internal: ${calculation.internal.toFixed(3)} m²/m`);
      console.log(`  Current: ${currentSurfaceArea.toFixed(3)} m²/m`);
      console.log(`  New Total: ${newSurfaceArea.toFixed(3)} m²/m`);
      console.log(`  Change: ${(newSurfaceArea - currentSurfaceArea).toFixed(3)} m²/m`);
      
      // Update the database
      const updateQuery = `
        UPDATE materials 
        SET surface_area_per_meter = $1 
        WHERE id = $2
      `;
      
      await pool.query(updateQuery, [newSurfaceArea, material.id]);
      updatedCount++;
    }
    
    console.log(`\nSuccessfully updated ${updatedCount} UB/UC materials with calculated surface areas`);
    
  } catch (error) {
    console.error('Error updating UB/UC surface areas:', error);
  } finally {
    await pool.end();
  }
}

// Run the update
updateUniversalSectionSurfaceAreas();
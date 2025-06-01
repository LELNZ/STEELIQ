// Update surface area calculations for all channel materials
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function calculateChannelSurfaceArea(width, depth, webThickness, flangeThickness) {
  // Convert mm to m for calculations
  const w = width / 1000;
  const d = depth / 1000;
  const tw = webThickness / 1000;
  const tf = flangeThickness / 1000;
  
  // External surfaces (per meter length)
  const externalFlangeTop = w * 1; // m²
  const externalFlangeBottom = w * 1; // m²
  const externalWeb = d * 1; // m²
  
  // Internal surfaces (per meter length)
  const internalFlangeWidth = w - tw;
  const internalWebDepth = d - (2 * tf);
  
  const internalFlangeTop = internalFlangeWidth * 1; // m²
  const internalFlangeBottom = internalFlangeWidth * 1; // m²
  const internalWeb = internalWebDepth * 1; // m²
  
  const totalSurfaceArea = externalFlangeTop + externalFlangeBottom + externalWeb + 
                          internalFlangeTop + internalFlangeBottom + internalWeb;
  
  return parseFloat(totalSurfaceArea.toFixed(4));
}

async function updateChannelSurfaceAreas() {
  try {
    // Get all channel materials with dimensions
    const { rows } = await pool.query(`
      SELECT id, code, name, category, width, depth, flange_tf, web_tw
      FROM materials 
      WHERE category ILIKE '%channel%' 
      AND width IS NOT NULL 
      AND depth IS NOT NULL 
      AND flange_tf IS NOT NULL 
      AND web_tw IS NOT NULL
    `);
    
    console.log(`Found ${rows.length} channel materials to update`);
    
    for (const material of rows) {
      const surfaceArea = calculateChannelSurfaceArea(
        parseFloat(material.width),
        parseFloat(material.depth),
        parseFloat(material.web_tw),
        parseFloat(material.flange_tf)
      );
      
      await pool.query(`
        UPDATE materials 
        SET surface_area_per_meter = $1 
        WHERE id = $2
      `, [surfaceArea, material.id]);
      
      console.log(`Updated ${material.code}: ${surfaceArea} m²/m`);
    }
    
    console.log('Surface area update complete');
  } catch (error) {
    console.error('Error updating surface areas:', error);
  } finally {
    await pool.end();
  }
}

updateChannelSurfaceAreas();
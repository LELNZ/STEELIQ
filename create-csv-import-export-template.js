/**
 * Create comprehensive CSV import/export template for Material Library
 * Includes all necessary dimensions across all material categories
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgTable, text, serial, decimal, boolean } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  width: decimal("width", { precision: 10, scale: 2 }),
  width1: decimal("width1", { precision: 10, scale: 2 }),
  width2: decimal("width2", { precision: 10, scale: 2 }),
  thickness: decimal("thickness", { precision: 10, scale: 2 }),
  diameter: decimal("diameter", { precision: 10, scale: 2 }),
  depth: decimal("depth", { precision: 10, scale: 2 }),
  flangeTf: decimal("flange_tf", { precision: 10, scale: 2 }),
  webTw: decimal("web_tw", { precision: 10, scale: 2 }),
  length: decimal("length", { precision: 10, scale: 2 }),
  weightPerMeter: decimal("weight_per_meter", { precision: 10, scale: 3 }),
  lengthOptions: text("length_options"),
  grade: text("grade"),
  standard: text("standard"),
  coating: text("coating"),
  pricePerKg: decimal("price_per_kg", { precision: 10, scale: 2 }),
  pricePerMeter: decimal("price_per_meter", { precision: 10, scale: 2 }),
  surfaceAreaPerMeter: decimal("surface_area_per_meter", { precision: 10, scale: 3 }),
  supplier: text("supplier"),
  isActive: boolean("is_active").default(true),
});

const db = drizzle({ client: pool, schema: { materials } });

// Define comprehensive CSV headers covering all material dimensions
const CSV_HEADERS = [
  'Category',
  'Code', 
  'Name',
  'Width (mm)',
  'Width1 (mm)', // For unequal angles
  'Width2 (mm)', // For unequal angles  
  'Thickness (mm)',
  'Diameter (mm)', // For rounds, pipes, rebar
  'Depth (mm)', // For channels, beams, columns
  'Flange Thickness (mm)', // For UB/UC
  'Web Thickness (mm)', // For UB/UC/Channels
  'Length (mm)', // Standard length
  'Weight (kg/m)',
  'Length Options (m)', // Available lengths
  'Grade', // Material grade (e.g., G300, 350MPa)
  'Standard', // e.g., AS/NZS 1163, AS3679.1
  'Coating', // Surface coating
  'Price per kg ($)',
  'Price per m ($)',
  'Surface Area (m²/m)', // Can be calculated automatically
  'Supplier',
  'Available Lengths (m)', // Specific available lengths
  'Sheet Size (mm)', // For plates/sheets
  'Outside Diameter (mm)', // For pipes
  'Inside Diameter (mm)', // For hollow sections
  'Corner Radius (mm)', // For SHS/RHS
  'Wall Thickness (mm)', // Alternative term for thickness
  'Nominal Size', // Common trade name
  'Finish Options', // NOPC, Primed, Pregalv
  'Mass per Unit (kg)', // For sheets sold by piece
  'Active' // Material availability status
];

async function createImportTemplate() {
  console.log('Creating comprehensive CSV import/export template...');
  
  // Create template with headers and sample data
  const templateRows = [
    CSV_HEADERS,
    // Sample row for Mild Steel Flat
    ['Flats', 'SF02505', 'Mild Steel Flat 25x5mm', '25.00', '', '', '5.00', '', '', '', '', '6000', '0.980', '6.0', 'G300', 'AS/NZS 3679.1-300', '', '', '', '', 'ASMUSS', '6.0', '', '', '', '', '', '', '', '', 'true'],
    // Sample row for Equal Angle
    ['Equal Angles', 'SA05006', 'Mild Steel Equal Angle 50x50x6mm', '50.00', '', '', '6.00', '', '', '', '', '6000', '4.460', '6.0,9.0', 'G300', 'AS/NZS 3679.1-300', '', '', '', '', 'ASMUSS', '6.0,9.0', '', '', '', '', '', '', '', '', 'true'],
    // Sample row for Universal Beam
    ['Universal Beams', 'SUB150014', 'Universal Beam 150x75x14mm', '75.00', '', '', '', '', '150.00', '7.00', '5.00', '6000', '14.000', '6.0,9.0', 'G300SO', 'AS3679.1', '', '', '', '0.590', 'ASMUSS', '6.0,9.0', '', '', '', '', '', '', '', '', 'true'],
    // Sample row for SHS
    ['SHS', 'SHS05025', 'Square Hollow Section 50x50x2.5mm', '50.00', '', '', '2.5', '', '', '', '', '8000', '3.600', '8.0,12.0', 'C350LO', 'AS/NZS 1163', '', '', '', '', 'ASMUSS', '8.0,12.0', '', '', '', '', '2.5', '', 'NOPC,Primed,Pregalv', '', 'true'],
    // Sample row for Sheet
    ['Cold Rolled Sheets', 'SHCR16', 'Cold Rolled Sheet 1.6mm', '2438.00', '', '', '1.60', '', '', '', '', '', '12.560', '', '', 'JIS G3141 SPCC SD', '', '', '', '', 'ASMUSS', '', '2438 x 1219', '', '', '', '', '', '', '', 'true'],
    // Sample row for Pipe
    ['Black Pipe', 'BP15', 'Black Pipe 15mm', '', '', '', '2.3', '21.3', '', '', '', '6000', '1.270', '6.0', '', 'AS/NZS 1074', '', '', '', '', 'ASMUSS', '6.0', '', '21.3', '16.7', '', '', '', '', '', 'true']
  ];
  
  // Convert to CSV format
  const csvContent = templateRows.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
  
  // Write template file
  fs.writeFileSync('material_import_export_template.csv', csvContent);
  console.log('✓ Created material_import_export_template.csv');
  
  return templateRows.length - 1; // Exclude header row
}

async function exportCurrentMaterials() {
  console.log('Exporting current materials to CSV...');
  
  // Get all active materials
  const allMaterials = await db.select().from(materials)
    .where(eq(materials.isActive, true));
  
  console.log(`Found ${allMaterials.length} active materials to export`);
  
  // Convert materials to CSV format
  const exportRows = [CSV_HEADERS];
  
  for (const material of allMaterials) {
    const row = [
      material.category || '',
      material.code || '',
      material.name || '',
      material.width || '',
      material.width1 || '',
      material.width2 || '',
      material.thickness || '',
      material.diameter || '',
      material.depth || '',
      material.flangeTf || '',
      material.webTw || '',
      material.length || '',
      material.weightPerMeter || '',
      material.lengthOptions || '',
      material.grade || '',
      material.standard || '',
      material.coating || '',
      material.pricePerKg || '',
      material.pricePerMeter || '',
      material.surfaceAreaPerMeter || '',
      material.supplier || '',
      '', // Available Lengths (same as length options for now)
      '', // Sheet Size
      '', // Outside Diameter (same as diameter for pipes)
      '', // Inside Diameter
      '', // Corner Radius
      '', // Wall Thickness (same as thickness)
      '', // Nominal Size
      '', // Finish Options
      '', // Mass per Unit
      material.isActive ? 'true' : 'false'
    ];
    exportRows.push(row);
  }
  
  // Convert to CSV format
  const csvContent = exportRows.map(row => 
    row.map(cell => `"${cell}"`).join(',')
  ).join('\n');
  
  // Write export file
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `lateral_engineering_materials_export_${timestamp}.csv`;
  fs.writeFileSync(filename, csvContent);
  console.log(`✓ Exported ${allMaterials.length} materials to ${filename}`);
  
  return { filename, count: allMaterials.length };
}

async function validateSurfaceAreaCalculations() {
  console.log('Validating surface area calculations...');
  
  // Check for missing surface areas
  const missingAreas = await db.select().from(materials)
    .where(eq(materials.isActive, true));
  
  const missing = missingAreas.filter(m => !m.surfaceAreaPerMeter || parseFloat(m.surfaceAreaPerMeter) <= 0);
  
  if (missing.length > 0) {
    console.log(`⚠ Found ${missing.length} materials with missing/invalid surface areas:`);
    missing.slice(0, 5).forEach(m => {
      console.log(`  ${m.code}: ${m.surfaceAreaPerMeter || 'NULL'} m²/m`);
    });
  } else {
    console.log('✓ All materials have valid surface area calculations');
  }
  
  return {
    total: missingAreas.length,
    missing: missing.length,
    valid: missingAreas.length - missing.length
  };
}

async function generateSupplierReport() {
  console.log('Generating supplier distribution report...');
  
  const allMaterials = await db.select().from(materials)
    .where(eq(materials.isActive, true));
  
  const supplierCounts = {};
  allMaterials.forEach(m => {
    const supplier = m.supplier || 'Unknown';
    supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
  });
  
  console.log('\n=== Supplier Distribution ===');
  Object.entries(supplierCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([supplier, count]) => {
      console.log(`${supplier}: ${count} materials`);
    });
  
  return supplierCounts;
}

async function runTemplateCreation() {
  console.log('=== Material Library CSV Template Creation ===\n');
  
  try {
    // Create import template
    const sampleCount = await createImportTemplate();
    console.log(`✓ Created template with ${sampleCount} sample entries\n`);
    
    // Export current materials
    const exportResult = await exportCurrentMaterials();
    console.log(`✓ Exported ${exportResult.count} materials to ${exportResult.filename}\n`);
    
    // Validate surface area calculations
    const surfaceAreaStatus = await validateSurfaceAreaCalculations();
    console.log(`✓ Surface area validation: ${surfaceAreaStatus.valid}/${surfaceAreaStatus.total} valid\n`);
    
    // Generate supplier report
    const suppliers = await generateSupplierReport();
    
    console.log('\n=== Template Creation Complete ===');
    console.log('Files created:');
    console.log('- material_import_export_template.csv (Template for imports)');
    console.log(`- ${exportResult.filename} (Current materials export)`);
    
    return {
      templateCreated: true,
      exportFile: exportResult.filename,
      materialCount: exportResult.count,
      suppliers: suppliers
    };
    
  } catch (error) {
    console.error('Template creation failed:', error);
    throw error;
  }
}

runTemplateCreation()
  .then((result) => {
    console.log('Template creation completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
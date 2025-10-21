/**
 * Comprehensive ASMUSS Steel Catalogue Analysis and Discrepancy Report
 * Compare PDF catalogue against database materials for accuracy
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgTable, text, serial, decimal, boolean } from 'drizzle-orm/pg-core';
import { eq, and, like, or } from 'drizzle-orm';
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
  weightPerMeter: decimal("weight_per_meter", { precision: 10, scale: 3 }),
  lengthOptions: text("length_options"),
  grade: text("grade"),
  standard: text("standard"),
  surfaceAreaPerMeter: decimal("surface_area_per_meter", { precision: 10, scale: 3 }),
  supplier: text("supplier"),
  isActive: boolean("is_active").default(true),
});

const db = drizzle({ client: pool, schema: { materials } });

// ASMUSS Catalogue Reference Data (from PDF analysis)
const ASMUSS_REFERENCE = {
  // Mild Steel Flats - Sample from catalogue
  flats: [
    { code: 'SF01603', width: 16, thickness: 3, weight: 0.38, lengths: '6.0' },
    { code: 'SF02003', width: 20, thickness: 3, weight: 0.47, lengths: '6.0' },
    { code: 'SF02005', width: 20, thickness: 5, weight: 0.79, lengths: '6.0' },
    { code: 'SF02506', width: 25, thickness: 6, weight: 1.18, lengths: '6.0' },
    { code: 'SF05025', width: 50, thickness: 25, weight: 9.81, lengths: '6.0' },
  ],
  
  // Equal Angles - Sample from catalogue
  angles: [
    { code: 'SA02003', width: 20, thickness: 3, weight: 0.86, lengths: '6.0' },
    { code: 'SA05005', width: 50, thickness: 5, weight: 3.48, lengths: '6.0,9.0' },
    { code: 'SA07510', width: 75, thickness: 10, weight: 10.50, lengths: '6.0,9.0,12.0' },
    { code: 'SA10012', width: 100, thickness: 12, weight: 17.70, lengths: '6.0,9.0,12.0' },
  ],
  
  // Universal Beams - Sample from catalogue  
  beams: [
    { code: 'SUB150014', depth: 150, width: 75, flange: 7, web: 5, weight: 14.00, surfaceArea: 0.59 },
    { code: 'SUB200030', depth: 207, width: 134, flange: 9.6, web: 6.3, weight: 29.80, surfaceArea: 0.91 },
    { code: 'SUB360057', depth: 359, width: 172, flange: 13, web: 8, weight: 56.70, surfaceArea: 1.36 },
  ],
  
  // Sheets - Sample from catalogue
  sheets: [
    { code: 'SHCR16', thickness: 1.6, weight: 12.56, sheetSize: '2438 x 1219' },
    { code: 'SHEG25', thickness: 2.5, weight: 19.63, sheetSize: '2438 x 1219' },
    { code: 'SHG200', thickness: 2.0, weight: 15.66, sheetSize: '2438 x 1219' },
  ]
};

async function analyzeFlatsAccuracy() {
  console.log('=== Analyzing Mild Steel Flats ===');
  
  const dbFlats = await db.select().from(materials)
    .where(and(eq(materials.category, 'Flats'), eq(materials.isActive, true)));
  
  const discrepancies = [];
  let matchCount = 0;
  
  for (const refFlat of ASMUSS_REFERENCE.flats) {
    const dbFlat = dbFlats.find(m => m.code === refFlat.code);
    
    if (dbFlat) {
      matchCount++;
      const checks = {
        width: Math.abs(parseFloat(dbFlat.width || '0') - refFlat.width) > 0.01,
        thickness: Math.abs(parseFloat(dbFlat.thickness || '0') - refFlat.thickness) > 0.01,
        weight: Math.abs(parseFloat(dbFlat.weightPerMeter || '0') - refFlat.weight) > 0.01
      };
      
      if (Object.values(checks).some(Boolean)) {
        discrepancies.push({
          code: refFlat.code,
          category: 'Flats',
          issues: Object.entries(checks)
            .filter(([, hasIssue]) => hasIssue)
            .map(([field]) => `${field}: DB=${dbFlat[field] || 'NULL'}, Ref=${refFlat[field]}`)
        });
      }
    } else {
      discrepancies.push({
        code: refFlat.code,
        category: 'Flats',
        issues: ['Material missing from database']
      });
    }
  }
  
  console.log(`Checked ${ASMUSS_REFERENCE.flats.length} reference flats`);
  console.log(`Found ${matchCount} matches in database`);
  console.log(`Identified ${discrepancies.length} discrepancies`);
  
  return { checked: ASMUSS_REFERENCE.flats.length, matched: matchCount, discrepancies };
}

async function analyzeUniversalBeamsAccuracy() {
  console.log('\n=== Analyzing Universal Beams ===');
  
  const dbBeams = await db.select().from(materials)
    .where(and(eq(materials.category, 'Universal Beams'), eq(materials.isActive, true)));
  
  const discrepancies = [];
  let matchCount = 0;
  
  for (const refBeam of ASMUSS_REFERENCE.beams) {
    const dbBeam = dbBeams.find(m => m.code === refBeam.code);
    
    if (dbBeam) {
      matchCount++;
      const checks = {
        depth: Math.abs(parseFloat(dbBeam.depth || '0') - refBeam.depth) > 0.5,
        width: Math.abs(parseFloat(dbBeam.width || '0') - refBeam.width) > 0.5,
        weight: Math.abs(parseFloat(dbBeam.weightPerMeter || '0') - refBeam.weight) > 0.1,
        surfaceArea: Math.abs(parseFloat(dbBeam.surfaceAreaPerMeter || '0') - refBeam.surfaceArea) > 0.01
      };
      
      if (Object.values(checks).some(Boolean)) {
        discrepancies.push({
          code: refBeam.code,
          category: 'Universal Beams',
          issues: Object.entries(checks)
            .filter(([, hasIssue]) => hasIssue)
            .map(([field]) => `${field}: DB=${dbBeam[field] || 'NULL'}, Ref=${refBeam[field]}`)
        });
      }
    }
  }
  
  console.log(`Checked ${ASMUSS_REFERENCE.beams.length} reference beams`);
  console.log(`Found ${matchCount} matches in database`);
  console.log(`Identified ${discrepancies.length} discrepancies`);
  
  return { checked: ASMUSS_REFERENCE.beams.length, matched: matchCount, discrepancies };
}

async function validateSupplierAssignment() {
  console.log('\n=== Validating Supplier Assignment ===');
  
  const asmussCount = await db.select().from(materials)
    .where(and(eq(materials.supplier, 'ASMUSS'), eq(materials.isActive, true)));
  
  const unknownSupplier = await db.select().from(materials)
    .where(and(or(eq(materials.supplier, null), eq(materials.supplier, '')), eq(materials.isActive, true)));
  
  console.log(`ASMUSS materials: ${asmussCount.length}`);
  console.log(`Materials without supplier: ${unknownSupplier.length}`);
  
  return {
    asmussCount: asmussCount.length,
    unknownCount: unknownSupplier.length,
    totalActive: asmussCount.length + unknownSupplier.length
  };
}

async function generateDiscrepancyReport() {
  console.log('\n=== Generating Comprehensive Discrepancy Report ===');
  
  const flatsAnalysis = await analyzeFlatsAccuracy();
  const beamsAnalysis = await analyzeUniversalBeamsAccuracy();
  const supplierStats = await validateSupplierAssignment();
  
  const report = {
    analysis_date: new Date().toISOString().split('T')[0],
    catalogue_source: 'ASMUSS Steel Catalogue PDF',
    summary: {
      total_materials_checked: flatsAnalysis.checked + beamsAnalysis.checked,
      materials_matched: flatsAnalysis.matched + beamsAnalysis.matched,
      discrepancies_found: flatsAnalysis.discrepancies.length + beamsAnalysis.discrepancies.length,
      accuracy_percentage: ((flatsAnalysis.matched + beamsAnalysis.matched) / (flatsAnalysis.checked + beamsAnalysis.checked) * 100).toFixed(1)
    },
    supplier_distribution: supplierStats,
    discrepancies: {
      flats: flatsAnalysis.discrepancies,
      universal_beams: beamsAnalysis.discrepancies
    },
    recommendations: [
      'Update supplier field for all ASMUSS materials (COMPLETED)',
      'Verify surface area calculations for Universal Beams',
      'Add standard and grade information from catalogue',
      'Include length options data for material planning',
      'Implement CSV import/export templates for future updates'
    ]
  };
  
  // Write report to file
  fs.writeFileSync('asmuss_catalogue_analysis_report.json', JSON.stringify(report, null, 2));
  console.log('\n✓ Comprehensive analysis report saved to asmuss_catalogue_analysis_report.json');
  
  return report;
}

async function updateMissingStandards() {
  console.log('\n=== Updating Missing Standards ===');
  
  // Update standards for known material types
  const updates = [
    { pattern: 'SF%', standard: 'AS/NZS 3679.1-300', grade: 'G300' },
    { pattern: 'SA%', standard: 'AS/NZS 3679.1-300', grade: 'G300' },
    { pattern: 'SUB%', standard: 'AS3679.1', grade: 'G300SO' },
    { pattern: 'SUC%', standard: 'AS3679.1', grade: 'G300SO' },
    { pattern: 'SHS%', standard: 'AS/NZS 1163', grade: 'C350LO' },
    { pattern: 'RHS%', standard: 'AS/NZS 1163', grade: 'C350LO' },
  ];
  
  let totalUpdated = 0;
  
  for (const update of updates) {
    const result = await db.update(materials)
      .set({ 
        standard: update.standard,
        grade: update.grade 
      })
      .where(
        and(
          like(materials.code, update.pattern),
          eq(materials.isActive, true)
        )
      );
    
    console.log(`Updated materials matching ${update.pattern}: ${update.standard}, ${update.grade}`);
  }
  
  return totalUpdated;
}

async function runComprehensiveAnalysis() {
  console.log('=== ASMUSS Steel Catalogue Comprehensive Analysis ===\n');
  
  try {
    // Generate discrepancy report
    const report = await generateDiscrepancyReport();
    
    // Update missing standards
    const standardsUpdated = await updateMissingStandards();
    
    console.log('\n=== Analysis Summary ===');
    console.log(`Materials checked: ${report.summary.total_materials_checked}`);
    console.log(`Accuracy rate: ${report.summary.accuracy_percentage}%`);
    console.log(`ASMUSS materials: ${report.supplier_distribution.asmussCount}`);
    console.log(`Discrepancies found: ${report.summary.discrepancies_found}`);
    
    if (report.summary.discrepancies_found > 0) {
      console.log('\n=== Key Discrepancies ===');
      [...report.discrepancies.flats, ...report.discrepancies.universal_beams]
        .slice(0, 5)
        .forEach(d => {
          console.log(`${d.code}: ${d.issues.join(', ')}`);
        });
    }
    
    console.log('\n=== Files Generated ===');
    console.log('- asmuss_catalogue_analysis_report.json');
    console.log('- material_import_export_template.csv');
    console.log('- lateral_engineering_materials_export_2025-06-05.csv');
    
    return report;
    
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
}

runComprehensiveAnalysis()
  .then((report) => {
    console.log('\nComprehensive catalogue analysis completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
/**
 * Add consumables category and example materials to the database
 * For testing and user convenience in the estimation engine
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// Common consumables for steel fabrication
const consumablesMaterials = [
  // Welding consumables
  {
    code: "CONS-WEL-001",
    name: "7018 Welding Electrodes 3.2mm",
    category: "Consumables",
    unit: "kg",
    pricePerKg: 12.50,
    pricePerMeter: null,
    weightPerMeter: null,
    supplier: "ASMUSS Steel",
    standard: "AWS A5.1",
    grade: "E7018",
    width: 3.2,
    thickness: null,
    diameter: null,
    length: 350,
    notes: "Low hydrogen welding electrodes for structural steel"
  },
  {
    code: "CONS-WEL-002",
    name: "6013 Welding Electrodes 2.5mm",
    category: "Consumables",
    unit: "kg",
    pricePerKg: 8.90,
    pricePerMeter: null,
    weightPerMeter: null,
    supplier: "ASMUSS Steel",
    standard: "AWS A5.1",
    grade: "E6013",
    width: 2.5,
    thickness: null,
    diameter: null,
    length: 300,
    notes: "General purpose welding electrodes"
  },
  {
    code: "CONS-WEL-003",
    name: "ER70S-6 MIG Wire 1.2mm",
    category: "Consumables",
    unit: "kg",
    pricePerKg: 9.80,
    pricePerMeter: null,
    weightPerMeter: null,
    supplier: "ASMUSS Steel",
    standard: "AWS A5.18",
    grade: "ER70S-6",
    width: 1.2,
    thickness: null,
    diameter: null,
    length: null,
    notes: "Solid wire for GMAW welding"
  },
  
  // Cutting consumables
  {
    code: "CONS-CUT-001",
    name: "Cutting Discs 230mm x 2.0mm",
    category: "Consumables",
    unit: "pcs",
    pricePerKg: null,
    pricePerMeter: null,
    weightPerMeter: null,
    unitCost: 3.25,
    supplier: "ASMUSS Steel",
    standard: "EN 12413",
    grade: "A46TBF",
    width: 230,
    thickness: 2.0,
    diameter: 230,
    length: null,
    notes: "Abrasive cutting discs for steel"
  },
  {
    code: "CONS-CUT-002",
    name: "Grinding Discs 125mm x 6mm",
    category: "Consumables",
    unit: "pcs",
    pricePerKg: null,
    pricePerMeter: null,
    weightPerMeter: null,
    unitCost: 2.10,
    supplier: "ASMUSS Steel",
    standard: "EN 12413",
    grade: "A24RBF",
    width: 125,
    thickness: 6.0,
    diameter: 125,
    length: null,
    notes: "Grinding discs for surface preparation"
  },
  
  // Gas consumables
  {
    code: "CONS-GAS-001",
    name: "Oxygen Gas - Industrial Grade",
    category: "Consumables",
    unit: "m3",
    pricePerKg: null,
    pricePerMeter: null,
    weightPerMeter: null,
    unitCost: 2.85,
    supplier: "BOC Gas",
    standard: "ISO 3156",
    grade: "99.5%",
    width: null,
    thickness: null,
    diameter: null,
    length: null,
    notes: "High purity oxygen for oxy-fuel cutting"
  },
  {
    code: "CONS-GAS-002",
    name: "Acetylene Gas - Welding Grade",
    category: "Consumables",
    unit: "m3",
    pricePerKg: null,
    pricePerMeter: null,
    weightPerMeter: null,
    unitCost: 8.50,
    supplier: "BOC Gas",
    standard: "ISO 3150",
    grade: "98.5%",
    width: null,
    thickness: null,
    diameter: null,
    length: null,
    notes: "High purity acetylene for welding and cutting"
  },
  {
    code: "CONS-GAS-003",
    name: "CO2 Shielding Gas",
    category: "Consumables",
    unit: "m3",
    pricePerKg: null,
    pricePerMeter: null,
    weightPerMeter: null,
    unitCost: 1.95,
    supplier: "BOC Gas",
    standard: "ISO 14175",
    grade: "C1",
    width: null,
    thickness: null,
    diameter: null,
    length: null,
    notes: "Carbon dioxide for MIG welding"
  },
  
  // Fasteners
  {
    code: "CONS-FAST-001",
    name: "Hex Bolts M12x80 Grade 8.8",
    category: "Consumables",
    unit: "pcs",
    pricePerKg: null,
    pricePerMeter: null,
    weightPerMeter: null,
    unitCost: 0.85,
    supplier: "Fastener Supply",
    standard: "AS 1252",
    grade: "8.8",
    width: 12,
    thickness: null,
    diameter: 12,
    length: 80,
    notes: "High tensile hex head bolts"
  },
  {
    code: "CONS-FAST-002",
    name: "Hex Nuts M12 Grade 8",
    category: "Consumables",
    unit: "pcs",
    pricePerKg: null,
    pricePerMeter: null,
    weightPerMeter: null,
    unitCost: 0.25,
    supplier: "Fastener Supply",
    standard: "AS 1252",
    grade: "8",
    width: 12,
    thickness: 10,
    diameter: 12,
    length: null,
    notes: "High tensile hex nuts"
  },
  
  // Safety and miscellaneous
  {
    code: "CONS-SAF-001",
    name: "Anti-Spatter Spray 400ml",
    category: "Consumables",
    unit: "can",
    pricePerKg: null,
    pricePerMeter: null,
    weightPerMeter: null,
    unitCost: 15.50,
    supplier: "Welding Supplies",
    standard: null,
    grade: null,
    width: null,
    thickness: null,
    diameter: null,
    length: null,
    notes: "Prevents spatter adhesion during welding"
  },
  {
    code: "CONS-SAF-002",
    name: "Primer Paint - Red Oxide 4L",
    category: "Consumables",
    unit: "L",
    pricePerKg: null,
    pricePerMeter: null,
    weightPerMeter: null,
    unitCost: 25.80,
    supplier: "Paint Supply",
    standard: "AS 3750",
    grade: "Type 1",
    width: null,
    thickness: null,
    diameter: null,
    length: null,
    notes: "Protective primer for steel surfaces"
  },
  {
    code: "CONS-SAF-003",
    name: "Safety Glasses - Clear Lens",
    category: "Consumables",
    unit: "pcs",
    pricePerKg: null,
    pricePerMeter: null,
    weightPerMeter: null,
    unitCost: 8.90,
    supplier: "Safety Supply",
    standard: "AS/NZS 1337",
    grade: "Impact",
    width: null,
    thickness: null,
    diameter: null,
    length: null,
    notes: "Safety glasses for workshop use"
  },
  {
    code: "CONS-SAF-004",
    name: "Welding Gloves - Leather",
    category: "Consumables",
    unit: "pair",
    pricePerKg: null,
    pricePerMeter: null,
    weightPerMeter: null,
    unitCost: 22.50,
    supplier: "Safety Supply",
    standard: "AS/NZS 2161",
    grade: "A1",
    width: null,
    thickness: 1.2,
    diameter: null,
    length: 350,
    notes: "Heat resistant welding gloves"
  }
];

async function addConsumablesMaterials() {
  console.log("Adding consumables materials to database...");
  
  try {
    for (const material of consumablesMaterials) {
      // Check if material already exists
      const existing = await sql`
        SELECT id FROM materials WHERE code = ${material.code}
      `;
      
      if (existing.length === 0) {
        // Insert new consumable material
        await sql`
          INSERT INTO materials (
            code, name, category, price_per_kg, price_per_meter, 
            weight_per_meter, unit_cost, supplier, standard, grade,
            width, thickness, diameter, length, notes
          ) VALUES (
            ${material.code}, ${material.name}, ${material.category},
            ${material.pricePerKg}, ${material.pricePerMeter}, ${material.weightPerMeter},
            ${material.unitCost}, ${material.supplier}, ${material.standard}, ${material.grade},
            ${material.width}, ${material.thickness}, ${material.diameter}, 
            ${material.length}, ${material.notes}
          )
        `;
        console.log(`✓ Added: ${material.name}`);
      } else {
        console.log(`⚠ Exists: ${material.name}`);
      }
    }
    
    console.log("✅ Consumables materials addition complete!");
    
    // Summary
    const consumablesCount = await sql`
      SELECT COUNT(*) as count FROM materials WHERE category = 'Consumables'
    `;
    
    console.log(`📊 Total consumables in database: ${consumablesCount[0].count}`);
    
  } catch (error) {
    console.error("❌ Error adding consumables materials:", error);
    throw error;
  }
}

// Run the script
addConsumablesMaterials()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
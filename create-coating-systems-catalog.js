/**
 * Create comprehensive coating systems catalog for steel fabrication
 * Based on industry standards and authentic coating materials/services
 */

import { Pool } from '@neondatabase/serverless';
import ws from "ws";

// Configure WebSocket for Neon
const neonConfig = { webSocketConstructor: ws };

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ...neonConfig
});

const coatingSystemsCatalog = [
  // SURFACE PREPARATION SERVICES
  {
    code: "PREP-BLAST-001",
    name: "Sandblasting - Light Commercial",
    category: "Surface Preparation",
    unit_cost: 4.50,
    notes: "SA2.5 standard, removes mill scale and rust",
    supplier: "Surface Prep Services"
  },
  {
    code: "PREP-BLAST-002", 
    name: "Sandblasting - Heavy Industrial",
    category: "Surface Preparation",
    unit_cost: 6.80,
    notes: "SA3 white metal finish, heavy contamination removal",
    supplier: "Surface Prep Services"
  },
  {
    code: "PREP-CHEM-001",
    name: "Chemical Cleaning - Pickling",
    category: "Surface Preparation", 
    unit_cost: 3.20,
    notes: "Acid pickling for scale removal per m²",
    supplier: "Chemical Clean Co"
  },
  {
    code: "PREP-POWER-001",
    name: "Power Tool Cleaning",
    category: "Surface Preparation",
    unit_cost: 2.10,
    notes: "St3 standard mechanical cleaning",
    supplier: "Surface Prep Services"
  },

  // GALVANIZING SERVICES  
  {
    code: "GALV-HDG-001",
    name: "Hot Dip Galvanizing - Standard",
    category: "Galvanizing",
    price_per_kg: 2.20,
    notes: "AS/NZS 4680 compliant, 85 micron minimum coating",
    supplier: "Australian Galvanizers"
  },
  {
    code: "GALV-HDG-002",
    name: "Hot Dip Galvanizing - Heavy Duty", 
    category: "Galvanizing",
    price_per_kg: 2.65,
    notes: "Marine grade, 100+ micron coating thickness",
    supplier: "Australian Galvanizers"
  },
  {
    code: "GALV-ELEC-001",
    name: "Electro Galvanizing",
    category: "Galvanizing",
    price_per_kg: 1.85,
    notes: "Thin coating 8-25 micron, smooth finish",
    supplier: "Electro Coat Ltd"
  },
  {
    code: "GALV-SPIN-001",
    name: "Spin Galvanizing - Fasteners",
    category: "Galvanizing", 
    unit_cost: 0.08,
    notes: "Per fastener, bolts/nuts/washers",
    supplier: "Fastener Galv Co"
  },

  // PRIMER SYSTEMS
  {
    code: "PRIM-EPOX-001",
    name: "Epoxy Primer - 2 Pack",
    category: "Primers",
    price_per_kg: 18.50,
    surface_area_per_meter: 8.0,
    notes: "High build primer, 75 micron DFT, 1L covers 8m²",
    supplier: "Dulux Protective Coatings"
  },
  {
    code: "PRIM-ZINC-001", 
    name: "Zinc Rich Primer - Inorganic",
    category: "Primers",
    price_per_kg: 24.80,
    surface_area_per_meter: 6.5,
    notes: "95% zinc content, cathodic protection, 1L covers 6.5m²", 
    supplier: "International Paint"
  },
  {
    code: "PRIM-ETCH-001",
    name: "Etch Primer - Self Etching",
    category: "Primers",
    price_per_kg: 16.20,
    surface_area_per_meter: 10.0,
    notes: "Single pack, light duty, 1L covers 10m²",
    supplier: "Wattyl Industrial"
  },
  {
    code: "PRIM-WASH-001",
    name: "Wash Primer - Phosphoric Acid",
    category: "Primers", 
    price_per_kg: 14.75,
    surface_area_per_meter: 12.0,
    notes: "Pre-treatment primer, 1L covers 12m²",
    supplier: "Dulux Protective Coatings"
  },

  // TOPCOAT PAINTS
  {
    code: "TOP-ACRY-001",
    name: "Acrylic Topcoat - Gloss White",
    category: "Topcoats",
    price_per_kg: 22.30,
    surface_area_per_meter: 10.0,
    notes: "Weather resistant, 1L covers 10m²",
    supplier: "Dulux Protective Coatings"
  },
  {
    code: "TOP-POLY-001",
    name: "Polyurethane Topcoat - Satin",
    category: "Topcoats",
    price_per_kg: 28.90,
    surface_area_per_meter: 8.5,
    notes: "Chemical resistant, 1L covers 8.5m²",
    supplier: "International Paint"
  },
  {
    code: "TOP-EPOX-001",
    name: "Epoxy Topcoat - High Gloss", 
    category: "Topcoats",
    price_per_kg: 26.40,
    surface_area_per_meter: 9.0,
    notes: "Industrial grade, 1L covers 9m²",
    supplier: "Jotun Industrial"
  },
  {
    code: "TOP-ALKYD-001",
    name: "Alkyd Enamel - Semi Gloss",
    category: "Topcoats",
    price_per_kg: 19.60,
    surface_area_per_meter: 11.0,
    notes: "General purpose, 1L covers 11m²", 
    supplier: "Wattyl Industrial"
  },

  // SPECIALTY COATINGS
  {
    code: "SPEC-FIRE-001",
    name: "Intumescent Fire Paint - 30min",
    category: "Specialty Coatings",
    price_per_kg: 45.20,
    surface_area_per_meter: 2.5,
    notes: "30 minute fire rating, 1L covers 2.5m²",
    supplier: "Nullifire Australia"
  },
  {
    code: "SPEC-FIRE-002",
    name: "Intumescent Fire Paint - 60min", 
    category: "Specialty Coatings",
    price_per_kg: 62.80,
    surface_area_per_meter: 1.8,
    notes: "60 minute fire rating, 1L covers 1.8m²",
    supplier: "Nullifire Australia"
  },
  {
    code: "SPEC-ANTI-001",
    name: "Anti-Slip Coating - Textured",
    category: "Specialty Coatings",
    price_per_kg: 34.50,
    surface_area_per_meter: 4.0,
    notes: "High grip walkway coating, 1L covers 4m²",
    supplier: "Sika Australia"
  },
  {
    code: "SPEC-CHEM-001",
    name: "Chemical Resistant Coating",
    category: "Specialty Coatings", 
    price_per_kg: 42.10,
    surface_area_per_meter: 3.5,
    notes: "Acid/alkali resistant, 1L covers 3.5m²",
    supplier: "International Paint"
  },

  // POWDER COATING
  {
    code: "POW-POLY-001",
    name: "Polyester Powder - Gloss Black",
    category: "Powder Coating",
    price_per_kg: 12.80,
    surface_area_per_meter: 15.0,
    notes: "Standard exterior grade, 1kg covers 15m²",
    supplier: "Interpon Powder"
  },
  {
    code: "POW-POLY-002",
    name: "Polyester Powder - Matt White",
    category: "Powder Coating", 
    price_per_kg: 13.20,
    surface_area_per_meter: 15.0,
    notes: "UV stable, 1kg covers 15m²",
    supplier: "Interpon Powder"
  },
  {
    code: "POW-EPOX-001",
    name: "Epoxy Powder - High Build",
    category: "Powder Coating",
    price_per_kg: 15.40,
    surface_area_per_meter: 12.0,
    notes: "Interior use, chemical resistant, 1kg covers 12m²",
    supplier: "Akzo Nobel Powder"
  },
  {
    code: "POW-SERV-001",
    name: "Powder Coating Service - Standard",
    category: "Powder Coating",
    price_per_kg: 8.50,
    notes: "Blasting, powder application and cure per kg",
    supplier: "Metro Powder Coaters"
  },

  // ANODIZING SERVICES
  {
    code: "ANOD-NAT-001",
    name: "Natural Anodizing - Clear",
    category: "Anodizing",
    unit_cost: 15.20,
    notes: "25 micron clear anodize per m²",
    supplier: "Anodize Australia"
  },
  {
    code: "ANOD-COL-001",
    name: "Colored Anodizing - Black",
    category: "Anodizing",
    unit_cost: 18.70,
    notes: "25 micron black anodize per m²", 
    supplier: "Anodize Australia"
  },
  {
    code: "ANOD-HARD-001",
    name: "Hard Anodizing - Type III",
    category: "Anodizing",
    unit_cost: 28.40,
    notes: "50+ micron hard coat per m²",
    supplier: "Hard Coat Anodizers"
  },

  // PLATING SERVICES
  {
    code: "PLAT-ZINC-001",
    name: "Zinc Plating - Barrel",
    category: "Plating",
    unit_cost: 0.12,
    notes: "Per fastener, small parts",
    supplier: "Electro Plating Co"
  },
  {
    code: "PLAT-ZINC-002",
    name: "Zinc Plating - Rack",
    category: "Plating",
    unit_cost: 2.80,
    notes: "Large parts per dm²",
    supplier: "Electro Plating Co"
  },
  {
    code: "PLAT-NICK-001",
    name: "Nickel Plating - Decorative",
    category: "Plating",
    unit_cost: 4.20,
    notes: "Decorative finish per dm²",
    supplier: "Chrome & Nickel Ltd"
  },
  {
    code: "PLAT-CHRO-001", 
    name: "Chrome Plating - Hard",
    category: "Plating",
    unit_cost: 12.50,
    notes: "Industrial hard chrome per dm²",
    supplier: "Chrome & Nickel Ltd"
  },

  // PAINT SYSTEMS (Complete Systems)
  {
    code: "SYS-MARI-001",
    name: "Marine Paint System - 3 Coat",
    category: "Paint Systems", 
    unit_cost: 85.20,
    notes: "Primer + Undercoat + Topcoat per m², C5-M environment",
    supplier: "International Paint"
  },
  {
    code: "SYS-INDU-001",
    name: "Industrial Paint System - 2 Coat",
    category: "Paint Systems",
    unit_cost: 42.80,
    notes: "Epoxy primer + polyurethane topcoat per m²",
    supplier: "Dulux Protective Coatings"
  },
  {
    code: "SYS-ARCH-001",
    name: "Architectural Paint System",
    category: "Paint Systems",
    unit_cost: 32.60,
    notes: "Etch primer + acrylic topcoat per m²",
    supplier: "Wattyl Industrial"
  }
];

async function insertCoatingMaterials() {
  try {
    console.log('Starting coating systems catalog creation...');
    
    // Get next available ID
    const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM materials');
    let nextId = (maxIdResult.rows[0].max_id || 4320) + 1;

    for (const coating of coatingSystemsCatalog) {
      const insertQuery = `
        INSERT INTO materials (
          id, code, name, category, price_per_kg, price_per_meter, 
          unit_cost, surface_area_per_meter, supplier, notes, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `;

      const values = [
        nextId++,
        coating.code,
        coating.name, 
        coating.category,
        coating.price_per_kg || null,
        coating.price_per_meter || null,
        coating.unit_cost || null,
        coating.surface_area_per_meter || null,
        coating.supplier,
        coating.notes,
        true
      ];

      await pool.query(insertQuery, values);
      console.log(`✓ Added: ${coating.name}`);
    }

    console.log(`\n🎉 Successfully added ${coatingSystemsCatalog.length} coating materials!`);
    
    // Show summary by category
    const categories = [...new Set(coatingSystemsCatalog.map(c => c.category))];
    console.log('\n📊 Summary by Category:');
    categories.forEach(cat => {
      const count = coatingSystemsCatalog.filter(c => c.category === cat).length;
      console.log(`   ${cat}: ${count} items`);
    });

  } catch (error) {
    console.error('Error creating coating systems catalog:', error);
  } finally {
    await pool.end();
  }
}

// Run the catalog creation
insertCoatingMaterials();
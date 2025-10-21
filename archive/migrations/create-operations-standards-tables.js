import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createOperationsStandardsTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create material_sub_items table for full audit trail
    await client.query(`
      CREATE TABLE IF NOT EXISTS material_sub_items (
        id SERIAL PRIMARY KEY,
        material_id INTEGER NOT NULL,
        estimation_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL, -- stiffener, end_plate, base_plate, cleat, gusset, bolts, holes, welding
        description TEXT,
        
        -- Dimensions
        length DECIMAL(10,2),
        width DECIMAL(10,2),
        thickness DECIMAL(10,2),
        diameter DECIMAL(10,2), -- for holes/bolts
        
        -- Quantities and costs
        quantity INTEGER DEFAULT 1,
        unit_cost DECIMAL(10,2),
        total_cost DECIMAL(10,2),
        
        -- Welding details
        weld_type VARCHAR(50), -- fillet, butt, seal, plug
        weld_size DECIMAL(10,2), -- in mm
        weld_length DECIMAL(10,2), -- in mm
        weld_position VARCHAR(20), -- flat, horizontal, vertical, overhead
        weld_time DECIMAL(10,2), -- in minutes
        
        -- Hole details
        hole_type VARCHAR(50), -- standard, tapped, countersunk, counterbore
        hole_method VARCHAR(50), -- mag_drill, hand_drill, laser, plasma, punch
        hole_time DECIMAL(10,2), -- in minutes
        
        -- Labor allocation
        labor_allocation VARCHAR(50), -- workshop, onsite, subcontractor_workshop, subcontractor_onsite
        processing_time DECIMAL(10,2), -- total time in minutes
        
        -- Metadata
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        
        FOREIGN KEY (estimation_id) REFERENCES estimation_projects(id) ON DELETE CASCADE
      );
    `);
    
    // Create welding_standards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS welding_standards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        weld_type VARCHAR(50) NOT NULL, -- fillet, butt_single_v, butt_double_v, seal, plug
        size DECIMAL(10,2), -- in mm
        time_per_meter DECIMAL(10,2) NOT NULL, -- minutes per meter
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create drilling_standards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS drilling_standards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        method VARCHAR(50) NOT NULL, -- mag_drill, hand_drill, laser, plasma, punch
        diameter_min DECIMAL(10,2), -- mm
        diameter_max DECIMAL(10,2), -- mm
        time_per_hole DECIMAL(10,2) NOT NULL, -- minutes
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create cutting_standards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cutting_standards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        material_type VARCHAR(50) NOT NULL, -- mild_steel, stainless, aluminum, high_tensile
        thickness_min DECIMAL(10,2), -- mm
        thickness_max DECIMAL(10,2), -- mm
        time_per_meter DECIMAL(10,2) NOT NULL, -- minutes
        equipment VARCHAR(100), -- bandsaw, plasma, laser, oxy
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create position_factors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS position_factors (
        id SERIAL PRIMARY KEY,
        position VARCHAR(50) NOT NULL UNIQUE, -- flat, horizontal, vertical, overhead
        factor DECIMAL(4,2) NOT NULL, -- multiplier e.g., 1.0, 1.2, 1.5, 2.0
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create assembly_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assembly_templates (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE, -- e.g., COL-A1
        name VARCHAR(100) NOT NULL,
        description TEXT,
        main_material VARCHAR(100), -- e.g., 250UC89.5
        components JSONB, -- Array of component details
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create welding_presets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS welding_presets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        formula TEXT, -- e.g., "perimeter", "2_sides", "3_sides", "all_around"
        weld_type VARCHAR(50),
        weld_size DECIMAL(10,2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create labor_defaults table
    await client.query(`
      CREATE TABLE IF NOT EXISTS labor_defaults (
        id SERIAL PRIMARY KEY,
        operation_type VARCHAR(100) NOT NULL,
        default_allocation VARCHAR(50) NOT NULL, -- workshop, onsite, subcontractor
        site_premium_percentage DECIMAL(5,2) DEFAULT 0,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Insert default welding standards
    await client.query(`
      INSERT INTO welding_standards (name, weld_type, size, time_per_meter) VALUES
      ('3mm Fillet Weld', 'fillet', 3, 8),
      ('4mm Fillet Weld', 'fillet', 4, 10),
      ('5mm Fillet Weld', 'fillet', 5, 12),
      ('6mm Fillet Weld', 'fillet', 6, 15),
      ('8mm Fillet Weld', 'fillet', 8, 20),
      ('10mm Fillet Weld', 'fillet', 10, 25),
      ('12mm Fillet Weld', 'fillet', 12, 30),
      ('Single-V Butt Weld', 'butt_single_v', NULL, 35),
      ('Double-V Butt Weld', 'butt_double_v', NULL, 45),
      ('Single-Bevel Butt Weld', 'butt_single_bevel', NULL, 30),
      ('Double-Bevel Butt Weld', 'butt_double_bevel', NULL, 40),
      ('Seal Weld', 'seal', NULL, 5),
      ('Plug Weld', 'plug', NULL, 3)
      ON CONFLICT DO NOTHING;
    `);
    
    // Insert default drilling standards
    await client.query(`
      INSERT INTO drilling_standards (name, method, diameter_min, diameter_max, time_per_hole) VALUES
      ('Mag Drill Small', 'mag_drill', 0, 20, 5),
      ('Mag Drill Large', 'mag_drill', 20, 40, 8),
      ('Hand Drill Small', 'hand_drill', 0, 15, 8),
      ('Hand Drill Large', 'hand_drill', 15, 30, 12),
      ('Laser Cut', 'laser', 0, 100, 1),
      ('Plasma Cut', 'plasma', 0, 100, 2),
      ('Punch Press', 'punch', 0, 40, 0.5)
      ON CONFLICT DO NOTHING;
    `);
    
    // Insert default cutting standards
    await client.query(`
      INSERT INTO cutting_standards (name, material_type, thickness_min, thickness_max, time_per_meter, equipment) VALUES
      ('Mild Steel Thin', 'mild_steel', 0, 10, 10, 'bandsaw'),
      ('Mild Steel Medium', 'mild_steel', 10, 25, 15, 'bandsaw'),
      ('Mild Steel Thick', 'mild_steel', 25, 50, 20, 'bandsaw'),
      ('Stainless Thin', 'stainless', 0, 10, 15, 'bandsaw'),
      ('Stainless Medium', 'stainless', 10, 25, 20, 'bandsaw'),
      ('Aluminum All', 'aluminum', 0, 50, 5, 'bandsaw'),
      ('High Tensile All', 'high_tensile', 0, 50, 25, 'bandsaw')
      ON CONFLICT DO NOTHING;
    `);
    
    // Insert default position factors
    await client.query(`
      INSERT INTO position_factors (position, factor, description) VALUES
      ('flat', 1.0, 'Flat/downhand position - easiest welding position'),
      ('horizontal', 1.2, 'Horizontal position - moderate difficulty'),
      ('vertical', 1.5, 'Vertical position - increased difficulty'),
      ('overhead', 2.0, 'Overhead position - most difficult')
      ON CONFLICT DO NOTHING;
    `);
    
    // Insert default welding presets
    await client.query(`
      INSERT INTO welding_presets (name, description, formula, weld_type, weld_size) VALUES
      ('Base Plate - Perimeter', 'Fillet weld around perimeter of base plate', 'perimeter', 'fillet', 8),
      ('End Plate - Full Pen', 'Full penetration butt weld plus perimeter', 'butt_plus_perimeter', 'butt_single_v', NULL),
      ('Stiffener - 2 Sided', 'Fillet weld on vertical edges only', '2_sides_vertical', 'fillet', 6),
      ('Stiffener - 4 Sided', 'Fillet weld on all edges (for UB/UC/PFC)', '4_sides', 'fillet', 6),
      ('Cleat - 3 Sided', 'Fillet weld on left, right, and bottom edges', '3_sides', 'fillet', 6),
      ('Gusset - 2 Sided', 'Fillet weld on two edges', '2_sides', 'fillet', 8),
      ('Gusset - 3 Sided', 'Fillet weld on three edges', '3_sides', 'fillet', 8)
      ON CONFLICT DO NOTHING;
    `);
    
    // Insert default labor allocations
    await client.query(`
      INSERT INTO labor_defaults (operation_type, default_allocation, site_premium_percentage) VALUES
      ('cutting', 'workshop', 0),
      ('drilling', 'workshop', 0),
      ('welding_workshop', 'workshop', 0),
      ('welding_site', 'onsite', 50),
      ('grinding', 'workshop', 0),
      ('assembly', 'workshop', 0),
      ('erection', 'onsite', 50),
      ('bolting', 'onsite', 50),
      ('touch_up', 'onsite', 30)
      ON CONFLICT DO NOTHING;
    `);
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_material_sub_items_material ON material_sub_items(material_id);
      CREATE INDEX IF NOT EXISTS idx_material_sub_items_estimation ON material_sub_items(estimation_id);
      CREATE INDEX IF NOT EXISTS idx_material_sub_items_type ON material_sub_items(type);
    `);
    
    await client.query('COMMIT');
    console.log('✅ Operations standards tables created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating operations standards tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
createOperationsStandardsTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
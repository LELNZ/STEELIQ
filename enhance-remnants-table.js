import { db } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function enhanceRemnantsTable() {
  console.log("Starting remnants table enhancement...");

  try {
    // First backup existing data
    console.log("Backing up existing remnants data...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS remnants_backup AS SELECT * FROM remnants;
    `);

    // Drop the old remnants table
    console.log("Dropping old remnants table...");
    await db.execute(sql`DROP TABLE IF EXISTS remnants CASCADE;`);

    // Create the comprehensive new remnants table
    console.log("Creating comprehensive remnants table...");
    await db.execute(sql`
      CREATE TABLE remnants (
        id SERIAL PRIMARY KEY,
        original_material_id INTEGER REFERENCES materials(id),
        material_code VARCHAR(50) NOT NULL,
        material_name VARCHAR(255) NOT NULL,
        length DECIMAL(10, 2) NOT NULL, -- in mm
        width DECIMAL(10, 2), -- for sheets/plates
        thickness DECIMAL(10, 2), -- for sheets/plates
        weight DECIMAL(10, 3), -- in kg
        location VARCHAR(100),
        rack_number VARCHAR(50),
        bin_number VARCHAR(50),
        mill_cert_number VARCHAR(100),
        heat_number VARCHAR(100),
        parent_job_id INTEGER REFERENCES jobs(id),
        parent_job_number VARCHAR(50),
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'available', -- available, reserved, consumed
        qr_code VARCHAR(255) UNIQUE,
        barcode VARCHAR(255) UNIQUE,
        cost_per_kg DECIMAL(10, 2),
        original_value DECIMAL(10, 2),
        current_value DECIMAL(10, 2),
        reuse_count INTEGER DEFAULT 0,
        reserved_for_job_id INTEGER REFERENCES jobs(id),
        consumed_date TIMESTAMP,
        notes TEXT,
        photo_url VARCHAR(500),
        color_code VARCHAR(7), -- hex color for visual identification
        material_grade VARCHAR(50),
        surface_finish VARCHAR(50),
        compliance_standards TEXT[] DEFAULT '{}',
        is_prime_material BOOLEAN DEFAULT FALSE,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id),
        -- Legacy fields for compatibility
        original_inventory_id INTEGER REFERENCES inventory(id),
        new_inventory_id INTEGER REFERENCES inventory(id),
        original_length DECIMAL(10, 2),
        remnant_length DECIMAL(10, 2),
        is_labeled BOOLEAN DEFAULT FALSE,
        photo_uploaded BOOLEAN DEFAULT FALSE
      );
    `);

    // Create indexes for performance
    console.log("Creating indexes...");
    await db.execute(sql`CREATE INDEX idx_remnants_material_code ON remnants(material_code);`);
    await db.execute(sql`CREATE INDEX idx_remnants_status ON remnants(status);`);
    await db.execute(sql`CREATE INDEX idx_remnants_location ON remnants(location);`);
    await db.execute(sql`CREATE INDEX idx_remnants_length ON remnants(length);`);
    await db.execute(sql`CREATE INDEX idx_remnants_created_date ON remnants(created_date);`);

    // Create remnant history table
    console.log("Creating remnant history table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS remnant_history (
        id SERIAL PRIMARY KEY,
        remnant_id INTEGER REFERENCES remnants(id),
        action VARCHAR(50) NOT NULL, -- created, reserved, unreserved, consumed, modified
        job_id INTEGER REFERENCES jobs(id),
        job_number VARCHAR(50),
        previous_length DECIMAL(10, 2),
        new_length DECIMAL(10, 2),
        length_used DECIMAL(10, 2),
        user_id INTEGER REFERENCES users(id),
        action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      );
    `);

    await db.execute(sql`CREATE INDEX idx_remnant_history_remnant_id ON remnant_history(remnant_id);`);
    await db.execute(sql`CREATE INDEX idx_remnant_history_job_id ON remnant_history(job_id);`);

    // Create remnant labels table
    console.log("Creating remnant labels table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS remnant_labels (
        id SERIAL PRIMARY KEY,
        remnant_id INTEGER REFERENCES remnants(id),
        label_type VARCHAR(20), -- qr, barcode, both
        printed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        printed_by INTEGER REFERENCES users(id),
        printer_name VARCHAR(100),
        label_size VARCHAR(20), -- small, medium, large
        include_photo BOOLEAN DEFAULT FALSE
      );
    `);

    // Create remnant suggestions table
    console.log("Creating remnant suggestions table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS remnant_suggestions (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id),
        material_code VARCHAR(50),
        required_length DECIMAL(10, 2),
        remnant_id INTEGER REFERENCES remnants(id),
        suggested_remnant_length DECIMAL(10, 2),
        waste_if_used DECIMAL(10, 2),
        cost_savings DECIMAL(10, 2),
        suggestion_score INTEGER, -- 0-100 based on age, size match, location
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted BOOLEAN DEFAULT FALSE,
        accepted_by INTEGER REFERENCES users(id),
        accepted_date TIMESTAMP,
        rejection_reason VARCHAR(255)
      );
    `);

    await db.execute(sql`CREATE INDEX idx_remnant_suggestions_job_id ON remnant_suggestions(job_id);`);

    // Migrate data from backup if exists
    console.log("Migrating data from backup...");
    const backupData = await db.execute(sql`SELECT * FROM remnants_backup;`);
    
    if (backupData.rows.length > 0) {
      console.log(`Found ${backupData.rows.length} remnants to migrate`);
      
      for (const row of backupData.rows) {
        // Get material details from inventory
        const [inventoryData] = await db.execute(sql`
          SELECT m.code, m.name, i.mill_cert_number, i.heat_number, i.location
          FROM inventory i
          JOIN materials m ON i.material_id = m.id
          WHERE i.id = ${row.new_inventory_id}
        `).then(r => r.rows);

        await db.execute(sql`
          INSERT INTO remnants (
            id,
            original_inventory_id,
            new_inventory_id,
            material_code,
            material_name,
            original_length,
            remnant_length,
            length,
            is_labeled,
            photo_uploaded,
            created_date,
            mill_cert_number,
            heat_number,
            location,
            status
          ) VALUES (
            ${row.id},
            ${row.original_inventory_id},
            ${row.new_inventory_id},
            ${inventoryData?.code || 'UNKNOWN'},
            ${inventoryData?.name || 'Unknown Material'},
            ${row.original_length},
            ${row.remnant_length},
            ${row.remnant_length}, -- Use remnant_length as the current length
            ${row.is_labeled},
            ${row.photo_uploaded},
            ${row.created_at},
            ${inventoryData?.mill_cert_number},
            ${inventoryData?.heat_number},
            ${inventoryData?.location || 'Remnant Storage'},
            'available'
          );
        `);
      }

      // Reset sequence
      await db.execute(sql`
        SELECT setval('remnants_id_seq', (SELECT MAX(id) FROM remnants));
      `);
    }

    console.log("Remnants table enhancement completed successfully!");
    
    // Drop backup table
    console.log("Cleaning up backup table...");
    await db.execute(sql`DROP TABLE IF EXISTS remnants_backup;`);

  } catch (error) {
    console.error("Error enhancing remnants table:", error);
    
    // Attempt to restore from backup
    console.log("Attempting to restore from backup...");
    try {
      await db.execute(sql`DROP TABLE IF EXISTS remnants CASCADE;`);
      await db.execute(sql`ALTER TABLE remnants_backup RENAME TO remnants;`);
      console.log("Restored from backup");
    } catch (restoreError) {
      console.error("Failed to restore from backup:", restoreError);
    }
    
    throw error;
  }
}

// Run the migration
enhanceRemnantsTable()
  .then(() => {
    console.log("Migration completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
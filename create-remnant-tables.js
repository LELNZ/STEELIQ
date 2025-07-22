import { sql } from 'drizzle-orm';
import { db, pool } from './server/db.js';

async function createRemnantTables() {
  console.log('Creating remnant management tables...');

  try {
    // Create remnants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS remnants (
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
        is_prime_material BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES users(id),
        updated_by INTEGER REFERENCES users(id)
      );
    `);

    // Create remnant_history table for tracking usage
    await pool.query(`
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

    // Create remnant_labels table for print history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS remnant_labels (
        id SERIAL PRIMARY KEY,
        remnant_id INTEGER REFERENCES remnants(id),
        label_type VARCHAR(20), -- qr, barcode, both
        printed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        printed_by INTEGER REFERENCES users(id),
        printer_name VARCHAR(100),
        label_size VARCHAR(20), -- small, medium, large
        include_photo BOOLEAN DEFAULT false
      );
    `);

    // Create remnant_suggestions table for optimization
    await pool.query(`
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
        accepted BOOLEAN DEFAULT false,
        accepted_by INTEGER REFERENCES users(id),
        accepted_date TIMESTAMP,
        rejection_reason VARCHAR(255)
      );
    `);

    // Add indexes for performance
    await pool.query(`
      CREATE INDEX idx_remnants_material_code ON remnants(material_code);
      CREATE INDEX idx_remnants_status ON remnants(status);
      CREATE INDEX idx_remnants_location ON remnants(location);
      CREATE INDEX idx_remnants_length ON remnants(length);
      CREATE INDEX idx_remnants_created_date ON remnants(created_date);
      CREATE INDEX idx_remnant_history_remnant_id ON remnant_history(remnant_id);
      CREATE INDEX idx_remnant_history_job_id ON remnant_history(job_id);
      CREATE INDEX idx_remnant_suggestions_job_id ON remnant_suggestions(job_id);
    `);

    console.log('✅ Remnant management tables created successfully');

    // Insert sample remnant data for testing
    const sampleRemnant = await pool.query(`
      INSERT INTO remnants (
        original_material_id, 
        material_code, 
        material_name, 
        length, 
        weight,
        location,
        rack_number,
        mill_cert_number,
        heat_number,
        qr_code,
        cost_per_kg,
        original_value,
        current_value,
        material_grade,
        surface_finish
      ) VALUES (
        1,
        'SHS100X100X6',
        'Square Hollow Section 100x100x6mm',
        1250,
        23.4,
        'Workshop Bay 2',
        'R-04',
        'MC-2024-12345',
        'HT-98765',
        'REM-2025-001',
        5.85,
        136.89,
        136.89,
        '350L0',
        'Mill Finish'
      ) RETURNING *;
    `);

    console.log('✅ Sample remnant created:', sampleRemnant.rows[0]);

  } catch (error) {
    console.error('❌ Error creating remnant tables:', error);
  } finally {
    await pool.end();
  }
}

createRemnantTables();
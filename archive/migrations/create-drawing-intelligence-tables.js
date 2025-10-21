import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { sql } from 'drizzle-orm';

// Polyfill WebSocket for Node.js
globalThis.WebSocket = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function createDrawingIntelligenceTables() {
  try {
    console.log('Creating Drawing Intelligence tables...');

    // Create drawing_projects table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS drawing_projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        standards VARCHAR(50) DEFAULT 'AS/NZS',
        notes TEXT,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Created drawing_projects table');

    // Create drawings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS drawings (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES drawing_projects(id) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        uploaded_by INTEGER REFERENCES users(id) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'pending',
        analysis_result JSONB,
        steel_members INTEGER DEFAULT 0,
        connections INTEGER DEFAULT 0,
        total_weight DECIMAL(10,2) DEFAULT 0,
        revision_number VARCHAR(10),
        base_drawing_id INTEGER REFERENCES drawings(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Created drawings table');

    // Create drawing_revisions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS drawing_revisions (
        id SERIAL PRIMARY KEY,
        drawing_id INTEGER REFERENCES drawings(id) NOT NULL,
        base_revision_id INTEGER REFERENCES drawings(id) NOT NULL,
        compare_revision_id INTEGER REFERENCES drawings(id) NOT NULL,
        comparison_result JSONB,
        changed_members INTEGER DEFAULT 0,
        changed_connections INTEGER DEFAULT 0,
        weight_change DECIMAL(10,2) DEFAULT 0,
        cost_impact DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Created drawing_revisions table');

    // Create material_takeoffs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS material_takeoffs (
        id SERIAL PRIMARY KEY,
        drawing_id INTEGER REFERENCES drawings(id) NOT NULL,
        project_id INTEGER REFERENCES drawing_projects(id) NOT NULL,
        mark VARCHAR(50) NOT NULL,
        section VARCHAR(100) NOT NULL,
        grade VARCHAR(50),
        length INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        weight DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        drawing_ref VARCHAR(50),
        phase VARCHAR(100),
        wastage INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✓ Created material_takeoffs table');

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_drawings_project_id ON drawings(project_id);
      CREATE INDEX IF NOT EXISTS idx_drawings_status ON drawings(status);
      CREATE INDEX IF NOT EXISTS idx_material_takeoffs_drawing_id ON material_takeoffs(drawing_id);
      CREATE INDEX IF NOT EXISTS idx_material_takeoffs_project_id ON material_takeoffs(project_id);
    `);
    console.log('✓ Created indexes');

    console.log('Drawing Intelligence tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
}

createDrawingIntelligenceTables();

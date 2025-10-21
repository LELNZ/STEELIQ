const { db } = require('./server/db');
const { sql } = require('drizzle-orm');

async function createResourceTables() {
  try {
    console.log('Creating resource allocation tables...');
    
    // Add estimation_id to jobs table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE jobs 
      ADD COLUMN IF NOT EXISTS estimation_id INTEGER REFERENCES estimation_projects(id)
    `);
    console.log('Added estimation_id to jobs table');
    
    // Create resource allocations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS resource_allocations (
        id SERIAL PRIMARY KEY,
        job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
        resource_type VARCHAR(50) NOT NULL,
        description TEXT,
        hours DECIMAL(10, 2),
        rate DECIMAL(10, 2),
        skill_level VARCHAR(50),
        location VARCHAR(50),
        team_member_id INTEGER REFERENCES team_members(id),
        allocated_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created resource_allocations table');
    
    // Create index for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_resource_allocations_job_id 
      ON resource_allocations(job_id)
    `);
    
    // Add lifecycle tracking columns to estimation_projects
    await db.execute(sql`
      ALTER TABLE estimation_projects 
      ADD COLUMN IF NOT EXISTS lifecycle_progress INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS current_phase VARCHAR(100),
      ADD COLUMN IF NOT EXISTS project_number VARCHAR(50)
    `);
    console.log('Added lifecycle tracking columns to estimation_projects');
    
    // Update getEstimationProjects query to include lifecycle data
    await db.execute(sql`
      UPDATE estimation_projects 
      SET lifecycle_progress = 0 
      WHERE lifecycle_progress IS NULL
    `);
    
    console.log('✅ Resource allocation tables created successfully');
  } catch (error) {
    console.error('Error creating resource tables:', error);
  } finally {
    process.exit(0);
  }
}

createResourceTables();
/**
 * Fix database schema issues for team management
 */

const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ 
  connectionString,
  webSocketConstructor: ws
});

async function fixDatabaseSchema() {
  const client = await pool.connect();
  
  try {
    console.log("🔧 Fixing database schema for team management...");
    
    // Check current structure
    console.log("\n📋 Checking current table structures...");
    
    const rolesColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'roles' 
      ORDER BY ordinal_position
    `);
    
    const deptColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'departments' 
      ORDER BY ordinal_position
    `);
    
    console.log("Roles columns:", rolesColumns.rows.map(r => r.column_name));
    console.log("Departments columns:", deptColumns.rows.map(r => r.column_name));
    
    // Fix roles table
    console.log("\n🔄 Updating roles table...");
    
    // Add missing columns to roles table
    const roleMissingColumns = [
      { name: 'is_system_role', type: 'BOOLEAN DEFAULT false', desc: 'System role flag' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()', desc: 'Updated timestamp' }
    ];
    
    for (const col of roleMissingColumns) {
      try {
        await client.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`✅ Added ${col.name} to roles table`);
      } catch (error) {
        console.log(`⚠️ ${col.name} column may already exist: ${error.message}`);
      }
    }
    
    // Fix departments table
    console.log("\n🔄 Updating departments table...");
    
    // Add missing columns to departments table
    const deptMissingColumns = [
      { name: 'head_user_id', type: 'INTEGER REFERENCES users(id)', desc: 'Department head' },
      { name: 'is_active', type: 'BOOLEAN DEFAULT true', desc: 'Active flag' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT NOW()', desc: 'Updated timestamp' }
    ];
    
    for (const col of deptMissingColumns) {
      try {
        await client.query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`✅ Added ${col.name} to departments table`);
      } catch (error) {
        console.log(`⚠️ ${col.name} column may already exist: ${error.message}`);
      }
    }
    
    // Create departments if they don't exist
    console.log("\n🏗️ Creating steel industry departments...");
    
    const departments = [
      { name: 'Management', description: 'Executive leadership and strategic oversight' },
      { name: 'Estimation', description: 'Project cost estimation and quoting' },
      { name: 'Fabrication', description: 'Steel fabrication and manufacturing' },
      { name: 'Business Development', description: 'Client relations and business growth' },
      { name: 'Engineering', description: 'Design engineering and technical analysis' },
      { name: 'Project Management', description: 'Project coordination and delivery' },
      { name: 'Quality Control', description: 'Quality assurance and inspection' },
      { name: 'Site Operations', description: 'On-site installation and supervision' },
      { name: 'Administration', description: 'Administrative support and operations' }
    ];
    
    for (const dept of departments) {
      try {
        await client.query(`
          INSERT INTO departments (name, description, is_active)
          VALUES ($1, $2, $3)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            is_active = EXCLUDED.is_active
        `, [dept.name, dept.description, true]);
        console.log(`✅ Created/updated department: ${dept.name}`);
      } catch (error) {
        console.log(`❌ Error creating department ${dept.name}:`, error.message);
      }
    }
    
    // Create roles if they don't exist
    console.log("\n👥 Creating steel industry roles...");
    
    const roles = [
      {
        name: 'Business Owner / CEO',
        description: 'Executive level access with strategic oversight',
        hourlyRate: 120.00,
        permissions: {
          system: ['view', 'manage'],
          financial: ['view', 'approve', 'manage'],
          projects: ['view', 'create', 'edit', 'delete', 'manage'],
          estimation: ['view', 'create', 'edit', 'approve'],
          materials: ['view', 'edit', 'manage'],
          users: ['view', 'create', 'edit', 'manage'],
          reports: ['view', 'create', 'export']
        }
      },
      {
        name: 'General Manager',
        description: 'Operations management with departmental oversight',
        hourlyRate: 100.00,
        permissions: {
          financial: ['view', 'approve'],
          projects: ['view', 'create', 'edit', 'manage'],
          estimation: ['view', 'approve'],
          materials: ['view', 'edit'],
          users: ['view', 'edit'],
          reports: ['view', 'create']
        }
      },
      {
        name: 'Senior Estimator',
        description: 'Advanced estimation capabilities with approval authority',
        hourlyRate: 95.00,
        permissions: {
          estimation: ['view', 'create', 'edit', 'approve'],
          projects: ['view', 'create', 'edit'],
          materials: ['view', 'edit'],
          financial: ['view'],
          reports: ['view', 'create']
        }
      },
      {
        name: 'Estimator',
        description: 'Standard estimation and quoting capabilities',
        hourlyRate: 75.00,
        permissions: {
          estimation: ['view', 'create', 'edit'],
          projects: ['view', 'edit'],
          materials: ['view'],
          reports: ['view']
        }
      },
      {
        name: 'Project Manager',
        description: 'Project coordination and management',
        hourlyRate: 90.00,
        permissions: {
          projects: ['view', 'create', 'edit', 'manage'],
          estimation: ['view'],
          materials: ['view'],
          users: ['view'],
          reports: ['view', 'create']
        }
      },
      {
        name: 'Production Manager',
        description: 'Manufacturing and fabrication oversight',
        hourlyRate: 85.00,
        permissions: {
          projects: ['view', 'edit'],
          materials: ['view', 'edit', 'manage'],
          production: ['view', 'manage'],
          quality: ['view', 'manage'],
          reports: ['view', 'create']
        }
      },
      {
        name: 'Senior Welder / Fabricator',
        description: 'Advanced fabrication with quality control responsibilities',
        hourlyRate: 85.00,
        permissions: {
          projects: ['view'],
          materials: ['view'],
          production: ['view', 'edit'],
          quality: ['view', 'perform'],
          reports: ['view']
        }
      },
      {
        name: 'Welder / Fabricator',
        description: 'Standard fabrication and production work',
        hourlyRate: 75.00,
        permissions: {
          projects: ['view'],
          materials: ['view'],
          production: ['view'],
          reports: ['view']
        }
      },
      {
        name: 'Quality Inspector',
        description: 'Quality control and inspection authority',
        hourlyRate: 70.00,
        permissions: {
          projects: ['view'],
          materials: ['view'],
          production: ['view'],
          quality: ['view', 'perform', 'manage'],
          reports: ['view', 'create']
        }
      },
      {
        name: 'Business Development Manager',
        description: 'Client relations and business growth',
        hourlyRate: 85.00,
        permissions: {
          projects: ['view', 'create'],
          estimation: ['view', 'create'],
          clients: ['view', 'create', 'edit', 'manage'],
          reports: ['view', 'create']
        }
      }
    ];
    
    for (const role of roles) {
      try {
        await client.query(`
          INSERT INTO roles (name, description, permissions, hourly_rate, is_system_role)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            permissions = EXCLUDED.permissions,
            hourly_rate = EXCLUDED.hourly_rate,
            is_system_role = EXCLUDED.is_system_role
        `, [role.name, role.description, JSON.stringify(role.permissions), role.hourlyRate, false]);
        console.log(`✅ Created/updated role: ${role.name} ($${role.hourlyRate}/hr)`);
      } catch (error) {
        console.log(`❌ Error creating role ${role.name}:`, error.message);
      }
    }
    
    // Verify the fix
    console.log("\n📊 Verification...");
    
    const roleCount = await client.query('SELECT COUNT(*) FROM roles');
    const deptCount = await client.query('SELECT COUNT(*) FROM departments');
    
    console.log(`✅ Total roles: ${roleCount.rows[0].count}`);
    console.log(`✅ Total departments: ${deptCount.rows[0].count}`);
    
    console.log("\n🎉 Database schema fixed successfully!");
    console.log("The Team Management page should now work properly.");
    
  } catch (error) {
    console.error("❌ Error fixing database schema:", error);
    throw error;
  } finally {
    client.release();
  }
}

fixDatabaseSchema();
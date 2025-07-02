/**
 * Fix database schema issues for team management
 */

import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

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
    
    // Fix roles table - ensure all needed columns exist
    console.log("\n🔄 Updating roles table...");
    
    // Add missing columns to roles table
    const roleColumns = [
      'ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN DEFAULT false',
      'ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()'
    ];
    
    for (const sql of roleColumns) {
      try {
        await client.query(sql);
        console.log(`✅ Updated roles table structure`);
      } catch (error) {
        console.log(`⚠️ Column may already exist: ${error.message}`);
      }
    }
    
    // Fix departments table
    console.log("\n🔄 Updating departments table...");
    
    const deptColumns = [
      'ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_user_id INTEGER REFERENCES users(id)',
      'ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true',
      'ALTER TABLE departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()'
    ];
    
    for (const sql of deptColumns) {
      try {
        await client.query(sql);
        console.log(`✅ Updated departments table structure`);
      } catch (error) {
        console.log(`⚠️ Column may already exist: ${error.message}`);
      }
    }
    
    // Create departments
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
        console.log(`❌ Error with department ${dept.name}:`, error.message);
      }
    }
    
    // Create roles
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
            hourly_rate = EXCLUDED.hourly_rate
        `, [role.name, role.description, JSON.stringify(role.permissions), role.hourlyRate, false]);
        console.log(`✅ Created/updated role: ${role.name} ($${role.hourlyRate}/hr)`);
      } catch (error) {
        console.log(`❌ Error with role ${role.name}:`, error.message);
      }
    }
    
    // Verify the results
    console.log("\n📊 Verification...");
    
    const roleCount = await client.query('SELECT COUNT(*) FROM roles');
    const deptCount = await client.query('SELECT COUNT(*) FROM departments');
    
    console.log(`✅ Total roles: ${roleCount.rows[0].count}`);
    console.log(`✅ Total departments: ${deptCount.rows[0].count}`);
    
    console.log("\n🎉 Database schema fixed successfully!");
    
  } catch (error) {
    console.error("❌ Error fixing database schema:", error);
    throw error;
  } finally {
    client.release();
  }
}

fixDatabaseSchema();
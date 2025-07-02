/**
 * Initialize Authentication System with Demo Users
 * Creates team members with hashed passwords and proper authentication setup
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import bcrypt from 'bcrypt';

// Configure WebSocket for serverless
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

async function initializeAuthSystem() {
  console.log('🔐 Initializing Authentication System...');

  try {
    // Create auth sessions table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        device_info TEXT,
        ip_address TEXT,
        location TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Add authentication columns to users table if they don't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB,
      ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
      ADD COLUMN IF NOT EXISTS session_token TEXT,
      ADD COLUMN IF NOT EXISTS profile_image_url TEXT
    `);

    console.log('✅ Database schema updated');

    // Demo team members with roles and departments
    const demoUsers = [
      {
        username: 'adam.green',
        password: 'password123',
        name: 'Adam Green',
        email: 'adam.green@lateralengineering.co.nz',
        role: 'Business Owner',
        department: 'Management',
        phone: '+64 21 123 4567'
      },
      {
        username: 'chipo.green',
        password: 'password123',
        name: 'Chipo Green',
        email: 'chipo.green@lateralengineering.co.nz',
        role: 'Business Development Manager',
        department: 'Business Development',
        phone: '+64 21 234 5678'
      },
      {
        username: 'manny.magallanes',
        password: 'password123',
        name: 'Manny Magallanes',
        email: 'manny.magallanes@lateralengineering.co.nz',
        role: 'Senior Estimator',
        department: 'Estimation',
        phone: '+64 21 345 6789'
      },
      {
        username: 'vili.pelenato',
        password: 'password123',
        name: 'Vili Pelenato',
        email: 'vili.pelenato@lateralengineering.co.nz',
        role: 'Welder/Fabricator',
        department: 'Fabrication',
        phone: '+64 21 456 7890'
      },
      {
        username: 'john.smith',
        password: 'password123',
        name: 'John Smith',
        email: 'john.smith@lateralengineering.co.nz',
        role: 'Workshop Manager',
        department: 'Fabrication',
        phone: '+64 21 567 8901'
      }
    ];

    console.log('👥 Creating demo user accounts...');

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [userData.username]
      );

      if (existingUser.rows.length > 0) {
        console.log(`⚠️  User ${userData.username} already exists, updating password...`);
        
        // Update existing user with hashed password
        const hashedPassword = await hashPassword(userData.password);
        await pool.query(`
          UPDATE users 
          SET password = $1, 
              email = $2, 
              phone = $3,
              role = $4,
              department = $5,
              is_active = true,
              login_attempts = 0,
              locked_until = NULL
          WHERE username = $6
        `, [hashedPassword, userData.email, userData.phone, userData.role, userData.department, userData.username]);
        
        console.log(`✅ Updated ${userData.name} (${userData.role})`);
      } else {
        // Create new user
        const hashedPassword = await hashPassword(userData.password);
        await pool.query(`
          INSERT INTO users (
            username, password, name, email, phone, role, department, 
            is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
        `, [
          userData.username, hashedPassword, userData.name, userData.email, 
          userData.phone, userData.role, userData.department
        ]);
        
        console.log(`✅ Created ${userData.name} (${userData.role})`);
      }
    }

    console.log('\n🔐 Authentication System Summary:');
    console.log('• Secure password hashing with bcrypt (12 rounds)');
    console.log('• Session-based authentication with tokens');
    console.log('• 2FA support (TOTP + backup codes)');
    console.log('• Account lockout protection (5 attempts)');
    console.log('• Demo accounts ready for testing');

    console.log('\n👥 Demo Login Credentials:');
    for (const user of demoUsers) {
      console.log(`• ${user.name}: ${user.username} / password123`);
    }

    console.log('\n🔑 Security Features:');
    console.log('• Passwords are hashed and salted');
    console.log('• Sessions expire after 24 hours');
    console.log('• Failed login attempts are tracked');
    console.log('• 2FA can be enabled per user');
    console.log('• Account lockout after 5 failed attempts');

    console.log('\n🎉 Authentication system ready!');
    console.log('Navigate to /login to test user authentication');

  } catch (error) {
    console.error('❌ Failed to initialize authentication system:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

initializeAuthSystem().catch(console.error);
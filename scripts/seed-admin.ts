import * as bcrypt from 'bcrypt';
import { db } from '../server/db';
import { users, roles } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function seedAdmin() {
  try {
    console.log('🌱 Starting admin user seed...');
    
    // Check if admin role exists
    const existingRole = await db.select().from(roles).where(eq(roles.name, 'Admin')).limit(1);
    
    let adminRoleId: number;
    if (existingRole.length === 0) {
      // Create admin role
      const newRole = await db.insert(roles).values({
        name: 'Admin',
        description: 'Administrator with full system access',
        permissions: {
          all: true  // Full access
        },
        hourlyRate: '150.00',
        createdAt: new Date()
      }).returning();
      adminRoleId = newRole[0].id;
      console.log('✅ Admin role created');
    } else {
      adminRoleId = existingRole[0].id;
      console.log('ℹ️ Admin role already exists');
    }
    
    // Check if admin user exists
    const existingAdmin = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
    
    if (existingAdmin.length === 0) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.insert(users).values({
        username: 'admin',
        email: 'admin@lateral.com.au',
        passwordHash: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        roleId: adminRoleId,
        departmentId: null,
        isActive: true,
        createdAt: new Date()
      });
      
      console.log('✅ Admin user created');
      console.log('');
      console.log('📝 Login credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('');
      console.log('⚠️  IMPORTANT: Change this password immediately after first login!');
    } else {
      console.log('ℹ️ Admin user already exists');
      console.log('   Username: admin');
      console.log('   (Use existing password)');
    }
    
    console.log('\n✅ Admin seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdmin();
import * as bcrypt from 'bcrypt';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function fixAdminPassword() {
  try {
    console.log('🔧 Fixing admin user password...');
    
    // Generate hash for admin123
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Update the admin user's password
    const result = await db.update(users)
      .set({ 
        password: hashedPassword,
        loginAttempts: 0,
        lockedUntil: null 
      })
      .where(eq(users.username, 'admin'))
      .returning();
    
    if (result.length > 0) {
      console.log('✅ Admin password updated successfully');
      console.log('');
      console.log('📝 Login credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    } else {
      console.log('❌ Admin user not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing admin password:', error);
    process.exit(1);
  }
}

fixAdminPassword();
import bcrypt from 'bcrypt';
import { db } from '../server/db';
import { users } from '../shared/schema';

async function resetPasswords() {
  try {
    // Hash the new password
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update all user passwords
    const result = await db
      .update(users)
      .set({ password: hashedPassword })
      .returning({ id: users.id, email: users.email });
    
    console.log('Password reset complete for users:');
    result.forEach(user => {
      console.log(`- ${user.email || 'User ID ' + user.id}`);
    });
    
    console.log('\nAll passwords have been reset to: password123');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting passwords:', error);
    process.exit(1);
  }
}

resetPasswords();
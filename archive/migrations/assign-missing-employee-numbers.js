/**
 * Assign missing employee numbers to existing team members
 * Ensure consistency across all team members
 */

import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, isNull, or } from 'drizzle-orm';
import { teamMembers } from './shared/schema.ts';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema: { teamMembers } });

/**
 * Generate next employee number based on current year
 */
async function generateNextEmployeeNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `EMP${currentYear}`;
  
  // Get all existing employee numbers for this year
  const existingNumbers = await db
    .select({ employeeNumber: teamMembers.employeeNumber })
    .from(teamMembers);
  
  const yearNumbers = existingNumbers
    .map(row => row.employeeNumber)
    .filter(num => num && num.startsWith(prefix))
    .map(num => parseInt(num.substring(prefix.length)))
    .filter(num => !isNaN(num));
  
  const nextNumber = yearNumbers.length > 0 ? Math.max(...yearNumbers) + 1 : 1;
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

async function assignMissingEmployeeNumbers() {
  console.log('🔍 Checking for team members without employee numbers...');
  
  // Find team members without employee numbers
  const allMembers = await db
    .select()
    .from(teamMembers);
  
  const membersWithoutNumbers = allMembers.filter(member => 
    !member.employeeNumber || member.employeeNumber.trim() === ''
  );
  
  console.log(`Found ${membersWithoutNumbers.length} team members without employee numbers`);
  
  for (const member of membersWithoutNumbers) {
    const employeeNumber = await generateNextEmployeeNumber();
    
    await db
      .update(teamMembers)
      .set({ 
        employeeNumber,
        updatedAt: new Date()
      })
      .where(eq(teamMembers.id, member.id));
    
    console.log(`✅ Assigned ${employeeNumber} to ${member.firstName} ${member.lastName}`);
  }
  
  // Verify all members now have employee numbers
  const verifyMembers = await db
    .select({
      id: teamMembers.id,
      firstName: teamMembers.firstName,
      lastName: teamMembers.lastName,
      employeeNumber: teamMembers.employeeNumber
    })
    .from(teamMembers);
  
  console.log('\n📋 Current Employee Numbers:');
  verifyMembers.forEach(member => {
    console.log(`${member.employeeNumber} - ${member.firstName} ${member.lastName}`);
  });
}

async function main() {
  try {
    await assignMissingEmployeeNumbers();
    console.log('\n✅ Employee number assignment complete');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();
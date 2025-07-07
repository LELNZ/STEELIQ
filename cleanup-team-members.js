/**
 * Clean up team members with null names and ensure proper employee numbers
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

async function cleanupTeamMembers() {
  console.log('🧹 Cleaning up team members...');
  
  // Delete team members with null or empty names
  const deletedMembers = await db
    .delete(teamMembers)
    .where(or(
      isNull(teamMembers.firstName),
      isNull(teamMembers.lastName),
      eq(teamMembers.firstName, ''),
      eq(teamMembers.lastName, '')
    ))
    .returning();
  
  console.log(`🗑️ Deleted ${deletedMembers.length} invalid team members`);
  
  // List remaining team members
  const remainingMembers = await db
    .select({
      id: teamMembers.id,
      firstName: teamMembers.firstName,
      lastName: teamMembers.lastName,
      employeeNumber: teamMembers.employeeNumber
    })
    .from(teamMembers);
  
  console.log('\n📋 Remaining Team Members:');
  remainingMembers.forEach(member => {
    console.log(`${member.employeeNumber || 'NO-NUMBER'} - ${member.firstName} ${member.lastName}`);
  });
}

async function main() {
  try {
    await cleanupTeamMembers();
    console.log('\n✅ Team cleanup complete');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();
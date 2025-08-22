const { db } = require('./server/db.js');
const { laborAllowances } = require('./shared/schema.js');
const { eq } = require('drizzle-orm');

async function test() {
  const result = await db.select().from(laborAllowances).where(eq(laborAllowances.id, 10));
  console.log('Result:', JSON.stringify(result[0], null, 2));
}

test().catch(console.error).finally(() => process.exit());

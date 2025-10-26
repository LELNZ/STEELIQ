import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// In dev, you might have dotenv; in prod, rely on Replit/Secrets
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Use a pooled connection (tunable via env)
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  min: Number(process.env.DB_POOL_MIN ?? 0),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30000),
});

export const db = drizzle(pool);
export default db;

import { Pool } from "pg";

const globalForPostgres = globalThis as typeof globalThis & { plannerPool?: Pool };

export function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não está configurado.");
  if (!globalForPostgres.plannerPool) {
    globalForPostgres.plannerPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForPostgres.plannerPool;
}

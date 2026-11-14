import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Defina DATABASE_URL antes de executar as migrações.");

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS planner_data (
      user_id TEXT PRIMARY KEY NOT NULL,
      data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("Banco PostgreSQL preparado.");
} finally {
  await pool.end();
}

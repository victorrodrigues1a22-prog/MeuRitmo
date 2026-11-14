if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL é obrigatório em produção. Configure a URL do PostgreSQL no Render.");
}

if (process.env.DATABASE_URL) {
  await import("./migrate-postgres.mjs");
} else {
  console.warn("DATABASE_URL não definido; iniciando em modo local, sem sincronização entre dispositivos.");
}

await import("../dist/standalone/server.js");

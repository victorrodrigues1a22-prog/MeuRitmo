import { spawn } from "node:child_process";

if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL é obrigatório em produção. Configure a URL do PostgreSQL no Render.");
}

if (process.env.DATABASE_URL) {
  await import("./migrate-postgres.mjs");
} else {
  console.warn("DATABASE_URL não definido; iniciando em modo local, sem sincronização entre dispositivos.");
}

const server = spawn(process.execPath, ["node_modules/vinext/dist/cli.js", "start"], {
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

const exitCode = await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
});

process.exitCode = exitCode;

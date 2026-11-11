import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type PlannerData = {
  tasks?: unknown;
  notices?: unknown;
  profile?: unknown;
  theme?: unknown;
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function authenticatedUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  if (!env.DB) throw new Error("O armazenamento da conta ainda não está disponível.");
  return user;
}

export async function GET() {
  const user = await authenticatedUser();
  if (!user) return json({ error: "É necessário entrar com uma conta ChatGPT." }, 401);

  const row = await env.DB!.prepare(
    "SELECT data_json FROM planner_data WHERE user_id = ?1",
  ).bind(user.userId).first<{ data_json: string }>();

  let data: PlannerData | null = null;
  if (row?.data_json) {
    try {
      data = JSON.parse(row.data_json) as PlannerData;
    } catch {
      return json({ error: "Os dados salvos estão inválidos." }, 500);
    }
  }
  return json({ userId: user.userId, data });
}

export async function PUT(request: Request) {
  const user = await authenticatedUser();
  if (!user) return json({ error: "É necessário entrar com uma conta ChatGPT." }, 401);

  const body = await readObject(request);
  if (body instanceof Response) return body;
  const data = sanitizeData(body);
  if (data instanceof Response) return data;

  await env.DB!.prepare(`
    INSERT INTO planner_data (user_id, data_json, updated_at)
    VALUES (?1, ?2, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(user.userId, JSON.stringify(data)).run();
  return json({ ok: true });
}

export async function PATCH(request: Request) {
  const user = await authenticatedUser();
  if (!user) return json({ error: "É necessário entrar com uma conta ChatGPT." }, 401);

  const body = await readObject(request);
  if (body instanceof Response) return body;
  const patch = sanitizeData(body);
  if (patch instanceof Response) return patch;

  const row = await env.DB!.prepare(
    "SELECT data_json FROM planner_data WHERE user_id = ?1",
  ).bind(user.userId).first<{ data_json: string }>();
  let current: PlannerData = {};
  try {
    if (row?.data_json) current = JSON.parse(row.data_json) as PlannerData;
  } catch {
    return json({ error: "Os dados salvos estão inválidos." }, 500);
  }
  const merged = { ...current, ...patch };

  await env.DB!.prepare(`
    INSERT INTO planner_data (user_id, data_json, updated_at)
    VALUES (?1, ?2, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at
  `).bind(user.userId, JSON.stringify(merged)).run();
  return json({ ok: true });
}

async function readObject(request: Request): Promise<Record<string, unknown> | Response> {
  const text = await request.text();
  if (text.length > 900_000) return json({ error: "Os dados enviados excedem o limite seguro." }, 413);
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return json({ error: "Formato de dados inválido." }, 400);
    }
    return value as Record<string, unknown>;
  } catch {
    return json({ error: "Formato de dados inválido." }, 400);
  }
}

function sanitizeData(value: Record<string, unknown>): PlannerData | Response {
  const allowed = new Set(["tasks", "notices", "profile", "theme"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return json({ error: "O conteúdo enviado contém campos não permitidos." }, 400);
  }
  if (value.tasks !== undefined && !Array.isArray(value.tasks)) return json({ error: "Lista de tarefas inválida." }, 400);
  if (value.notices !== undefined && !Array.isArray(value.notices)) return json({ error: "Lista de lembretes inválida." }, 400);
  if (value.profile !== undefined && (!value.profile || typeof value.profile !== "object" || Array.isArray(value.profile))) {
    return json({ error: "Perfil inválido." }, 400);
  }
  if (value.theme !== undefined && value.theme !== "light" && value.theme !== "dark") {
    return json({ error: "Tema inválido." }, 400);
  }
  return value as PlannerData;
}

import { getAuthenticatedUser } from "../../auth";
import { getPool } from "../../../db/index";

export const dynamic = "force-dynamic";

type PlannerData = {
  tasks?: unknown;
  studied?: unknown;
  notices?: unknown;
  profile?: unknown;
  theme?: unknown;
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function authenticatedUser() {
  return getAuthenticatedUser();
}

export async function GET() {
  const user = await authenticatedUser();
  if (!user) return json({ error: "É necessário entrar com uma conta Google." }, 401);
  if (isLocalOnly()) return json({ userId: user.userId, data: null, localOnly: true });

  const result = await getPool().query<{ data_json: PlannerData }>(
    "SELECT data_json FROM planner_data WHERE user_id = $1",
    [user.userId],
  );

  const data = result.rows[0]?.data_json ?? null;
  return json({ userId: user.userId, data });
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Origem da solicitação inválida." }, 403);
  const user = await authenticatedUser();
  if (!user) return json({ error: "É necessário entrar com uma conta Google." }, 401);

  const body = await readObject(request);
  if (body instanceof Response) return body;
  const data = sanitizeData(body);
  if (data instanceof Response) return data;
  if (isLocalOnly()) return json({ ok: true, localOnly: true });

  await getPool().query(`
    INSERT INTO planner_data (user_id, data_json, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT(user_id) DO UPDATE SET data_json = EXCLUDED.data_json, updated_at = NOW()
  `, [user.userId, JSON.stringify(data)]);
  return json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Origem da solicitação inválida." }, 403);
  const user = await authenticatedUser();
  if (!user) return json({ error: "É necessário entrar com uma conta Google." }, 401);

  const body = await readObject(request);
  if (body instanceof Response) return body;
  const patch = sanitizeData(body);
  if (patch instanceof Response) return patch;
  if (isLocalOnly()) return json({ ok: true, localOnly: true });

  await getPool().query(`
    INSERT INTO planner_data (user_id, data_json, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT(user_id) DO UPDATE SET
      data_json = planner_data.data_json || EXCLUDED.data_json,
      updated_at = NOW()
  `, [user.userId, JSON.stringify(patch)]);
  return json({ ok: true });
}

function isLocalOnly() {
  return process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const expected = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
    return new URL(origin).origin === (expected ? new URL(expected).origin : new URL(request.url).origin);
  } catch {
    return false;
  }
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
  const allowed = new Set(["tasks", "studied", "notices", "profile", "theme"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    return json({ error: "O conteúdo enviado contém campos não permitidos." }, 400);
  }
  if (value.tasks !== undefined && !Array.isArray(value.tasks)) return json({ error: "Lista de tarefas inválida." }, 400);
  if (value.studied !== undefined && !Array.isArray(value.studied)) return json({ error: "Lista de assuntos estudados inválida." }, 400);
  if (value.notices !== undefined && !Array.isArray(value.notices)) return json({ error: "Lista de lembretes inválida." }, 400);
  if (value.profile !== undefined && (!value.profile || typeof value.profile !== "object" || Array.isArray(value.profile))) {
    return json({ error: "Perfil inválido." }, 400);
  }
  if (value.theme !== undefined && value.theme !== "light" && value.theme !== "dark") {
    return json({ error: "Tema inválido." }, 400);
  }
  return value as PlannerData;
}

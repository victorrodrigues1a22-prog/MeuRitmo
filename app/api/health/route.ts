import { getPool } from "../../../db/index";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL) {
    return Response.json({ status: "ok", storage: "local-only" }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    await getPool().query("SELECT 1");
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "../../../auth";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(SESSION_COOKIE, signSession({ userId: "dev:sample", email: "estudante@exemplo.local", displayName: "Conta de demonstração" }), sessionCookieOptions());
  return response;
}

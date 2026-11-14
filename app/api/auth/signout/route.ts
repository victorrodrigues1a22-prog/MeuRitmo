import { NextResponse } from "next/server";
import { appUrl, SESSION_COOKIE, sessionCookieOptions } from "../../../auth";

export async function GET(request: Request) {
  const target = new URL("/login", appUrl(request));
  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}

import { NextResponse } from "next/server";
import { appUrl, SESSION_COOKIE, sessionCookieOptions, signSession } from "../../../../auth";

export const dynamic = "force-dynamic";

const stateCookie = "rotinamed.oauth-state";
const verifierCookie = "rotinamed.oauth-verifier";
const clearOAuthCookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 0 };

function loginError(request: Request, code: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(code)}`, appUrl(request)));
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(stateCookie, "", clearOAuthCookie);
  response.cookies.set(verifierCookie, "", clearOAuthCookie);
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieStore = request.headers.get("cookie") || "";
  const state = readCookie(cookieStore, stateCookie);
  const verifier = readCookie(cookieStore, verifierCookie);
  if (url.searchParams.has("error")) return loginError(request, "google_cancelled");
  if (!code || !returnedState || !state || returnedState !== state || !verifier) {
    return loginError(request, "google_invalid_state");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return loginError(request, "google_not_configured");
  const redirectUri = `${appUrl(request)}/api/auth/callback/google`;

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
      cache: "no-store",
    });
    const token = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) return loginError(request, "google_token_failed");

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!profileResponse.ok || !profile.sub || !profile.email || !profile.email_verified) {
      return loginError(request, "google_profile_failed");
    }

    const response = NextResponse.redirect(new URL("/", appUrl(request)));
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(SESSION_COOKIE, signSession({
      userId: `google:${profile.sub}`,
      email: profile.email.toLowerCase(),
      displayName: profile.name || profile.email,
    }), sessionCookieOptions());
    response.cookies.set(stateCookie, "", clearOAuthCookie);
    response.cookies.set(verifierCookie, "", clearOAuthCookie);
    return response;
  } catch {
    return loginError(request, "google_connection_failed");
  }
}

function readCookie(header: string, name: string) {
  const prefix = `${name}=`;
  const item = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item ? item.slice(prefix.length) : null;
}

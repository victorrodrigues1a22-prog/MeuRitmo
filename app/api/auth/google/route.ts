import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { appUrl } from "../../../auth";

export const dynamic = "force-dynamic";

const stateCookie = "rotinamed.oauth-state";
const verifierCookie = "rotinamed.oauth-verifier";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/login?error=google_not_configured", request.url));

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const redirectUri = `${appUrl(request)}/api/auth/callback/google`;
  const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorization.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    access_type: "online",
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(authorization);
  response.headers.set("Cache-Control", "no-store");
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  response.cookies.set(stateCookie, state, options);
  response.cookies.set(verifierCookie, verifier, options);
  return response;
}

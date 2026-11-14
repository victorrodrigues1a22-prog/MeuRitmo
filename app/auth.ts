import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export type AuthenticatedUser = {
  userId: string;
  displayName: string;
  email: string;
};

export const SESSION_COOKIE = "rotinamed.session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

type SessionPayload = AuthenticatedUser & { expiresAt: number };

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "local-only-development-secret-change-me";
  throw new Error("AUTH_SECRET não está configurado.");
}

export function signSession(user: AuthenticatedUser) {
  const payload: SessionPayload = { ...user, expiresAt: Date.now() + SESSION_MAX_AGE * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", authSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySession(value: string | undefined): AuthenticatedUser | null {
  if (!value) return null;
  const [encoded, signature, extra] = value.split(".");
  if (!encoded || !signature || extra) return null;
  try {
    const expected = createHmac("sha256", authSecret()).update(encoded).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || !payload.email || !payload.expiresAt || payload.expiresAt <= Date.now()) return null;
    return {
      userId: payload.userId,
      email: payload.email,
      displayName: payload.displayName || payload.email,
    };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser() {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function appUrl(request?: Request) {
  const configured = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV !== "production" && request) return new URL(request.url).origin;
  throw new Error("APP_URL não está configurado.");
}

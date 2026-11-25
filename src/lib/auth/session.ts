import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

const COOKIE = "ar_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function secret(): string {
  return process.env.AUTH_SECRET || "dev-only-auditready-subs-change-me";
}

export function signSession(contractorId: string, exp: number): string {
  const body = Buffer.from(JSON.stringify({ contractorId, exp })).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readSignedSession(token: string | undefined, now: number): string | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      contractorId?: string;
      exp?: number;
    };
    if (!payload.contractorId || !payload.exp || payload.exp < now) return null;
    return payload.contractorId;
  } catch {
    return null;
  }
}

export async function setSession(contractorId: string) {
  await connection();
  const jar = await cookies();
  jar.set(COOKIE, signSession(contractorId, Date.now() + THIRTY_DAYS * 1000), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function sessionContractorId(): Promise<string | null> {
  await connection();
  const jar = await cookies();
  return readSignedSession(jar.get(COOKIE)?.value, Date.now());
}

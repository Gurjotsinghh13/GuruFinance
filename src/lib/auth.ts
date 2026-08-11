// ============================================================
// AUTHENTICATION
// Session-based auth using JWT cookies.
// No NextAuth dependency — lightweight and fully controlled.
// ============================================================

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types";
import { redirect } from "next/navigation";
import { getJwtSecretBytes } from "@/lib/session-secret";

const COOKIE_NAME = "loanbook_session";
const SESSION_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

// ============================================================
// CREATE SESSION TOKEN
// ============================================================

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    tokenVersion: user.tokenVersion ?? 1,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getJwtSecretBytes());
}

// ============================================================
// SET SESSION COOKIE
// ============================================================

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

// ============================================================
// GET SESSION (from cookie)
// ============================================================

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

// ============================================================
// REQUIRE AUTH (for server components and actions)
// Redirects to login if not authenticated or session invalidated.
// ============================================================

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.tokenVersion !== undefined) {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { tokenVersion: true, isActive: true },
    });

    if (!user || !user.isActive || user.tokenVersion !== session.tokenVersion) {
      await clearSession();
      redirect("/login");
    }
  }

  return session;
}

// ============================================================
// CLEAR SESSION
// ============================================================

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ============================================================
// HASH PASSWORD (using Web Crypto API — works on Vercel Edge)
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

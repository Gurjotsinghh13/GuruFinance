"use server";

// ============================================================
// AUTH SERVER ACTIONS
// ============================================================

import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSession,
  getSession,
} from "@/lib/auth";
import { AuditAction } from "@prisma/client";
import { redirect } from "next/navigation";
import { generateResetToken, hashResetToken } from "@/utils";
import { checkRateLimit } from "@/lib/rate-limit";

// ============================================================
// LOGIN
// ============================================================

export async function loginAction(formData: FormData): Promise<{
  error?: string;
}> {
  const rawMobile = formData.get("mobile") as string;
  const password = formData.get("password") as string;

  if (!rawMobile || !password) {
    return { error: "Mobile number and password are required" };
  }

  const mobile = rawMobile.trim().replace(/[\s\-\(\)]/g, "");
  const rateLimit = checkRateLimit(`login:${mobile}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      error: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { mobile } });

  if (!user || !user.isActive) {
    return { error: "Invalid mobile number or password" };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: "Invalid mobile number or password" };
  }

  const token = await createSessionToken({
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  await setSessionCookie(token);

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Audit
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: AuditAction.USER_LOGIN,
      entityType: "User",
      entityId: user.id,
    },
  });

  redirect("/dashboard");
}

// ============================================================
// LOGOUT
// ============================================================

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) {
    await prisma.auditLog.create({
      data: {
        userId: session.id,
        action: AuditAction.USER_LOGOUT,
        entityType: "User",
        entityId: session.id,
      },
    });
  }
  await clearSession();
  redirect("/login");
}

// ============================================================
// CHANGE PASSWORD
// ============================================================

export async function changePasswordAction(formData: FormData): Promise<{
  error?: string;
  success?: boolean;
}> {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match" };
  }

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) return { error: "User not found" };

  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) return { error: "Current password is incorrect" };

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: session.id },
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: AuditAction.PASSWORD_CHANGED,
      entityType: "User",
      entityId: session.id,
    },
  });

  return { success: true };
}

// ============================================================
// FORGOT PASSWORD (generates reset token)
// ============================================================

export async function forgotPasswordAction(rawMobile: string): Promise<{
  error?: string;
  success?: boolean;
  token?: string; // In production, send via SMS
}> {
  if (!rawMobile) {
    return { success: true };
  }

  const mobile = rawMobile.trim().replace(/[\s\-\(\)]/g, "");
  const rateLimit = checkRateLimit(`forgot:${mobile}`, 3, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      error: `Too many password reset requests. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { mobile } });

  // Always return success to prevent enumeration
  if (!user) return { success: true };

  const rawToken = generateResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: tokenHash,
      resetTokenExpiry: expiry,
    },
  });

  // In production: send via SMS gateway
  // For now: return token (show in dev only)
  return {
    success: true,
    token: process.env.NODE_ENV === "development" ? rawToken : undefined,
  };
}

// ============================================================
// RESET PASSWORD
// ============================================================

export async function resetPasswordAction(
  rawToken: string,
  newPassword: string
): Promise<{ error?: string; success?: boolean }> {
  if (!rawToken || !newPassword) {
    return { error: "Invalid parameters" };
  }

  const tokenHash = hashResetToken(rawToken.trim());
  const rateLimit = checkRateLimit(`reset:${tokenHash}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      error: `Too many reset attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: tokenHash,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) return { error: "Invalid or expired reset token" };

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 },
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return { success: true };
}

// ============================================================
// REGISTER
// ============================================================

export async function registerAction(formData: FormData): Promise<{
  error?: string;
}> {
  const name = (formData.get("name") as string)?.trim();
  const rawMobile = formData.get("mobile") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!name || name.length < 2) {
    return { error: "Full name must be at least 2 characters long" };
  }

  const mobile = rawMobile ? rawMobile.trim().replace(/[\s\-\(\)]/g, "") : "";
  if (!mobile || mobile.length < 10) {
    return { error: "Please enter a valid mobile number (at least 10 digits)" };
  }

  const rateLimit = checkRateLimit(`register:${mobile}`, 3, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      error: `Too many registration attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters long" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const existingUser = await prisma.user.findUnique({ where: { mobile } });
  if (existingUser) {
    return { error: "An account with this mobile number already exists" };
  }

  const passwordHash = await hashPassword(password);
  let user;

  try {
    user = await prisma.user.create({
      data: {
        name,
        mobile,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        tokenVersion: 1,
      },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      return { error: "An account with this mobile number already exists" };
    }
    return { error: "Failed to create account. Please try again." };
  }

  const token = await createSessionToken({
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    tokenVersion: user.tokenVersion,
  });

  await setSessionCookie(token);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: AuditAction.USER_REGISTERED,
      entityType: "User",
      entityId: user.id,
      details: { method: "registration" },
    },
  });

  redirect("/dashboard");
}


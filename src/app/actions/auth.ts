"use server";

// ============================================================
// AUTH SERVER ACTIONS
// Authentication identifier: EMAIL + PASSWORD
// Mobile is stored as contact information only.
// ============================================================

import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSession,
  getSession,
  requireAuth,
} from "@/lib/auth";
import { AuditAction } from "@prisma/client";
import { redirect } from "next/navigation";
import { generateResetToken, hashResetToken, normalizeEmail } from "@/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

// ============================================================
// LOGIN
// ============================================================

export async function loginAction(formData: FormData): Promise<{
  error?: string;
}> {
  const rawEmail = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!rawEmail || !password) {
    return { error: "Email and password are required" };
  }

  const email = normalizeEmail(rawEmail);
  const rateLimit = checkRateLimit(`login:${email}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      error: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return { error: "Invalid email or password" };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { error: "Invalid email or password" };
  }

  const token = await createSessionToken({
    id: user.id,
    name: user.name,
    email: user.email!,
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
// FORGOT PASSWORD (generates reset token, delivers via email)
// ============================================================

export async function forgotPasswordAction(rawEmail: string): Promise<{
  error?: string;
  success?: boolean;
  token?: string; // In development only — never exposed in production
}> {
  if (!rawEmail) {
    return { success: true };
  }

  const email = normalizeEmail(rawEmail);

  // Basic email format guard
  if (!email.includes("@") || !email.includes(".")) {
    return { success: true }; // Silent — prevent enumeration
  }

  const rateLimit = checkRateLimit(`forgot-password:${email}`, 3, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      error: `Too many password reset requests. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

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

  await sendPasswordResetEmail(email, rawToken);

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
  const rateLimit = checkRateLimit(`reset-password:${tokenHash}`, 5, 15 * 60 * 1000);
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
  const rawEmail = formData.get("email") as string;
  const rawMobile = formData.get("mobile") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!name || name.length < 2) {
    return { error: "Full name must be at least 2 characters long" };
  }

  // Email validation
  const email = rawEmail ? normalizeEmail(rawEmail) : "";
  if (!email || !email.includes("@") || !email.includes(".") || email.length < 5) {
    return { error: "Please enter a valid email address" };
  }

  // Mobile validation (contact info, required)
  const mobile = rawMobile ? rawMobile.trim().replace(/[\s\-\(\)]/g, "") : "";
  if (!mobile || mobile.length < 10) {
    return { error: "Please enter a valid mobile number (at least 10 digits)" };
  }

  const rateLimit = checkRateLimit(`register:${email}`, 3, 15 * 60 * 1000);
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

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(password);
  let user;

  try {
    user = await prisma.user.create({
      data: {
        name,
        email,
        mobile,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        tokenVersion: 1,
      },
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      // Determine which unique field caused the conflict
      const target = err.meta?.target as string[] | undefined;
      if (target?.includes("email")) {
        return { error: "An account with this email already exists" };
      }
      if (target?.includes("mobile")) {
        return { error: "An account with this mobile number already exists" };
      }
      return { error: "An account with these details already exists" };
    }
    return { error: "Failed to create account. Please try again." };
  }

  const token = await createSessionToken({
    id: user.id,
    name: user.name,
    email: user.email!,
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

// ============================================================
// UPDATE ACCOUNT DETAILS (Name & Mobile Number)
// Email is NOT user-editable here — changing email is a separate
// security operation requiring re-verification.
// ============================================================

export async function updateAccountAction(formData: FormData): Promise<{
  error?: string;
  success?: boolean;
}> {
  const session = await requireAuth();

  const name = (formData.get("name") as string)?.trim();
  const rawMobile = (formData.get("mobile") as string)?.trim();

  if (!name || !rawMobile) {
    return { error: "Name and mobile number are required" };
  }

  const mobile = rawMobile.replace(/[\s\-\(\)]/g, "");
  if (!/^\d{10,15}$/.test(mobile)) {
    return { error: "Please enter a valid mobile number (10-15 digits)" };
  }

  // Check mobile uniqueness if changed
  const existing = await prisma.user.findUnique({ where: { mobile } });
  if (existing && existing.id !== session.id) {
    return { error: "This mobile number is already registered to another account" };
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.id },
    data: { name, mobile },
  });

  // Re-issue updated session cookie (name may have changed)
  const token = await createSessionToken({
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email!,
    role: updatedUser.role,
    tokenVersion: updatedUser.tokenVersion,
  });

  await setSessionCookie(token);

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: AuditAction.SETTINGS_UPDATED,
      entityType: "User",
      entityId: session.id,
      details: { field: "account_info" },
    },
  });

  return { success: true };
}

// ============================================================
// EXPORT USER PORTFOLIO DATA (CSV Format)
// ============================================================

export async function exportUserDataAction(): Promise<{
  error?: string;
  csvData?: string;
  filename?: string;
}> {
  const session = await requireAuth();

  const loans = await prisma.loan.findMany({
    where: { borrower: { userId: session.id } },
    include: {
      borrower: true,
      interestDues: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const escapeCsv = (val: string | number | boolean | null | undefined) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    // Prevent CSV Formula Injection
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }
    return `"${str}"`;
  };

  const headers = [
    "Loan Number",
    "Borrower Name",
    "Borrower Mobile",
    "Status",
    "Interest Type",
    "Principal Amount",
    "Interest Rate (%)",
    "Start Date",
  ];

  const rows = loans.map((l) => [
    escapeCsv(l.loanNumber),
    escapeCsv(l.borrower.fullName),
    escapeCsv(l.borrower.mobile),
    escapeCsv(l.status),
    escapeCsv(l.interestType),
    escapeCsv(Number(l.principalAmount)),
    escapeCsv(Number(l.interestRate)),
    escapeCsv(l.startDate.toISOString().split("T")[0]),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const filename = `loanbook_portfolio_${new Date().toISOString().split("T")[0]}.csv`;

  return { csvData: csvContent, filename };
}

// ============================================================
// EXISTING USER ONBOARDING (Migration Action)
// Allows pre-existing users without an email to prove ownership of
// their account using their registered mobile number + password,
// validate & normalize a new email address, update their User record,
// and issue an email-based session without changing their User ID.
// ============================================================

export async function setupAccountEmailAction(formData: FormData): Promise<{
  error?: string;
}> {
  const rawMobile = formData.get("mobile") as string;
  const password = formData.get("password") as string;
  const rawEmail = formData.get("email") as string;
  const rawConfirmEmail = formData.get("confirmEmail") as string;

  const mobile = rawMobile ? rawMobile.trim().replace(/[\s\-\(\)]/g, "") : "";
  if (!mobile || mobile.length < 10) {
    return { error: "Please enter a valid mobile number (at least 10 digits)" };
  }

  if (!password) {
    return { error: "Password is required" };
  }

  const rateLimit = checkRateLimit(`account-setup:${mobile}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return {
      error: `Too many setup attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
    };
  }

  // 1. Verify existing credentials securely
  const user = await prisma.user.findUnique({ where: { mobile } });
  if (!user || !user.isActive) {
    return { error: "Invalid mobile number or password" };
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    return { error: "Invalid mobile number or password" };
  }

  // 2. Validate email input
  const email = rawEmail ? normalizeEmail(rawEmail) : "";
  if (!email || !email.includes("@") || !email.includes(".") || email.length < 5) {
    return { error: "Please enter a valid email address" };
  }

  if (rawConfirmEmail && normalizeEmail(rawConfirmEmail) !== email) {
    return { error: "Email addresses do not match" };
  }

  // 3. Check email uniqueness across users
  const existingWithEmail = await prisma.user.findUnique({ where: { email } });
  if (existingWithEmail && existingWithEmail.id !== user.id) {
    return { error: "An account with this email address already exists" };
  }

  // 4. Update ONLY email on existing user record (preserving user.id & all financial relations)
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { email },
  });

  // 5. Audit event
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: AuditAction.SETTINGS_UPDATED,
      entityType: "User",
      entityId: user.id,
      details: { action: "email_onboarding", email },
    },
  });

  // 6. Issue email-based session cookie
  const token = await createSessionToken({
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email!,
    role: updatedUser.role,
    tokenVersion: updatedUser.tokenVersion,
  });

  await setSessionCookie(token);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  redirect("/dashboard");
}

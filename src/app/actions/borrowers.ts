"use server";

// ============================================================
// BORROWER SERVER ACTIONS
// ============================================================

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { CreateBorrowerInput, UpdateBorrowerInput } from "@/types";

// ============================================================
// CREATE BORROWER
// ============================================================

export async function createBorrowerAction(input: CreateBorrowerInput): Promise<{
  error?: string;
  borrowerId?: string;
}> {
  const session = await requireAuth();

  // Check for duplicate mobile
  const existing = await prisma.borrower.findFirst({
    where: { mobile: input.mobile, userId: session.id },
  });

  if (existing) {
    return { error: "A borrower with this mobile number already exists" };
  }

  const borrower = await prisma.borrower.create({
    data: {
      ...input,
      userId: session.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: AuditAction.BORROWER_CREATED,
      entityType: "Borrower",
      entityId: borrower.id,
      details: { fullName: borrower.fullName, mobile: borrower.mobile },
    },
  });

  revalidatePath("/borrowers");
  return { borrowerId: borrower.id };
}

// ============================================================
// UPDATE BORROWER
// ============================================================

export async function updateBorrowerAction(
  id: string,
  input: UpdateBorrowerInput
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAuth();

  const borrower = await prisma.borrower.findFirst({
    where: { id, userId: session.id },
  });

  if (!borrower) return { error: "Borrower not found" };

  await prisma.borrower.update({
    where: { id },
    data: input,
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: AuditAction.BORROWER_UPDATED,
      entityType: "Borrower",
      entityId: id,
      details: input,
    },
  });

  revalidatePath(`/borrowers/${id}`);
  revalidatePath("/borrowers");
  return { success: true };
}

// ============================================================
// ARCHIVE BORROWER
// ============================================================

export async function archiveBorrowerAction(
  id: string,
  reason?: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAuth();

  const borrower = await prisma.borrower.findFirst({
    where: { id, userId: session.id },
  });

  if (!borrower) return { error: "Borrower not found" };

  await prisma.borrower.update({
    where: { id },
    data: {
      isArchived: true,
      archivedAt: new Date(),
      archivedReason: reason,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: AuditAction.BORROWER_ARCHIVED,
      entityType: "Borrower",
      entityId: id,
      details: { reason },
    },
  });

  revalidatePath("/borrowers");
  return { success: true };
}

// ============================================================
// RESTORE BORROWER
// ============================================================

export async function restoreBorrowerAction(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAuth();

  const borrower = await prisma.borrower.findFirst({
    where: { id, userId: session.id },
  });

  if (!borrower) return { error: "Borrower not found" };

  await prisma.borrower.update({
    where: { id },
    data: {
      isArchived: false,
      archivedAt: null,
      archivedReason: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: AuditAction.BORROWER_RESTORED,
      entityType: "Borrower",
      entityId: id,
    },
  });

  revalidatePath("/borrowers");
  return { success: true };
}

// ============================================================
// GET BORROWERS LIST
// ============================================================

export async function getBorrowersAction(params?: {
  search?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const session = await requireAuth();

  const { search, includeArchived = false, page = 1, pageSize = 20 } = params || {};

  const where = {
    userId: session.id,
    isArchived: includeArchived ? undefined : false,
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { mobile: { contains: search } },
            { alternateMobile: { contains: search } },
          ],
        }
      : {}),
  };

  const [borrowers, total] = await Promise.all([
    prisma.borrower.findMany({
      where,
      include: {
        loans: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            status: true,
            currentPrincipal: true,
            interestDues: {
              where: { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
              select: { dueAmount: true, paidAmount: true, waivedAmount: true, status: true },
            },
          },
        },
        _count: { select: { loans: true } },
      },
      orderBy: { fullName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.borrower.count({ where }),
  ]);

  return { borrowers, total, page, pageSize };
}

// ============================================================
// GET SINGLE BORROWER WITH FULL LEDGER
// ============================================================

export async function getBorrowerLedgerAction(borrowerId: string) {
  const session = await requireAuth();

  const borrower = await prisma.borrower.findFirst({
    where: { id: borrowerId, userId: session.id },
    include: {
      loans: {
        include: {
          interestDues: { orderBy: { dueDate: "asc" } },
          payments: {
            include: {
              allocations: { include: { due: true } },
              cheque: true,
            },
            orderBy: { paymentDate: "desc" },
          },
          transactions: { orderBy: { transactionDate: "desc" } },
          cheques: { orderBy: { chequeDate: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      },
      messages: { orderBy: { sentAt: "desc" }, take: 50 },
    },
  });

  if (!borrower) return null;
  return borrower;
}

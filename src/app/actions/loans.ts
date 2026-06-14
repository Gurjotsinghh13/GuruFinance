"use server";

// ============================================================
// LOAN SERVER ACTIONS
// ============================================================

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { AuditAction, LoanStatus, TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateLoanNumber } from "@/utils";
import { generateDuesForLoan, stopDueGeneration } from "@/features/due-engine";
import { recordPrincipalRepayment, recordLoanTopUp } from "@/features/payment-engine";
import type { CreateLoanInput, PrincipalRepaymentInput, LoanTopUpInput } from "@/types";

// ============================================================
// CREATE LOAN
// ============================================================

export async function createLoanAction(input: CreateLoanInput): Promise<{
  error?: string;
  loanId?: string;
}> {
  const session = await requireAuth();

  // Verify borrower belongs to this user
  const borrower = await prisma.borrower.findFirst({
    where: { id: input.borrowerId, userId: session.id },
  });

  if (!borrower) return { error: "Borrower not found" };

  const loan = await prisma.loan.create({
    data: {
      loanNumber: generateLoanNumber(),
      borrowerId: input.borrowerId,
      principalAmount: input.principalAmount,
      currentPrincipal: input.principalAmount,
      interestRate: input.interestRate,
      interestType: input.interestType,
      loanFrequency: input.loanFrequency,
      compoundingRule: input.compoundingRule,
      startDate: input.startDate,
      dueDay: input.dueDay || new Date(input.startDate).getDate(),
      notes: input.notes,
      collateral: input.collateral,
      guarantorName: input.guarantorName,
      guarantorMobile: input.guarantorMobile,
      status: LoanStatus.ACTIVE,
    },
  });

  // Record initial disbursement transaction
  await prisma.loanTransaction.create({
    data: {
      loanId: loan.id,
      type: TransactionType.PRINCIPAL_DISBURSEMENT,
      amount: input.principalAmount,
      principalBefore: 0,
      principalAfter: input.principalAmount,
      notes: "Initial loan disbursement",
      transactionDate: input.startDate,
    },
  });

  // Generate dues for next 3 months
  await generateDuesForLoan(loan.id);

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: AuditAction.LOAN_CREATED,
      entityType: "Loan",
      entityId: loan.id,
      details: {
        loanNumber: loan.loanNumber,
        borrowerId: input.borrowerId,
        principal: input.principalAmount,
        interestRate: input.interestRate,
      },
    },
  });

  revalidatePath(`/borrowers/${input.borrowerId}`);
  revalidatePath("/loans");
  return { loanId: loan.id };
}

// ============================================================
// CLOSE LOAN
// ============================================================

export async function closeLoanAction(
  loanId: string,
  notes?: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAuth();

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { borrower: true },
  });

  if (!loan || loan.borrower.userId !== session.id) {
    return { error: "Loan not found" };
  }

  await prisma.loan.update({
    where: { id: loanId },
    data: {
      status: LoanStatus.CLOSED,
      closedAt: new Date(),
      notes: notes ? `${loan.notes || ""}\nClosed: ${notes}`.trim() : loan.notes,
    },
  });

  // Stop future due generation
  await stopDueGeneration(loanId);

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: AuditAction.LOAN_CLOSED,
      entityType: "Loan",
      entityId: loanId,
      details: { notes },
    },
  });

  revalidatePath(`/loans/${loanId}`);
  revalidatePath("/loans");
  return { success: true };
}

// ============================================================
// PRINCIPAL REPAYMENT (delegates to payment engine)
// ============================================================

export async function principalRepaymentAction(
  input: PrincipalRepaymentInput
): Promise<{ error?: string; newPrincipal?: number; loanClosed?: boolean }> {
  const session = await requireAuth();

  try {
    const loan = await prisma.loan.findFirst({
      where: {
        id: input.loanId,
        borrower: { userId: session.id },
      },
      select: { id: true },
    });

    if (!loan) return { error: "Loan not found" };

    const result = await recordPrincipalRepayment(input, session.id);
    revalidatePath(`/loans/${input.loanId}`);
    revalidatePath("/dashboard");
    return result;
  } catch (err: any) {
    return { error: err.message || "Failed to record principal repayment" };
  }
}

// ============================================================
// LOAN TOP-UP
// ============================================================

export async function loanTopUpAction(
  input: LoanTopUpInput
): Promise<{ error?: string; newPrincipal?: number }> {
  const session = await requireAuth();

  try {
    const loan = await prisma.loan.findFirst({
      where: {
        id: input.loanId,
        borrower: { userId: session.id },
      },
      select: { id: true },
    });

    if (!loan) return { error: "Loan not found" };

    const result = await recordLoanTopUp(input, session.id);
    revalidatePath(`/loans/${input.loanId}`);
    revalidatePath("/dashboard");
    return result;
  } catch (err: any) {
    return { error: err.message || "Failed to record top-up" };
  }
}

// ============================================================
// GET ALL LOANS
// ============================================================

export async function getLoansAction(params?: {
  status?: LoanStatus;
  borrowerId?: string;
}) {
  const session = await requireAuth();
  const today = new Date();

  const loans = await prisma.loan.findMany({
    where: {
      borrower: { userId: session.id },
      status: params?.status,
      borrowerId: params?.borrowerId,
    },
    include: {
      borrower: { select: { id: true, fullName: true, mobile: true } },
      interestDues: {
        where: {
          status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
          dueDate: { lte: today },
        },
        orderBy: { dueDate: "asc" },
      },
      _count: { select: { payments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return loans;
}

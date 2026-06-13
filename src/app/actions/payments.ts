"use server";

// ============================================================
// PAYMENT SERVER ACTIONS
// ============================================================

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { recordPayment } from "@/features/payment-engine";
import type { RecordPaymentInput, DashboardStats, TodayCollection, OverdueAccount } from "@/types";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { DueStatus, LoanStatus } from "@prisma/client";

// ============================================================
// RECORD PAYMENT
// ============================================================

export async function recordPaymentAction(input: RecordPaymentInput): Promise<{
  error?: string;
  paymentId?: string;
  allocated?: number;
  unallocated?: number;
}> {
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

    const result = await recordPayment(input, session.id);
    revalidatePath(`/loans/${input.loanId}`);
    revalidatePath("/dashboard");
    revalidatePath("/collections");
    return result;
  } catch (err: any) {
    return { error: err.message || "Failed to record payment" };
  }
}

// ============================================================
// GET TODAY'S COLLECTIONS
// ============================================================

export async function getTodayCollectionsAction(): Promise<TodayCollection[]> {
  const session = await requireAuth();
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const dues = await prisma.interestDue.findMany({
    where: {
      dueDate: { gte: dayStart, lte: dayEnd },
      status: { in: [DueStatus.PENDING, DueStatus.PARTIAL] },
      loan: {
        status: LoanStatus.ACTIVE,
        borrower: { userId: session.id, isArchived: false },
      },
    },
    include: {
      loan: {
        include: {
          borrower: { select: { id: true, fullName: true, mobile: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return dues.map((due) => ({
    borrowerId: due.loan.borrower.id,
    borrowerName: due.loan.borrower.fullName,
    mobile: due.loan.borrower.mobile,
    loanId: due.loanId,
    loanNumber: due.loan.loanNumber,
    dueId: due.id,
    dueAmount: Number(due.dueAmount),
    paidAmount: Number(due.paidAmount),
    remainingAmount: Number(due.dueAmount) - Number(due.paidAmount) - Number(due.waivedAmount),
    status: due.status,
    dueDate: due.dueDate,
  }));
}

// ============================================================
// GET OVERDUE ACCOUNTS
// ============================================================

export async function getOverdueAccountsAction(): Promise<OverdueAccount[]> {
  const session = await requireAuth();

  const overdueDues = await prisma.interestDue.findMany({
    where: {
      status: DueStatus.OVERDUE,
      loan: {
        status: LoanStatus.ACTIVE,
        borrower: { userId: session.id, isArchived: false },
      },
    },
    include: {
      loan: {
        include: {
          borrower: { select: { id: true, fullName: true, mobile: true } },
        },
      },
    },
    orderBy: { daysOverdue: "desc" },
  });

  // Group by borrower
  const byBorrower = new Map<string, OverdueAccount>();

  for (const due of overdueDues) {
    const key = due.loan.borrowerId;
    const outstanding = Number(due.dueAmount) - Number(due.paidAmount) - Number(due.waivedAmount);

    if (byBorrower.has(key)) {
      const existing = byBorrower.get(key)!;
      existing.totalOverdue += outstanding;
      existing.overdueCount += 1;
      if (due.daysOverdue > existing.daysOverdue) {
        existing.daysOverdue = due.daysOverdue;
      }
    } else {
      byBorrower.set(key, {
        borrowerId: due.loan.borrower.id,
        borrowerName: due.loan.borrower.fullName,
        mobile: due.loan.borrower.mobile,
        loanId: due.loanId,
        loanNumber: due.loan.loanNumber,
        totalOverdue: outstanding,
        daysOverdue: due.daysOverdue,
        overdueCount: 1,
      });
    }
  }

  return Array.from(byBorrower.values()).sort((a, b) => b.daysOverdue - a.daysOverdue);
}

// ============================================================
// GET DASHBOARD STATS
// ============================================================

export async function getDashboardStatsAction(): Promise<DashboardStats> {
  const session = await requireAuth();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    activeLoans,
    closedLoanCount,
    activeBorrowerCount,
    monthDues,
    monthPayments,
    pendingDues,
    overdueDues,
  ] = await Promise.all([
    prisma.loan.findMany({
      where: {
        status: LoanStatus.ACTIVE,
        borrower: { userId: session.id },
      },
      select: { currentPrincipal: true, interestRate: true, loanFrequency: true },
    }),
    prisma.loan.count({
      where: { status: LoanStatus.CLOSED, borrower: { userId: session.id } },
    }),
    prisma.borrower.count({
      where: {
        userId: session.id,
        isArchived: false,
        loans: { some: { status: LoanStatus.ACTIVE } },
      },
    }),
    prisma.interestDue.findMany({
      where: {
        dueDate: { gte: monthStart, lte: monthEnd },
        loan: { status: LoanStatus.ACTIVE, borrower: { userId: session.id } },
      },
      select: { dueAmount: true, paidAmount: true, waivedAmount: true, status: true },
    }),
    prisma.payment.findMany({
      where: {
        paymentDate: { gte: monthStart, lte: monthEnd },
        loan: { borrower: { userId: session.id } },
      },
      select: { amount: true },
    }),
    prisma.interestDue.findMany({
      where: {
        status: { in: [DueStatus.PENDING, DueStatus.PARTIAL] },
        loan: { status: LoanStatus.ACTIVE, borrower: { userId: session.id } },
      },
      select: { dueAmount: true, paidAmount: true, waivedAmount: true },
    }),
    prisma.interestDue.findMany({
      where: {
        status: DueStatus.OVERDUE,
        loan: { status: LoanStatus.ACTIVE, borrower: { userId: session.id } },
      },
      select: { dueAmount: true, paidAmount: true, waivedAmount: true },
    }),
  ]);

  const totalPrincipalLent = activeLoans.reduce(
    (sum, l) => sum + Number(l.currentPrincipal),
    0
  );

  const monthlyExpectedInterest = monthDues.reduce(
    (sum, d) => sum + Number(d.dueAmount),
    0
  );

  const interestReceivedThisMonth = monthPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  const pendingInterest = pendingDues.reduce(
    (sum, d) => sum + Number(d.dueAmount) - Number(d.paidAmount) - Number(d.waivedAmount),
    0
  );

  const overdueInterest = overdueDues.reduce(
    (sum, d) => sum + Number(d.dueAmount) - Number(d.paidAmount) - Number(d.waivedAmount),
    0
  );

  return {
    totalPrincipalLent,
    activePrincipal: totalPrincipalLent,
    activeLoanCount: activeLoans.length,
    closedLoanCount,
    activeBorrowerCount,
    monthlyExpectedInterest,
    interestReceivedThisMonth,
    pendingInterest,
    overdueInterest,
    overdueCount: overdueDues.length,
  };
}

// ============================================================
// GET MONTHLY REPORT
// ============================================================

export async function getMonthlyReportAction(month: string) {
  // month format: "2024-07"
  const session = await requireAuth();
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = endOfMonth(start);

  const dues = await prisma.interestDue.findMany({
    where: {
      dueDate: { gte: start, lte: end },
      loan: { borrower: { userId: session.id } },
    },
    include: {
      loan: {
        select: {
          id: true,
          loanNumber: true,
          borrower: { select: { fullName: true } },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return dues;
}

// ============================================================
// PAYMENT ENGINE
// Handles payment recording, allocation, and principal operations.
// All payment logic lives here — never in API routes or components.
// ============================================================

import { prisma } from "@/lib/prisma";
import {
  PaymentMethod, DueStatus, TransactionType, LoanStatus, AuditAction
} from "@prisma/client";
import { allocatePayment } from "@/features/interest-engine";
import { regenerateFutureDues, stopDueGeneration } from "@/features/due-engine";
import { roundCurrency } from "@/features/interest-engine";
import type { RecordPaymentInput, PrincipalRepaymentInput, LoanTopUpInput } from "@/types";
import { generateReceiptNumber, generateLoanNumber } from "@/utils";

// ============================================================
// RECORD INTEREST PAYMENT
// 1. Create payment record
// 2. Allocate to dues (oldest first)
// 3. Update due statuses
// 4. Record audit log
// ============================================================

export async function recordPayment(
  input: RecordPaymentInput,
  userId: string
): Promise<{ paymentId: string; allocated: number; unallocated: number }> {
  return await prisma.$transaction(async (tx) => {
    // Get all pending/partial/overdue dues for this loan
    const dues = await tx.interestDue.findMany({
      where: {
        loanId: input.loanId,
        status: { in: [DueStatus.PENDING, DueStatus.PARTIAL, DueStatus.OVERDUE] },
      },
      orderBy: { dueDate: "asc" },
    });

    // Calculate allocations
    const duesForAllocation = dues.map((d) => ({
      id: d.id,
      dueAmount: Number(d.dueAmount),
      paidAmount: Number(d.paidAmount),
      waivedAmount: Number(d.waivedAmount),
      status: d.status,
    }));

    const allocationResult = allocatePayment(input.amount, duesForAllocation);

    // Handle cheque if applicable
    let chequeId: string | undefined;
    if (
      input.paymentMethod === PaymentMethod.CHEQUE &&
      input.chequeNumber &&
      input.bankName
    ) {
      const cheque = await tx.cheque.create({
        data: {
          loanId: input.loanId,
          chequeNumber: input.chequeNumber,
          bankName: input.bankName,
          amount: input.amount,
          chequeDate: input.chequeDate || input.paymentDate,
        },
      });
      chequeId = cheque.id;
    }

    // Create payment record
    const payment = await tx.payment.create({
      data: {
        loanId: input.loanId,
        amount: input.amount,
        paymentDate: input.paymentDate,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        chequeId,
        receiptNumber: generateReceiptNumber(),
      },
    });

    // Create allocations and update due statuses
    for (const allocation of allocationResult.allocations) {
      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          dueId: allocation.dueId,
          allocatedAmount: allocation.amount,
        },
      });

      // Update due paid amount and status
      const due = dues.find((d) => d.id === allocation.dueId)!;
      const newPaidAmount = roundCurrency(
        Number(due.paidAmount) + allocation.amount
      );
      const outstanding = roundCurrency(
        Number(due.dueAmount) - newPaidAmount - Number(due.waivedAmount)
      );

      let newStatus: DueStatus;
      if (outstanding <= 0) {
        newStatus = DueStatus.PAID;
      } else if (newPaidAmount > 0) {
        newStatus = DueStatus.PARTIAL;
      } else {
        newStatus = due.status;
      }

      await tx.interestDue.update({
        where: { id: allocation.dueId },
        data: { paidAmount: newPaidAmount, status: newStatus },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.PAYMENT_RECORDED,
        entityType: "Payment",
        entityId: payment.id,
        details: {
          loanId: input.loanId,
          amount: input.amount,
          method: input.paymentMethod,
          allocated: allocationResult.totalAllocated,
          unallocated: allocationResult.unallocated,
        },
      },
    });

    return {
      paymentId: payment.id,
      allocated: allocationResult.totalAllocated,
      unallocated: allocationResult.unallocated,
    };
  });
}

// ============================================================
// RECORD PRINCIPAL REPAYMENT
// 1. Create transaction record
// 2. Update loan currentPrincipal
// 3. Regenerate future dues with new principal
// 4. Auto-close if fully repaid
// ============================================================

export async function recordPrincipalRepayment(
  input: PrincipalRepaymentInput,
  userId: string
): Promise<{ newPrincipal: number; loanClosed: boolean }> {
  const result = await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { id: input.loanId },
    });

    if (!loan) throw new Error("Loan not found");

    const currentPrincipal = Number(loan.currentPrincipal);
    if (input.amount > currentPrincipal) {
      throw new Error(
        `Repayment amount ₹${input.amount} exceeds current principal ₹${currentPrincipal}`
      );
    }

    const newPrincipal = roundCurrency(currentPrincipal - input.amount);
    const loanClosed = newPrincipal === 0;

    // Record transaction
    await tx.loanTransaction.create({
      data: {
        loanId: input.loanId,
        type: TransactionType.PRINCIPAL_REPAYMENT,
        amount: input.amount,
        principalBefore: currentPrincipal,
        principalAfter: newPrincipal,
        notes: input.notes,
        transactionDate: input.repaymentDate,
      },
    });

    // Update loan
    await tx.loan.update({
      where: { id: input.loanId },
      data: {
        currentPrincipal: newPrincipal,
        status: loanClosed ? LoanStatus.CLOSED : LoanStatus.ACTIVE,
        closedAt: loanClosed ? new Date() : null,
      },
    });

    // Audit
    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.PRINCIPAL_REPAID,
        entityType: "Loan",
        entityId: input.loanId,
        details: {
          amount: input.amount,
          principalBefore: currentPrincipal,
          principalAfter: newPrincipal,
          loanClosed,
        },
      },
    });

    return { newPrincipal, loanClosed };
  });

  // Outside transaction: regenerate dues
  if (input.amount > 0) {
    if (result.loanClosed) {
      await stopDueGeneration(input.loanId);
    } else {
      await regenerateFutureDues(input.loanId, input.repaymentDate);
    }
  }

  return result;
}

// ============================================================
// LOAN TOP-UP
// Adds to principal. Regenerates future dues.
// ============================================================

export async function recordLoanTopUp(
  input: LoanTopUpInput,
  userId: string
): Promise<{ newPrincipal: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: input.loanId } });
    if (!loan) throw new Error("Loan not found");

    const currentPrincipal = Number(loan.currentPrincipal);
    const newPrincipal = roundCurrency(currentPrincipal + input.amount);

    await tx.loanTransaction.create({
      data: {
        loanId: input.loanId,
        type: TransactionType.LOAN_TOPUP,
        amount: input.amount,
        principalBefore: currentPrincipal,
        principalAfter: newPrincipal,
        notes: input.notes,
        transactionDate: input.topUpDate,
      },
    });

    await tx.loan.update({
      where: { id: input.loanId },
      data: { currentPrincipal: newPrincipal },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: AuditAction.LOAN_TOPUP,
        entityType: "Loan",
        entityId: input.loanId,
        details: {
          topUpAmount: input.amount,
          principalBefore: currentPrincipal,
          principalAfter: newPrincipal,
        },
      },
    });

    return { newPrincipal };
  });

  // Regenerate future dues with new principal
  await regenerateFutureDues(input.loanId, input.topUpDate);

  return result;
}

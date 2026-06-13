// ============================================================
// DUE GENERATION ENGINE
// Generates InterestDue records for active loans.
// Called by: cron job (nightly), loan creation, principal change.
// ============================================================

import { prisma } from "@/lib/prisma";
import { LoanFrequency, LoanStatus, DueStatus } from "@prisma/client";
import {
  generateDueDates,
  calculatePeriodDue,
  roundCurrency,
} from "@/features/interest-engine";
import { addDays, addMonths, startOfDay, endOfDay } from "date-fns";

// ============================================================
// GENERATE DUES FOR A SINGLE LOAN
// ============================================================

export async function generateDuesForLoan(
  loanId: string,
  upToDate?: Date,
  fromDateOverride?: Date
): Promise<{ generated: number; errors: string[] }> {
  const errors: string[] = [];
  let generated = 0;

  try {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        interestDues: {
          orderBy: { dueDate: "desc" },
          take: 1,
        },
      },
    });

    if (!loan) {
      errors.push(`Loan ${loanId} not found`);
      return { generated, errors };
    }

    if (loan.status !== LoanStatus.ACTIVE) {
      return { generated, errors };
    }

    // Generate up to 3 months in advance by default
    const generateUpTo = upToDate || addMonths(new Date(), 3);

    // Find the latest existing due to avoid duplicates
    const latestDue = loan.interestDues[0];
    const fromDate = fromDateOverride
      ? startOfDay(fromDateOverride)
      : latestDue
      ? startOfDay(latestDue.dueDate)
      : startOfDay(loan.startDate);

    const dueDates = generateDueDates(
      loan.startDate,
      loan.loanFrequency,
      loan.dueDay,
      generateUpTo,
      fromDate
    );

    if (dueDates.length === 0) return { generated, errors };

    // Get current principal (may have changed due to repayments/top-ups)
    const currentPrincipal = Number(loan.currentPrincipal);

    const dueRecords = dueDates.map((dueDate) => {
      const result = calculatePeriodDue({
        principal: currentPrincipal,
        interestRate: Number(loan.interestRate),
        frequency: loan.loanFrequency,
        interestType: loan.interestType,
        startDate: loan.startDate,
        periodDate: dueDate,
      });

      return {
        loanId: loan.id,
        dueDate: result.dueDate,
        periodStart: result.periodStart,
        periodEnd: result.periodEnd,
        principalAtTime: result.principalUsed,
        interestRate: result.interestRate,
        dueAmount: result.dueAmount,
        paidAmount: 0,
        waivedAmount: 0,
        penaltyAmount: 0,
        status: DueStatus.PENDING,
        daysOverdue: 0,
      };
    });

    // Batch insert, skipping any that already exist (by dueDate + loanId)
    for (const record of dueRecords) {
      try {
        const existing = await prisma.interestDue.findFirst({
          where: {
            loanId: record.loanId,
            dueDate: record.dueDate,
          },
        });

        if (!existing) {
          await prisma.interestDue.create({ data: record });
          generated++;
        }
      } catch (err) {
        errors.push(`Failed to create due for ${record.dueDate}: ${err}`);
      }
    }

    return { generated, errors };
  } catch (err) {
    errors.push(`Error generating dues for loan ${loanId}: ${err}`);
    return { generated, errors };
  }
}

// ============================================================
// GENERATE DUES FOR ALL ACTIVE LOANS
// Called by nightly cron job.
// ============================================================

export async function generateDuesForAllLoans(): Promise<{
  processed: number;
  totalGenerated: number;
  errors: string[];
}> {
  const allErrors: string[] = [];
  let processed = 0;
  let totalGenerated = 0;

  const activeLoans = await prisma.loan.findMany({
    where: { status: LoanStatus.ACTIVE },
    select: { id: true },
  });

  for (const loan of activeLoans) {
    const result = await generateDuesForLoan(loan.id);
    processed++;
    totalGenerated += result.generated;
    allErrors.push(...result.errors);
  }

  return { processed, totalGenerated, errors: allErrors };
}

// ============================================================
// UPDATE OVERDUE STATUS
// Runs nightly to mark past-due records as OVERDUE.
// ============================================================

export async function updateOverdueStatus(): Promise<{ updated: number }> {
  const now = startOfDay(new Date());

  const result = await prisma.interestDue.updateMany({
    where: {
      status: { in: [DueStatus.PENDING, DueStatus.PARTIAL] },
      dueDate: { lt: now },
    },
    data: {
      status: DueStatus.OVERDUE,
    },
  });

  // Update daysOverdue for all overdue records
  const overdueDues = await prisma.interestDue.findMany({
    where: { status: DueStatus.OVERDUE },
    select: { id: true, dueDate: true },
  });

  for (const due of overdueDues) {
    const daysOverdue = Math.floor(
      (now.getTime() - due.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    await prisma.interestDue.update({
      where: { id: due.id },
      data: { daysOverdue },
    });
  }

  return { updated: result.count };
}

// ============================================================
// REGENERATE DUES AFTER PRINCIPAL CHANGE
// Called after principal repayment or top-up.
// Deletes future PENDING dues, recalculates future PARTIAL dues,
// and regenerates missing dues with the updated principal.
// ============================================================

export async function regenerateFutureDues(
  loanId: string,
  fromDate: Date,
  upToDate?: Date
): Promise<{ deleted: number; generated: number }> {
  const from = startOfDay(fromDate);

  // Delete future pending dues only (don't touch paid/overdue)
  const deleteResult = await prisma.interestDue.deleteMany({
    where: {
      loanId,
      dueDate: { gte: from },
      status: DueStatus.PENDING,
    },
  });

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      interestDues: {
        where: {
          dueDate: { gte: from },
          status: DueStatus.PARTIAL,
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (loan && loan.status === LoanStatus.ACTIVE) {
    const currentPrincipal = Number(loan.currentPrincipal);

    for (const due of loan.interestDues.filter((d) => d.status === DueStatus.PARTIAL)) {
      const recalculated = calculatePeriodDue({
        principal: currentPrincipal,
        interestRate: Number(loan.interestRate),
        frequency: loan.loanFrequency,
        interestType: loan.interestType,
        startDate: loan.startDate,
        periodDate: due.dueDate,
      });
      const outstanding = roundCurrency(
        recalculated.dueAmount - Number(due.paidAmount) - Number(due.waivedAmount)
      );

      await prisma.interestDue.update({
        where: { id: due.id },
        data: {
          dueDate: recalculated.dueDate,
          periodStart: recalculated.periodStart,
          periodEnd: recalculated.periodEnd,
          principalAtTime: recalculated.principalUsed,
          interestRate: recalculated.interestRate,
          dueAmount: recalculated.dueAmount,
          status: outstanding <= 0 ? DueStatus.PAID : DueStatus.PARTIAL,
          daysOverdue: 0,
        },
      });
    }
  }

  const generationFrom = addDays(from, -1);
  const generateResult = await generateDuesForLoan(loanId, upToDate, generationFrom);

  return {
    deleted: deleteResult.count,
    generated: generateResult.generated,
  };
}

// ============================================================
// STOP DUE GENERATION (LOAN CLOSE)
// Deletes all future pending dues for a closed loan.
// ============================================================

export async function stopDueGeneration(loanId: string): Promise<{ deleted: number }> {
  const now = startOfDay(new Date());

  const result = await prisma.interestDue.deleteMany({
    where: {
      loanId,
      dueDate: { gt: now },
      status: DueStatus.PENDING,
    },
  });

  return { deleted: result.count };
}

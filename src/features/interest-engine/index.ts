// ============================================================
// INTEREST ENGINE
// Pure TypeScript. No side effects. Fully testable.
// All financial calculations live here — nowhere else.
// ============================================================

import { InterestType, LoanFrequency, CompoundingRule } from "@prisma/client";
import type {
  InterestCalculationInput,
  InterestCalculationResult,
} from "@/types";
import { addMonths, addDays, differenceInDays, startOfDay } from "date-fns";

// ============================================================
// CONSTANTS
// ============================================================

const DAYS_IN_YEAR = 365;
const DECIMAL_PLACES = 2;

// ============================================================
// ROUNDING UTILITY
// Always round half-up to 2 decimal places.
// Consistent rounding prevents accumulation errors.
// ============================================================

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ============================================================
// DAILY INTEREST FROM MONTHLY RATE
// Formula: (monthly_rate / days_in_month) * principal
// We use actual days in the period — not a fixed 30.
// ============================================================

export function dailyInterestAmount(
  principal: number,
  monthlyRatePercent: number,
  periodDays: number
): number {
  // Convert monthly % to daily rate using actual period
  // Annual rate = monthly * 12
  // Daily rate = annual / 365
  const annualRate = monthlyRatePercent * 12;
  const dailyRate = annualRate / (DAYS_IN_YEAR * 100);
  return roundCurrency(principal * dailyRate * periodDays);
}

// ============================================================
// MONTHLY INTEREST AMOUNT
// Simple: principal * rate / 100
// ============================================================

export function monthlyInterestAmount(
  principal: number,
  monthlyRatePercent: number
): number {
  return roundCurrency((principal * monthlyRatePercent) / 100);
}

// ============================================================
// PRORATED INTEREST (for partial first/last month)
// e.g. Loan started 15 Jan, first due 15 Feb = full month.
// But if due day is 1st, first period is 15 Jan → 1 Feb = partial.
// ============================================================

export function proratedInterest(
  principal: number,
  monthlyRatePercent: number,
  periodStart: Date,
  periodEnd: Date
): number {
  const days = differenceInDays(periodEnd, periodStart);
  return dailyInterestAmount(principal, monthlyRatePercent, days);
}

// ============================================================
// CALCULATE SINGLE PERIOD DUE
// This is the atomic unit of due generation.
// ============================================================

export function calculatePeriodDue(
  input: InterestCalculationInput
): InterestCalculationResult {
  const {
    principal,
    interestRate,
    frequency,
    startDate,
    periodDate,
  } = input;

  let dueAmount: number;
  let periodStart: Date;
  let periodEnd: Date;
  let dueDate: Date;

  if (frequency === LoanFrequency.MONTHLY) {
    // Period: previous month anniversary → current month anniversary
    periodStart = startOfDay(periodDate === startDate ? startDate : addMonths(periodDate, -1));
    periodEnd = startOfDay(periodDate);
    dueDate = startOfDay(periodDate);

    const days = differenceInDays(periodEnd, periodStart);

    // Check if this is a full month or partial
    // Full month = exactly one month from start
    const expectedFullMonthDays = differenceInDays(
      addMonths(periodStart, 1),
      periodStart
    );

    if (Math.abs(days - expectedFullMonthDays) <= 1) {
      // Full month — use simple monthly formula
      dueAmount = monthlyInterestAmount(principal, interestRate);
    } else {
      // Partial month — prorate
      dueAmount = proratedInterest(principal, interestRate, periodStart, periodEnd);
    }
  } else {
    // DAILY: each period is one day
    periodStart = startOfDay(periodDate);
    periodEnd = startOfDay(addDays(periodDate, 1));
    dueDate = startOfDay(periodDate);
    dueAmount = dailyInterestAmount(principal, interestRate, 1);
  }

  return {
    dueAmount,
    principalUsed: principal,
    interestRate,
    periodDays: differenceInDays(periodEnd, periodStart),
    periodStart,
    periodEnd,
    dueDate,
  };
}

// ============================================================
// GENERATE DUE DATES FOR A LOAN
// Returns array of due dates from startDate to endDate.
// For monthly loans: anniversary of start date each month.
// For daily loans: every day from start.
// ============================================================

export function generateDueDates(
  startDate: Date,
  frequency: LoanFrequency,
  dueDay: number,
  upToDate: Date,
  fromDate?: Date
): Date[] {
  const dueDates: Date[] = [];
  const start = startOfDay(fromDate || startDate);
  const end = startOfDay(upToDate);

  if (frequency === LoanFrequency.MONTHLY) {
    // First due date: one month after start date (on dueDay or anniversary)
    let current = startOfDay(addMonths(startDate, 1));

    // Adjust to due day if different from start day
    // But respect original start — anniversary-based is more honest
    // We follow actual loan date (not fixed 1st of month)
    // dueDay is stored but anniversary takes precedence for date calc
    // If lender explicitly wants a fixed day (e.g. always 1st), they set dueDay

    // Decision: use anniversary (start date day) by default
    // If dueDay != startDate day, use dueDay for first due after start
    const startDay = startDate.getDate();
    if (dueDay !== startDay) {
      // Lender wants dues on a specific day of month
      // Find next occurrence of dueDay after startDate
      let candidate = new Date(startDate);
      candidate.setDate(dueDay);
      if (candidate <= startDate) {
        candidate = addMonths(candidate, 1);
      }
      current = startOfDay(candidate);
    }

    while (current <= end) {
      if (current > start) {
        dueDates.push(new Date(current));
      }
      current = addMonths(current, 1);
      // Handle month-end edge cases (e.g. Jan 31 → Feb 28)
      if (current.getDate() !== dueDay && dueDay <= 28) {
        current.setDate(dueDay);
      }
    }
  } else {
    // DAILY
    let current = startOfDay(addDays(startDate, 1));
    while (current <= end) {
      if (current > start) {
        dueDates.push(new Date(current));
      }
      current = addDays(current, 1);
    }
  }

  return dueDates;
}

// ============================================================
// COMPOUND INTEREST ENGINE
// Adds unpaid interest to principal based on compounding rule.
// ============================================================

export function shouldCompound(
  missedConsecutivePayments: number,
  rule: CompoundingRule
): boolean {
  switch (rule) {
    case CompoundingRule.MONTHLY:
      return missedConsecutivePayments >= 1;
    case CompoundingRule.AFTER_1_MISSED:
      return missedConsecutivePayments >= 1;
    case CompoundingRule.AFTER_2_MISSED:
      return missedConsecutivePayments >= 2;
    case CompoundingRule.CUSTOM:
      return false; // Custom handled manually
    default:
      return false;
  }
}

export function calculateCompoundedPrincipal(
  currentPrincipal: number,
  unpaidInterest: number
): number {
  return roundCurrency(currentPrincipal + unpaidInterest);
}

// ============================================================
// OUTSTANDING BALANCE CALCULATOR
// Given a loan, calculates total outstanding.
// ============================================================

export function calculateOutstandingBalance(
  currentPrincipal: number,
  pendingInterest: number,
  overdueInterest: number,
  penalties: number = 0
): number {
  return roundCurrency(currentPrincipal + pendingInterest + overdueInterest + penalties);
}

// ============================================================
// MONTHLY INTEREST FOR DISPLAY
// What should be shown as "monthly expected interest" for a loan.
// ============================================================

export function getMonthlyExpectedInterest(
  principal: number,
  interestRate: number,
  frequency: LoanFrequency
): number {
  if (frequency === LoanFrequency.MONTHLY) {
    return monthlyInterestAmount(principal, interestRate);
  } else {
    // Daily: 30 days estimate
    return dailyInterestAmount(principal, interestRate, 30);
  }
}

// ============================================================
// PAYMENT ALLOCATION ENGINE
// Applies a payment amount against oldest pending dues first.
// Returns updated allocation map.
// ============================================================

export type DueForAllocation = {
  id: string;
  dueAmount: number;
  paidAmount: number;
  waivedAmount: number;
  status: string;
  dueDate?: Date | string;
};

export type AllocationResult = {
  allocations: { dueId: string; amount: number }[];
  totalAllocated: number;
  unallocated: number; // leftover (potential principal payment)
};

export function allocatePayment(
  paymentAmount: number,
  dues: DueForAllocation[],
  asOfDate: Date = new Date()
): AllocationResult {
  const asOf = startOfDay(asOfDate);
  // Sort: OVERDUE first, then PENDING, then PARTIAL — oldest due date first
  const pendingDues = dues
    .filter((d) => {
      if (!["PENDING", "PARTIAL", "OVERDUE"].includes(d.status)) return false;
      if (!d.dueDate) return true;
      return startOfDay(new Date(d.dueDate)) <= asOf;
    })
    .sort((a, b) => {
      // Overdue before pending
      if (a.status === "OVERDUE" && b.status !== "OVERDUE") return -1;
      if (b.status === "OVERDUE" && a.status !== "OVERDUE") return 1;
      return 0;
    });

  const allocations: { dueId: string; amount: number }[] = [];
  let remaining = paymentAmount;

  for (const due of pendingDues) {
    if (remaining <= 0) break;

    const outstanding = roundCurrency(
      due.dueAmount - due.paidAmount - due.waivedAmount
    );
    if (outstanding <= 0) continue;

    const toAllocate = Math.min(remaining, outstanding);
    allocations.push({ dueId: due.id, amount: toAllocate });
    remaining = roundCurrency(remaining - toAllocate);
  }

  return {
    allocations,
    totalAllocated: roundCurrency(paymentAmount - remaining),
    unallocated: roundCurrency(remaining),
  };
}

// ============================================================
// LOAN SUMMARY CALCULATOR
// Pure function — pass in dues and payments, get back summary.
// ============================================================

export type LoanSummaryInput = {
  originalPrincipal: number;
  currentPrincipal: number;
  asOfDate?: Date;
  dues: {
    dueAmount: number;
    paidAmount: number;
    waivedAmount: number;
    status: string;
    penaltyAmount: number;
    dueDate?: Date | string;
  }[];
};

export type LoanSummaryOutput = {
  totalInterestCharged: number;
  totalInterestReceived: number;
  pendingInterest: number;
  overdueInterest: number;
  totalPenalties: number;
  collectionRate: number; // 0-100 percentage
};

export function calculateLoanSummary(input: LoanSummaryInput): LoanSummaryOutput {
  let totalInterestCharged = 0;
  let totalInterestReceived = 0;
  let pendingInterest = 0;
  let overdueInterest = 0;
  let totalPenalties = 0;
  const asOf = startOfDay(input.asOfDate || new Date());

  for (const due of input.dues) {
    const dueDate = due.dueDate ? startOfDay(new Date(due.dueDate)) : null;
    const isCollectible = !dueDate || dueDate <= asOf;
    const isOverdue =
      !!dueDate &&
      dueDate < asOf &&
      ["PENDING", "PARTIAL", "OVERDUE"].includes(due.status);

    totalInterestCharged += due.dueAmount + due.penaltyAmount;
    totalInterestReceived += due.paidAmount;
    totalPenalties += due.penaltyAmount;

    const outstanding = due.dueAmount - due.paidAmount - due.waivedAmount;
    if (!isCollectible) continue;

    if (due.status === "OVERDUE" || isOverdue) {
      overdueInterest += outstanding;
    } else if (["PENDING", "PARTIAL"].includes(due.status)) {
      pendingInterest += outstanding;
    }
  }

  const collectionRate =
    totalInterestCharged > 0
      ? (totalInterestReceived / totalInterestCharged) * 100
      : 0;

  return {
    totalInterestCharged: roundCurrency(totalInterestCharged),
    totalInterestReceived: roundCurrency(totalInterestReceived),
    pendingInterest: roundCurrency(pendingInterest),
    overdueInterest: roundCurrency(overdueInterest),
    totalPenalties: roundCurrency(totalPenalties),
    collectionRate: Math.round(collectionRate * 10) / 10,
  };
}

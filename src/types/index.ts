// ============================================================
// LOANBOOK - Core TypeScript Types
// ============================================================

import type {
  User, Borrower, Loan, InterestDue, Payment,
  PaymentAllocation, LoanTransaction, Cheque,
  MessageLog, AuditLog, Settings,
  Role, LoanStatus, InterestType, LoanFrequency,
  CompoundingRule, DueStatus, PaymentMethod,
  TransactionType, MessageType, AuditAction
} from "@prisma/client";

// Re-export Prisma enums for use across app
export {
  Role, LoanStatus, InterestType, LoanFrequency,
  CompoundingRule, DueStatus, PaymentMethod,
  TransactionType, MessageType, AuditAction
};

// ============================================================
// EXTENDED TYPES (with relations)
// ============================================================

export type BorrowerWithLoans = Borrower & {
  loans: LoanWithDues[];
};

export type BorrowerSummary = Borrower & {
  _count: { loans: number };
  loans: {
    id: string;
    status: LoanStatus;
    currentPrincipal: number;
    interestDues: { status: DueStatus; dueAmount: number; paidAmount: number }[];
  }[];
};

export type LoanWithDues = Loan & {
  interestDues: InterestDue[];
  borrower: Borrower;
};

export type LoanWithEverything = Loan & {
  borrower: Borrower;
  interestDues: InterestDue[];
  payments: PaymentWithAllocations[];
  transactions: LoanTransaction[];
  cheques: Cheque[];
};

export type PaymentWithAllocations = Payment & {
  allocations: (PaymentAllocation & { due: InterestDue })[];
  cheque?: Cheque | null;
};

export type DueWithLoan = InterestDue & {
  loan: Loan & { borrower: Borrower };
};

// ============================================================
// DASHBOARD TYPES
// ============================================================

export type DashboardStats = {
  totalPrincipalLent: number;
  activePrincipal: number;
  activeLoanCount: number;
  closedLoanCount: number;
  activeBorrowerCount: number;
  monthlyExpectedInterest: number;
  interestReceivedThisMonth: number;
  pendingInterest: number;
  overdueInterest: number;
  overdueCount: number;
};

export type TodayCollection = {
  borrowerId: string;
  borrowerName: string;
  mobile: string;
  loanId: string;
  loanNumber: string;
  dueId: string;
  dueAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: DueStatus;
  dueDate: Date;
  whatsappLink?: string;
};

export type OverdueAccount = {
  borrowerId: string;
  borrowerName: string;
  mobile: string;
  loanId: string;
  loanNumber: string;
  totalOverdue: number;
  daysOverdue: number;
  overdueCount: number;
  whatsappLink?: string;
};

export type CollectedTodayPayment = {
  id: string;
  borrowerName: string;
  loanNumber: string;
  amount: number;
  receivedAt: Date;
};

// ============================================================
// FORM INPUT TYPES
// ============================================================

export type CreateBorrowerInput = {
  fullName: string;
  mobile: string;
  alternateMobile?: string;
  address?: string;
  notes?: string;
  photoUrl?: string;
};

export type UpdateBorrowerInput = Partial<CreateBorrowerInput>;

export type CreateLoanInput = {
  borrowerId: string;
  principalAmount: number;
  interestRate: number;
  interestType: InterestType;
  loanFrequency: LoanFrequency;
  compoundingRule?: CompoundingRule;
  startDate: Date;
  dueDay: number;
  notes?: string;
  collateral?: string;
  guarantorName?: string;
  guarantorMobile?: string;
};

export type RecordPaymentInput = {
  loanId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  notes?: string;
  chequeNumber?: string;
  bankName?: string;
  chequeDate?: Date;
};

export type PaymentAllocationDetail = {
  dueId: string;
  dueDate: Date;
  periodStart: Date;
  periodEnd: Date;
  amountAllocated: number;
  remainingForDue: number;
};

export type PrincipalRepaymentInput = {
  loanId: string;
  amount: number;
  repaymentDate: Date;
  notes?: string;
};

export type LoanTopUpInput = {
  loanId: string;
  amount: number;
  topUpDate: Date;
  notes?: string;
};

// ============================================================
// INTEREST CALCULATION TYPES
// ============================================================

export type InterestCalculationInput = {
  principal: number;
  interestRate: number; // percentage, e.g. 3 for 3%
  frequency: LoanFrequency;
  interestType: InterestType;
  startDate: Date;
  periodDate: Date;
  missedPayments?: number; // for compound interest rules
};

export type InterestCalculationResult = {
  dueAmount: number;
  principalUsed: number;
  interestRate: number;
  periodDays: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
};

export type DueGenerationResult = {
  generated: number;
  dues: InterestCalculationResult[];
  errors: string[];
};

// ============================================================
// BORROWER LEDGER TYPE
// ============================================================

export type BorrowerLedger = {
  borrower: Borrower;
  loans: LoanLedger[];
  totalSummary: {
    totalPrincipalLent: number;
    currentOutstandingPrincipal: number;
    totalInterestCharged: number;
    totalInterestReceived: number;
    totalPendingInterest: number;
    totalPaid: number;
    totalOutstanding: number;
  };
};

export type LoanLedger = {
  loan: Loan;
  summary: {
    originalPrincipal: number;
    currentPrincipal: number;
    totalInterestCharged: number;
    totalInterestReceived: number;
    pendingInterest: number;
    overdueInterest: number;
    totalPaid: number;
    totalOutstanding: number;
  };
  dues: InterestDue[];
  payments: PaymentWithAllocations[];
  transactions: LoanTransaction[];
  cheques: Cheque[];
};

// ============================================================
// REPORT TYPES
// ============================================================

export type MonthlyReport = {
  month: string; // "2024-07"
  totalDues: number;
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number; // percentage
  loanWiseBreakdown: {
    loanId: string;
    loanNumber: string;
    borrowerName: string;
    due: number;
    received: number;
    pending: number;
  }[];
};

export type CollectionReport = {
  date: string;
  collections: {
    borrowerName: string;
    loanNumber: string;
    amount: number;
    paymentMethod: PaymentMethod;
  }[];
  totalCollected: number;
};

// ============================================================
// WHATSAPP TEMPLATE TYPE
// ============================================================

export type WhatsAppTemplate = {
  type: MessageType;
  name: string;
  template: string;
  variables: string[]; // e.g. ["borrowerName", "amount", "dueDate"]
};

// ============================================================
// API RESPONSE TYPES
// ============================================================

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>;

// ============================================================
// SESSION TYPE
// ============================================================

export type SessionUser = {
  id: string;
  name: string;
  mobile: string;
  role: Role;
};

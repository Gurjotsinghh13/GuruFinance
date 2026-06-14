import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { startOfDay, subDays } from "date-fns";
import { DueStatus, LoanFrequency, LoanStatus, MessageType, PaymentMethod } from "@prisma/client";
import {
  allocatePayment,
  calculateLoanSummary,
  calculatePeriodDue,
  dailyInterestAmount,
  monthlyInterestAmount,
} from "@/features/interest-engine";

type MockPrisma = Record<string, any>;

function loadPaymentEngine(mockPrisma: MockPrisma, dueEngineCalls: any = {}) {
  const prismaPath = require.resolve("../src/lib/prisma");
  const dueEnginePath = require.resolve("../src/features/due-engine");
  const paymentEnginePath = require.resolve("../src/features/payment-engine");

  delete require.cache[prismaPath];
  delete require.cache[dueEnginePath];
  delete require.cache[paymentEnginePath];

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: { prisma: mockPrisma },
  } as NodeModule;

  require.cache[dueEnginePath] = {
    id: dueEnginePath,
    filename: dueEnginePath,
    loaded: true,
    exports: {
      regenerateFutureDues: dueEngineCalls.regenerateFutureDues,
      stopDueGeneration: dueEngineCalls.stopDueGeneration,
    },
  } as NodeModule;

  return require("../src/features/payment-engine");
}

function loadDueEngine(mockPrisma: MockPrisma) {
  const prismaPath = require.resolve("../src/lib/prisma");
  const dueEnginePath = require.resolve("../src/features/due-engine");

  delete require.cache[prismaPath];
  delete require.cache[dueEnginePath];

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: { prisma: mockPrisma },
  } as NodeModule;

  return require("../src/features/due-engine");
}

function loadLoanActions(mockPrisma: MockPrisma, options: any = {}) {
  const prismaPath = require.resolve("../src/lib/prisma");
  const authPath = require.resolve("../src/lib/auth");
  const dueEnginePath = require.resolve("../src/features/due-engine");
  const utilsPath = require.resolve("../src/utils");
  const nextCachePath = require.resolve("next/cache");
  const loanActionsPath = require.resolve("../src/app/actions/loans");

  delete require.cache[prismaPath];
  delete require.cache[authPath];
  delete require.cache[dueEnginePath];
  delete require.cache[utilsPath];
  delete require.cache[nextCachePath];
  delete require.cache[loanActionsPath];

  const actualUtils = require("../src/utils");

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: { prisma: mockPrisma },
  } as NodeModule;

  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      requireAuth: async () => options.session || { id: "user-1" },
    },
  } as NodeModule;

  require.cache[dueEnginePath] = {
    id: dueEnginePath,
    filename: dueEnginePath,
    loaded: true,
    exports: {
      generateDuesForLoan: options.generateDuesForLoan || (async () => ({ generated: 0, errors: [] })),
      stopDueGeneration: options.stopDueGeneration || (async () => ({ deleted: 0 })),
    },
  } as NodeModule;

  require.cache[utilsPath] = {
    id: utilsPath,
    filename: utilsPath,
    loaded: true,
    exports: {
      ...actualUtils,
      generateLoanNumber: options.generateLoanNumber || (() => "LN-2026-1001"),
    },
  } as NodeModule;

  require.cache[nextCachePath] = {
    id: nextCachePath,
    filename: nextCachePath,
    loaded: true,
    exports: {
      revalidatePath: options.revalidatePath || (() => undefined),
    },
  } as NodeModule;

  return require("../src/app/actions/loans");
}

function loadBorrowerActions(mockPrisma: MockPrisma, options: any = {}) {
  const prismaPath = require.resolve("../src/lib/prisma");
  const authPath = require.resolve("../src/lib/auth");
  const nextCachePath = require.resolve("next/cache");
  const borrowerActionsPath = require.resolve("../src/app/actions/borrowers");

  delete require.cache[prismaPath];
  delete require.cache[authPath];
  delete require.cache[nextCachePath];
  delete require.cache[borrowerActionsPath];

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: { prisma: mockPrisma },
  } as NodeModule;

  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      requireAuth: async () => options.session || { id: "user-1" },
    },
  } as NodeModule;

  require.cache[nextCachePath] = {
    id: nextCachePath,
    filename: nextCachePath,
    loaded: true,
    exports: {
      revalidatePath: options.revalidatePath || (() => undefined),
    },
  } as NodeModule;

  return require("../src/app/actions/borrowers");
}

function loadPaymentActions(mockPrisma: MockPrisma, options: any = {}) {
  const prismaPath = require.resolve("../src/lib/prisma");
  const authPath = require.resolve("../src/lib/auth");
  const nextCachePath = require.resolve("next/cache");
  const paymentActionsPath = require.resolve("../src/app/actions/payments");
  const paymentEnginePath = require.resolve("../src/features/payment-engine");

  delete require.cache[prismaPath];
  delete require.cache[authPath];
  delete require.cache[nextCachePath];
  delete require.cache[paymentActionsPath];
  delete require.cache[paymentEnginePath];

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: { prisma: mockPrisma },
  } as NodeModule;

  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      requireAuth: async () => options.session || { id: "user-1" },
    },
  } as NodeModule;

  require.cache[nextCachePath] = {
    id: nextCachePath,
    filename: nextCachePath,
    loaded: true,
    exports: {
      revalidatePath: options.revalidatePath || (() => undefined),
    },
  } as NodeModule;

  require.cache[paymentEnginePath] = {
    id: paymentEnginePath,
    filename: paymentEnginePath,
    loaded: true,
    exports: {
      recordPayment: options.recordPayment || (async () => ({ paymentId: "payment-1", allocated: 0, unallocated: 0 })),
    },
  } as NodeModule;

  return require("../src/app/actions/payments");
}

function loadWhatsAppFeature(mockPrisma: MockPrisma) {
  const prismaPath = require.resolve("../src/lib/prisma");
  const whatsappPath = require.resolve("../src/features/whatsapp");

  delete require.cache[prismaPath];
  delete require.cache[whatsappPath];

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: { prisma: mockPrisma },
  } as NodeModule;

  return require("../src/features/whatsapp");
}

describe("WhatsApp template rendering", () => {
  it("renders due reminder templates with amount, due date, borrower, and loan number", () => {
    const { renderDueReminderMessage } = loadWhatsAppFeature({
      settings: { findUnique: async () => null },
    });

    const message = renderDueReminderMessage(
      "Dear {{borrowerName}}, pay {{amount}} by {{dueDate}} for {{loanNumber}}.",
      {
        borrowerName: "Gurjot Singh",
        amount: 3000,
        dueDate: new Date("2026-08-15"),
        loanNumber: "LN-2026-1001",
      }
    );

    assert.equal(
      message,
      "Dear Gurjot Singh, pay \u20b93,000 by 15 Aug 2026 for LN-2026-1001."
    );
  });

  it("renders balance reminder templates with outstanding totals", () => {
    const { renderBalanceReminderMessage } = loadWhatsAppFeature({
      settings: { findUnique: async () => null },
    });

    const message = renderBalanceReminderMessage(
      "{{borrowerName}} {{loanNumber}} principal {{principal}} interest {{pendingInterest}} total {{totalOutstanding}}",
      {
        borrowerName: "Aman Verma",
        loanNumber: "LN-2026-2002",
        principal: 75000,
        pendingInterest: 4500,
        totalOutstanding: 79500,
      }
    );

    assert.equal(
      message,
      "Aman Verma LN-2026-2002 principal \u20b975,000 interest \u20b94,500 total \u20b979,500"
    );
  });

  it("renders payment receipt templates with receipt details and remaining balance", () => {
    const { renderPaymentReceiptMessage } = loadWhatsAppFeature({
      settings: { findUnique: async () => null },
    });

    const message = renderPaymentReceiptMessage(
      "{{receiptNumber}} {{borrowerName}} paid {{amount}} on {{paymentDate}} by {{paymentMethod}} for {{loanNumber}} balance {{remainingBalance}}",
      {
        borrowerName: "Sunita Devi",
        amount: 2250,
        paymentDate: new Date("2026-06-14"),
        paymentMethod: "UPI",
        loanNumber: "LN-2026-3003",
        receiptNumber: "RCT-20260614-1234",
        remainingBalance: 77250,
      }
    );

    assert.equal(
      message,
      "RCT-20260614-1234 Sunita Devi paid \u20b92,250 on 14 Jun 2026 by UPI for LN-2026-3003 balance \u20b977,250"
    );
  });

  it("renders account statement templates with statement totals", () => {
    const { renderAccountStatementMessage } = loadWhatsAppFeature({
      settings: { findUnique: async () => null },
    });

    const message = renderAccountStatementMessage(
      "{{borrowerName}} {{loanNumber}} principal {{principal}} rate {{interestRate}} paid {{totalPaid}} pending {{pendingInterest}} outstanding {{outstandingPrincipal}}",
      {
        borrowerName: "Rahul Sharma",
        loanNumber: "LN-2026-4004",
        principal: 100000,
        interestRate: 3,
        totalPaid: 12000,
        pendingInterest: 3000,
        outstandingPrincipal: 100000,
      }
    );

    assert.equal(
      message,
      "Rahul Sharma LN-2026-4004 principal \u20b91,00,000 rate 3 paid \u20b912,000 pending \u20b93,000 outstanding \u20b91,00,000"
    );
  });

  it("loads custom templates from Settings and URL-encodes WhatsApp links", async () => {
    const templateLookups: any[] = [];
    const { buildDueReminderLink } = loadWhatsAppFeature({
      settings: {
        findUnique: async (args: any) => {
          templateLookups.push(args);
          return {
            value:
              "Reminder for {{borrowerName}}\nAmount: {{amount}}\nDue: {{dueDate}}\nLoan: {{loanNumber}}",
          };
        },
      },
    });

    const link = await buildDueReminderLink({
      phone: "98765 43210",
      borrowerName: "Gurjot Singh",
      amount: 2250,
      dueDate: new Date("2026-07-01"),
      loanNumber: "LN-2026-5005",
    });
    const url = new URL(link);

    assert.deepEqual(templateLookups[0].where, {
      key: `whatsapp_template_${MessageType.DUE_REMINDER}`,
    });
    assert.equal(url.hostname, "wa.me");
    assert.equal(url.pathname, "/919876543210");
    assert.equal(
      url.searchParams.get("text"),
      "Reminder for Gurjot Singh\nAmount: \u20b92,250\nDue: 01 Jul 2026\nLoan: LN-2026-5005"
    );
  });
});

describe("financial calculations", () => {
  it("calculates simple monthly and daily interest for realistic loan amounts", () => {
    assert.equal(monthlyInterestAmount(100000, 3), 3000);
    assert.equal(monthlyInterestAmount(250000, 2.5), 6250);
    assert.equal(dailyInterestAmount(100000, 3, 1), 98.63);
    assert.equal(dailyInterestAmount(100000, 3, 10), 986.3);

    const monthlyDue = calculatePeriodDue({
      principal: 100000,
      interestRate: 3,
      frequency: LoanFrequency.MONTHLY,
      interestType: "SIMPLE" as any,
      startDate: new Date("2026-01-15"),
      periodDate: new Date("2026-02-15"),
    });

    assert.equal(monthlyDue.dueAmount, 3000);
    assert.equal(monthlyDue.principalUsed, 100000);
    assert.equal(monthlyDue.periodDays, 31);
  });

  it("allocates a partial interest payment and leaves the correct pending balance", () => {
    const allocation = allocatePayment(1500, [
      {
        id: "feb-interest",
        dueAmount: 3000,
        paidAmount: 0,
        waivedAmount: 0,
        status: DueStatus.PENDING,
      },
    ]);

    assert.deepEqual(allocation.allocations, [
      { dueId: "feb-interest", amount: 1500 },
    ]);
    assert.equal(allocation.totalAllocated, 1500);
    assert.equal(allocation.unallocated, 0);

    const summary = calculateLoanSummary({
      originalPrincipal: 100000,
      currentPrincipal: 100000,
      dues: [
        {
          dueAmount: 3000,
          paidAmount: 1500,
          waivedAmount: 0,
          penaltyAmount: 0,
          status: DueStatus.PARTIAL,
        },
      ],
    });

    assert.equal(summary.totalInterestCharged, 3000);
    assert.equal(summary.totalInterestReceived, 1500);
    assert.equal(summary.pendingInterest, 1500);
    assert.equal(summary.collectionRate, 50);
  });

  it("tracks multiple partial payments against the same due", () => {
    const firstPayment = allocatePayment(1200, [
      {
        id: "march-interest",
        dueAmount: 3000,
        paidAmount: 0,
        waivedAmount: 0,
        status: DueStatus.PENDING,
      },
    ]);

    assert.equal(firstPayment.totalAllocated, 1200);
    assert.equal(firstPayment.unallocated, 0);

    const secondPayment = allocatePayment(1300, [
      {
        id: "march-interest",
        dueAmount: 3000,
        paidAmount: 1200,
        waivedAmount: 0,
        status: DueStatus.PARTIAL,
      },
    ]);

    assert.deepEqual(secondPayment.allocations, [
      { dueId: "march-interest", amount: 1300 },
    ]);

    const finalPayment = allocatePayment(800, [
      {
        id: "march-interest",
        dueAmount: 3000,
        paidAmount: 2500,
        waivedAmount: 0,
        status: DueStatus.PARTIAL,
      },
    ]);

    assert.deepEqual(finalPayment.allocations, [
      { dueId: "march-interest", amount: 500 },
    ]);
    assert.equal(finalPayment.totalAllocated, 500);
    assert.equal(finalPayment.unallocated, 300);
  });
});

describe("loan creation and borrower ledger workflows", () => {
  it("creates a new loan, records disbursement, and generates initial dues", async () => {
    const createdLoans: any[] = [];
    const transactions: any[] = [];
    const auditLogs: any[] = [];
    const generatedDues: string[] = [];
    const revalidated: string[] = [];

    const mockPrisma = {
      borrower: {
        findFirst: async (args: any) => {
          assert.deepEqual(args.where, { id: "borrower-1", userId: "user-1" });
          return { id: "borrower-1", userId: "user-1" };
        },
      },
      loan: {
        create: async (args: any) => {
          createdLoans.push(args);
          return { id: "loan-new", ...args.data };
        },
      },
      loanTransaction: {
        create: async (args: any) => {
          transactions.push(args);
          return args.data;
        },
      },
      auditLog: {
        create: async (args: any) => {
          auditLogs.push(args);
          return args.data;
        },
      },
    };

    const { createLoanAction } = loadLoanActions(mockPrisma, {
      generateLoanNumber: () => "LN-2026-1001",
      generateDuesForLoan: async (loanId: string) => {
        generatedDues.push(loanId);
        return { generated: 3, errors: [] };
      },
      revalidatePath: (path: string) => revalidated.push(path),
    });

    const startDate = new Date("2026-06-01");
    const result = await createLoanAction({
      borrowerId: "borrower-1",
      principalAmount: 100000,
      interestRate: 3,
      interestType: "SIMPLE" as any,
      loanFrequency: LoanFrequency.MONTHLY,
      startDate,
      dueDay: 1,
    });

    assert.deepEqual(result, { loanId: "loan-new" });
    assert.equal(createdLoans[0].data.loanNumber, "LN-2026-1001");
    assert.equal(createdLoans[0].data.principalAmount, 100000);
    assert.equal(createdLoans[0].data.currentPrincipal, 100000);
    assert.equal(transactions[0].data.type, "PRINCIPAL_DISBURSEMENT");
    assert.equal(transactions[0].data.principalBefore, 0);
    assert.equal(transactions[0].data.principalAfter, 100000);
    assert.deepEqual(generatedDues, ["loan-new"]);
    assert.equal(auditLogs[0].data.action, "LOAN_CREATED");
    assert.deepEqual(revalidated, ["/borrowers/borrower-1", "/loans"]);
  });

  it("loads multiple loans for the same borrower without mixing other users' records", async () => {
    const mockPrisma = {
      borrower: {
        findFirst: async (args: any) => {
          assert.deepEqual(args.where, { id: "borrower-1", userId: "user-1" });
          return {
            id: "borrower-1",
            userId: "user-1",
            fullName: "Raj Kumar",
            loans: [
              {
                id: "loan-a",
                currentPrincipal: 100000,
                interestDues: [],
                payments: [],
                transactions: [],
                cheques: [],
              },
              {
                id: "loan-b",
                currentPrincipal: 50000,
                interestDues: [],
                payments: [],
                transactions: [],
                cheques: [],
              },
            ],
            messages: [],
          };
        },
      },
    };

    const { getBorrowerLedgerAction } = loadBorrowerActions(mockPrisma);
    const borrower = await getBorrowerLedgerAction("borrower-1");

    assert.equal(borrower.fullName, "Raj Kumar");
    assert.equal(borrower.loans.length, 2);
    assert.deepEqual(
      borrower.loans.map((loan: any) => loan.id),
      ["loan-a", "loan-b"]
    );
  });
});

describe("principal workflows", () => {
  it("records principal repayment and regenerates future dues with the reduced principal", async () => {
    const updates: any[] = [];
    const transactions: any[] = [];
    const auditLogs: any[] = [];
    const dueCalls: any[] = [];
    const repaymentDate = new Date("2026-03-10");

    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      loan: {
        findUnique: async () => ({
          id: "loan-1",
          currentPrincipal: 100000,
        }),
        update: async (args: any) => {
          updates.push(args);
          return args.data;
        },
      },
      loanTransaction: {
        create: async (args: any) => {
          transactions.push(args);
          return args.data;
        },
      },
      auditLog: {
        create: async (args: any) => {
          auditLogs.push(args);
          return args.data;
        },
      },
    };

    const { recordPrincipalRepayment } = loadPaymentEngine(mockPrisma, {
      regenerateFutureDues: async (loanId: string, fromDate: Date) => {
        dueCalls.push({ type: "regenerate", loanId, fromDate });
      },
      stopDueGeneration: async (loanId: string) => {
        dueCalls.push({ type: "stop", loanId });
      },
    });

    const result = await recordPrincipalRepayment(
      {
        loanId: "loan-1",
        amount: 25000,
        repaymentDate,
        notes: "Borrower paid principal from business sale",
      },
      "user-1"
    );

    assert.deepEqual(result, { newPrincipal: 75000, loanClosed: false });
    assert.equal(transactions[0].data.principalBefore, 100000);
    assert.equal(transactions[0].data.principalAfter, 75000);
    assert.equal(updates[0].data.currentPrincipal, 75000);
    assert.equal(updates[0].data.status, LoanStatus.ACTIVE);
    assert.deepEqual(dueCalls, [
      { type: "regenerate", loanId: "loan-1", fromDate: repaymentDate },
    ]);
    assert.equal(auditLogs[0].data.details.loanClosed, false);
  });

  it("recalculates future pending dues after principal repayment while preserving paid dues", async () => {
    const deletedQueries: any[] = [];
    const createdDues: any[] = [];
    const existingDueChecks: any[] = [];
    const repaymentDate = new Date("2026-06-15");

    const mockPrisma = {
      interestDue: {
        deleteMany: async (args: any) => {
          deletedQueries.push(args);
          return { count: 2 };
        },
        findFirst: async (args: any) => {
          existingDueChecks.push(args);
          return null;
        },
        create: async (args: any) => {
          createdDues.push(args.data);
          return args.data;
        },
      },
      loan: {
        findUnique: async () => ({
          id: "loan-1",
          status: LoanStatus.ACTIVE,
          currentPrincipal: 75000,
          interestRate: 3,
          interestType: "SIMPLE",
          loanFrequency: LoanFrequency.MONTHLY,
          dueDay: 1,
          startDate: new Date("2026-01-01"),
          interestDues: [
            {
              id: "paid-june-due",
              dueDate: new Date("2026-06-01"),
              status: DueStatus.PAID,
            },
          ],
        }),
      },
    };

    const { regenerateFutureDues } = loadDueEngine(mockPrisma);
    const result = await regenerateFutureDues(
      "loan-1",
      repaymentDate,
      new Date("2026-09-01")
    );

    assert.equal(result.deleted, 2);
    assert.equal(result.generated, 3);
    assert.deepEqual(deletedQueries[0].where, {
      loanId: "loan-1",
      dueDate: { gte: startOfDay(repaymentDate) },
      status: DueStatus.PENDING,
    });
    assert.deepEqual(
      createdDues.map((due) => ({
        dueDate: due.dueDate,
        dueAmount: due.dueAmount,
        principalAtTime: due.principalAtTime,
      })),
      [
        { dueDate: startOfDay(new Date("2026-07-01")), dueAmount: 2250, principalAtTime: 75000 },
        { dueDate: startOfDay(new Date("2026-08-01")), dueAmount: 2250, principalAtTime: 75000 },
        { dueDate: startOfDay(new Date("2026-09-01")), dueAmount: 2250, principalAtTime: 75000 },
      ]
    );
    assert.equal(existingDueChecks.length, 3);
  });

  it("recalculates future partial dues after principal repayment while preserving paid amounts", async () => {
    const deletedQueries: any[] = [];
    const updatedDues: any[] = [];
    const createdDues: any[] = [];
    const existingDueChecks: any[] = [];
    const repaymentDate = new Date("2026-06-15");
    const julyDueDate = startOfDay(new Date("2026-07-01"));
    const augustDueDate = startOfDay(new Date("2026-08-01"));
    const septemberDueDate = startOfDay(new Date("2026-09-01"));

    const existingPartialDues = [
      {
        id: "partial-july-due",
        loanId: "loan-1",
        dueDate: julyDueDate,
        periodStart: startOfDay(new Date("2026-06-01")),
        periodEnd: julyDueDate,
        principalAtTime: 100000,
        interestRate: 3,
        dueAmount: 3000,
        paidAmount: 1000,
        waivedAmount: 0,
        penaltyAmount: 0,
        status: DueStatus.PARTIAL,
        daysOverdue: 0,
      },
      {
        id: "partial-august-due",
        loanId: "loan-1",
        dueDate: augustDueDate,
        periodStart: julyDueDate,
        periodEnd: augustDueDate,
        principalAtTime: 100000,
        interestRate: 3,
        dueAmount: 3000,
        paidAmount: 2300,
        waivedAmount: 0,
        penaltyAmount: 0,
        status: DueStatus.PARTIAL,
        daysOverdue: 0,
      },
    ];

    const mockPrisma = {
      interestDue: {
        deleteMany: async (args: any) => {
          deletedQueries.push(args);
          return { count: 1 };
        },
        findFirst: async (args: any) => {
          existingDueChecks.push(args);
          const dueDate = startOfDay(args.where.dueDate).getTime();
          return existingPartialDues.find((due) => due.dueDate.getTime() === dueDate) || null;
        },
        create: async (args: any) => {
          createdDues.push(args.data);
          return args.data;
        },
        update: async (args: any) => {
          updatedDues.push(args);
          return args.data;
        },
      },
      loan: {
        findUnique: async () => ({
          id: "loan-1",
          status: LoanStatus.ACTIVE,
          currentPrincipal: 75000,
          interestRate: 3,
          interestType: "SIMPLE",
          loanFrequency: LoanFrequency.MONTHLY,
          dueDay: 1,
          startDate: new Date("2026-01-01"),
          interestDues: existingPartialDues,
        }),
      },
    };

    const { regenerateFutureDues } = loadDueEngine(mockPrisma);
    const result = await regenerateFutureDues(
      "loan-1",
      repaymentDate,
      septemberDueDate
    );

    assert.equal(result.deleted, 1);
    assert.equal(result.generated, 1);
    assert.deepEqual(deletedQueries[0].where, {
      loanId: "loan-1",
      dueDate: { gte: startOfDay(repaymentDate) },
      status: DueStatus.PENDING,
    });

    const julyUpdate = updatedDues.find((update) => update.where.id === "partial-july-due");
    assert.equal(julyUpdate.data.dueAmount, 2250);
    assert.equal(julyUpdate.data.principalAtTime, 75000);
    assert.equal(julyUpdate.data.status, DueStatus.PARTIAL);
    assert.equal("paidAmount" in julyUpdate.data, false);
    assert.equal(2250 - existingPartialDues[0].paidAmount, 1250);

    const augustUpdate = updatedDues.find((update) => update.where.id === "partial-august-due");
    assert.equal(augustUpdate.data.dueAmount, 2250);
    assert.equal(augustUpdate.data.status, DueStatus.PAID);
    assert.equal("paidAmount" in augustUpdate.data, false);

    assert.deepEqual(
      createdDues.map((due) => ({
        dueDate: due.dueDate,
        dueAmount: due.dueAmount,
        principalAtTime: due.principalAtTime,
      })),
      [
        { dueDate: septemberDueDate, dueAmount: 2250, principalAtTime: 75000 },
      ]
    );
    assert.equal(existingDueChecks.length, 3);
  });

  it("records loan top-up and regenerates future dues with the increased principal", async () => {
    const updates: any[] = [];
    const transactions: any[] = [];
    const dueCalls: any[] = [];
    const topUpDate = new Date("2026-04-05");

    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      loan: {
        findUnique: async () => ({
          id: "loan-2",
          currentPrincipal: 75000,
        }),
        update: async (args: any) => {
          updates.push(args);
          return args.data;
        },
      },
      loanTransaction: {
        create: async (args: any) => {
          transactions.push(args);
          return args.data;
        },
      },
      auditLog: {
        create: async (args: any) => args.data,
      },
    };

    const { recordLoanTopUp } = loadPaymentEngine(mockPrisma, {
      regenerateFutureDues: async (loanId: string, fromDate: Date) => {
        dueCalls.push({ loanId, fromDate });
      },
      stopDueGeneration: async () => undefined,
    });

    const result = await recordLoanTopUp(
      {
        loanId: "loan-2",
        amount: 25000,
        topUpDate,
        notes: "Additional working capital",
      },
      "user-1"
    );

    assert.deepEqual(result, { newPrincipal: 100000 });
    assert.equal(transactions[0].data.principalBefore, 75000);
    assert.equal(transactions[0].data.principalAfter, 100000);
    assert.equal(updates[0].data.currentPrincipal, 100000);
    assert.deepEqual(dueCalls, [{ loanId: "loan-2", fromDate: topUpDate }]);
  });

  it("closes a loan after full principal repayment and stops future due generation", async () => {
    const updates: any[] = [];
    const dueCalls: any[] = [];
    const repaymentDate = new Date("2026-05-12");

    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      loan: {
        findUnique: async () => ({
          id: "loan-3",
          currentPrincipal: 50000,
        }),
        update: async (args: any) => {
          updates.push(args);
          return args.data;
        },
      },
      loanTransaction: {
        create: async (args: any) => args.data,
      },
      auditLog: {
        create: async (args: any) => args.data,
      },
    };

    const { recordPrincipalRepayment } = loadPaymentEngine(mockPrisma, {
      regenerateFutureDues: async (loanId: string) => {
        dueCalls.push({ type: "regenerate", loanId });
      },
      stopDueGeneration: async (loanId: string) => {
        dueCalls.push({ type: "stop", loanId });
      },
    });

    const result = await recordPrincipalRepayment(
      {
        loanId: "loan-3",
        amount: 50000,
        repaymentDate,
      },
      "user-1"
    );

    assert.deepEqual(result, { newPrincipal: 0, loanClosed: true });
    assert.equal(updates[0].data.currentPrincipal, 0);
    assert.equal(updates[0].data.status, LoanStatus.CLOSED);
    assert.ok(updates[0].data.closedAt instanceof Date);
    assert.deepEqual(dueCalls, [{ type: "stop", loanId: "loan-3" }]);
  });
});

describe("overdue detection", () => {
  it("marks pending and partial past dues as overdue and updates days overdue", async () => {
    const updateManyCalls: any[] = [];
    const updateCalls: any[] = [];
    const today = startOfDay(new Date());
    const threeDaysAgo = subDays(today, 3);
    const yesterday = subDays(today, 1);

    const mockPrisma = {
      interestDue: {
        updateMany: async (args: any) => {
          updateManyCalls.push(args);
          return { count: 2 };
        },
        findMany: async () => [
          { id: "due-1", dueDate: threeDaysAgo },
          { id: "due-2", dueDate: yesterday },
        ],
        update: async (args: any) => {
          updateCalls.push(args);
          return args.data;
        },
      },
    };

    const { updateOverdueStatus } = loadDueEngine(mockPrisma);
    const result = await updateOverdueStatus();

    assert.deepEqual(result, { updated: 2 });
    assert.deepEqual(updateManyCalls[0].where.status.in, [
      DueStatus.PENDING,
      DueStatus.PARTIAL,
    ]);
    assert.equal(updateManyCalls[0].data.status, DueStatus.OVERDUE);
    assert.equal(updateCalls[0].where.id, "due-1");
    assert.equal(updateCalls[0].data.daysOverdue, 3);
    assert.equal(updateCalls[1].where.id, "due-2");
    assert.equal(updateCalls[1].data.daysOverdue, 1);
  });
});

describe("dashboard statistics", () => {
  it("counts interest cash received by payment date, including payments against future dues", async () => {
    const paymentQueries: any[] = [];
    const currentMonthPayment = 2000;
    const futureDuePaidAmount = 2000;
    const currentDuePaidAmount = 500;

    const mockPrisma = {
      loan: {
        findMany: async () => [
          { currentPrincipal: 100000, interestRate: 3, loanFrequency: LoanFrequency.MONTHLY },
        ],
        count: async () => 0,
      },
      borrower: {
        count: async () => 1,
      },
      interestDue: {
        findMany: async (args: any) => {
          if (args.where.dueDate) {
            return [
              {
                dueAmount: 3000,
                paidAmount: currentDuePaidAmount,
                waivedAmount: 0,
                status: DueStatus.PARTIAL,
              },
            ];
          }

          if (args.where.status === DueStatus.OVERDUE) {
            return [];
          }

          return [
            {
              dueAmount: 3000,
              paidAmount: currentDuePaidAmount,
              waivedAmount: 0,
            },
            {
              dueAmount: 3000,
              paidAmount: futureDuePaidAmount,
              waivedAmount: 0,
            },
          ];
        },
      },
      payment: {
        findMany: async (args: any) => {
          paymentQueries.push(args);
          return [
            { amount: currentMonthPayment },
            { amount: currentDuePaidAmount },
          ];
        },
      },
    };

    const { getDashboardStatsAction } = loadPaymentActions(mockPrisma);
    const stats = await getDashboardStatsAction();

    assert.deepEqual(paymentQueries[0].where.paymentDate.gte instanceof Date, true);
    assert.deepEqual(paymentQueries[0].where.paymentDate.lte instanceof Date, true);
    assert.deepEqual(paymentQueries[0].where.loan.borrower.userId, "user-1");
    assert.equal(stats.monthlyExpectedInterest, 3000);
    assert.equal(stats.interestReceivedThisMonth, 2500);
    assert.notEqual(stats.interestReceivedThisMonth, currentDuePaidAmount);
  });
});

describe("interest payment recording", () => {
  it("records an interest payment with allocation against the oldest overdue due", async () => {
    const payments: any[] = [];
    const allocations: any[] = [];
    const dueUpdates: any[] = [];

    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      interestDue: {
        findMany: async () => [
          {
            id: "older-overdue",
            dueAmount: 3000,
            paidAmount: 1000,
            waivedAmount: 0,
            status: DueStatus.OVERDUE,
          },
          {
            id: "current-pending",
            dueAmount: 3000,
            paidAmount: 0,
            waivedAmount: 0,
            status: DueStatus.PENDING,
          },
        ],
        update: async (args: any) => {
          dueUpdates.push(args);
          return args.data;
        },
      },
      payment: {
        create: async (args: any) => {
          payments.push(args);
          return { id: "payment-1", ...args.data };
        },
      },
      paymentAllocation: {
        create: async (args: any) => {
          allocations.push(args);
          return args.data;
        },
      },
      auditLog: {
        create: async (args: any) => args.data,
      },
    };

    const { recordPayment } = loadPaymentEngine(mockPrisma, {
      regenerateFutureDues: async () => undefined,
      stopDueGeneration: async () => undefined,
    });

    const result = await recordPayment(
      {
        loanId: "loan-4",
        amount: 2500,
        paymentDate: new Date("2026-06-01"),
        paymentMethod: PaymentMethod.CASH,
      },
      "user-1"
    );

    assert.equal(result.allocated, 2500);
    assert.equal(result.unallocated, 0);
    assert.equal(payments[0].data.amount, 2500);
    assert.deepEqual(
      allocations.map((a) => ({
        dueId: a.data.dueId,
        allocatedAmount: a.data.allocatedAmount,
      })),
      [
        { dueId: "older-overdue", allocatedAmount: 2000 },
        { dueId: "current-pending", allocatedAmount: 500 },
      ]
    );
    assert.equal(dueUpdates[0].data.status, DueStatus.PAID);
    assert.equal(dueUpdates[1].data.status, DueStatus.PARTIAL);
  });
});

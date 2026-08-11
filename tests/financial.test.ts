import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { startOfDay, subDays } from "date-fns";
import { CompoundingRule, DueStatus, InterestType, LoanFrequency, LoanStatus, MessageType, PaymentMethod } from "@prisma/client";
import {
  allocatePayment,
  calculateCapitalizedInterest,
  calculateEffectivePrincipal,
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

  if (mockPrisma?.loan && !mockPrisma.loan.findFirst && mockPrisma.loan.findUnique) {
    mockPrisma.loan.findFirst = mockPrisma.loan.findUnique;
  }

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
  const whatsappPath = require.resolve("../src/features/whatsapp");

  delete require.cache[prismaPath];
  delete require.cache[authPath];
  delete require.cache[nextCachePath];
  delete require.cache[paymentActionsPath];
  delete require.cache[paymentEnginePath];
  delete require.cache[whatsappPath];

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

function loadSettingsActions(mockPrisma: MockPrisma, options: any = {}) {
  const prismaPath = require.resolve("../src/lib/prisma");
  const authPath = require.resolve("../src/lib/auth");
  const nextCachePath = require.resolve("next/cache");
  const settingsActionsPath = require.resolve("../src/app/actions/settings");

  delete require.cache[prismaPath];
  delete require.cache[authPath];
  delete require.cache[nextCachePath];
  delete require.cache[settingsActionsPath];

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

  return require("../src/app/actions/settings");
}

function loadAuthActions(mockPrisma: MockPrisma, options: any = {}) {
  const prismaPath = require.resolve("../src/lib/prisma");
  const authPath = require.resolve("../src/lib/auth");
  const nextNavigationPath = require.resolve("next/navigation");
  const authActionsPath = require.resolve("../src/app/actions/auth");

  delete require.cache[prismaPath];
  delete require.cache[authPath];
  delete require.cache[nextNavigationPath];
  delete require.cache[authActionsPath];

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
      hashPassword: async (p: string) => `hashed_${p}`,
      verifyPassword: async (p: string, h: string) => h === `hashed_${p}`,
      createSessionToken: async (user: any) => `token_${user.id}`,
      setSessionCookie: async (t: string) => { options.savedToken = t; },
      clearSession: async () => { options.clearedSession = true; },
      getSession: async () => options.session || null,
    },
  } as NodeModule;

  require.cache[nextNavigationPath] = {
    id: nextNavigationPath,
    filename: nextNavigationPath,
    loaded: true,
    exports: {
      redirect: (url: string) => {
        options.redirectUrl = url;
        throw new Error(`NEXT_REDIRECT:${url}`);
      },
    },
  } as NodeModule;

  return require("../src/app/actions/auth");
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

  it("renders payment receipt allocation details for partial and multi-due payments", () => {
    const { renderPaymentReceiptMessage } = loadWhatsAppFeature({
      settings: { findUnique: async () => null },
    });

    const message = renderPaymentReceiptMessage(
      "{{allocationDetails}}",
      {
        borrowerName: "Rahul Sharma",
        amount: 4000,
        paymentDate: new Date("2026-07-15"),
        paymentMethod: "CASH",
        loanNumber: "LN-2026-1001",
        receiptNumber: "RCT-20260715-1001",
        remainingBalance: 2000,
        allocationDetails: [
          {
            dueId: "june-due",
            dueDate: new Date("2026-06-05"),
            periodStart: new Date("2026-05-05"),
            periodEnd: new Date("2026-06-05"),
            amountAllocated: 3000,
            remainingForDue: 0,
          },
          {
            dueId: "july-due",
            dueDate: new Date("2026-07-05"),
            periodStart: new Date("2026-06-05"),
            periodEnd: new Date("2026-07-05"),
            amountAllocated: 1000,
            remainingForDue: 2000,
          },
        ],
      }
    );

    assert.equal(
      message,
      "Interest Period: June 2026\nDue Date: 05 Jun 2026\nAmount Allocated: \u20b93,000\n\nInterest Period: July 2026\nDue Date: 05 Jul 2026\nAmount Allocated: \u20b91,000\nRemaining For This Due: \u20b92,000"
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
      userId: "user-1",
      phone: "98765 43210",
      borrowerName: "Gurjot Singh",
      amount: 2250,
      dueDate: new Date("2026-07-01"),
      loanNumber: "LN-2026-5005",
    });
    const url = new URL(link);

    assert.deepEqual(templateLookups[0].where, {
      userId_key: {
        userId: "user-1",
        key: `whatsapp_template_${MessageType.DUE_REMINDER}`,
      },
    });
    assert.equal(url.hostname, "wa.me");
    assert.equal(url.pathname, "/919876543210");
    assert.equal(
      url.searchParams.get("text"),
      "Reminder for Gurjot Singh\nAmount: \u20b92,250\nDue: 01 Jul 2026\nLoan: LN-2026-5005"
    );
  });

  it("reuses a preloaded template without changing WhatsApp link output", async () => {
    const template =
      "Reminder for {{borrowerName}}\nAmount: {{amount}}\nDue: {{dueDate}}\nLoan: {{loanNumber}}";
    let templateLookups = 0;
    const { buildDueReminderLink } = loadWhatsAppFeature({
      settings: {
        findUnique: async () => {
          templateLookups += 1;
          return { value: template };
        },
      },
    });

    const params = {
      userId: "user-1",
      phone: "98765 43210",
      borrowerName: "Gurjot Singh",
      amount: 2250,
      dueDate: new Date("2026-07-01"),
      loanNumber: "LN-2026-5005",
    };

    const linkFromSettings = await buildDueReminderLink(params);
    const linkFromPreloadedTemplate = await buildDueReminderLink(params, template);

    assert.equal(linkFromPreloadedTemplate, linkFromSettings);
    assert.equal(templateLookups, 1);
  });

  it("adds interest type to legacy saved templates without changing their stored content", () => {
    const { renderBalanceReminderMessage } = loadWhatsAppFeature({
      settings: { findUnique: async () => null },
    });
    const message = renderBalanceReminderMessage(
      "Loan {{loanNumber}} outstanding {{totalOutstanding}}",
      {
        borrowerName: "Rahul Sharma",
        loanNumber: "LN-COMPOUND",
        principal: 105000,
        pendingInterest: 0,
        totalOutstanding: 105000,
        interestType: "Compound Interest",
      }
    );

    assert.equal(
      message,
      "Loan LN-COMPOUND outstanding ₹1,05,000\n\nInterest Type: Compound Interest"
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

  it("derives compound effective principal only from unpaid capitalized interest", () => {
    const dues = [
      {
        dueAmount: 5000,
        paidAmount: 0,
        waivedAmount: 0,
        wasCompounded: true,
      },
      {
        dueAmount: 5250,
        paidAmount: 1000,
        waivedAmount: 0,
        wasCompounded: false,
      },
    ];

    assert.equal(calculateCapitalizedInterest(dues), 5000);
    assert.equal(
      calculateEffectivePrincipal(100000, InterestType.COMPOUND, dues),
      105000
    );
    assert.equal(
      calculateEffectivePrincipal(100000, InterestType.SIMPLE, dues),
      100000
    );
  });

  it("reduces effective principal when a capitalized due is partially paid", () => {
    const dues = [
      {
        dueAmount: 5000,
        paidAmount: 2000,
        waivedAmount: 0,
        wasCompounded: true,
      },
    ];

    assert.equal(calculateCapitalizedInterest(dues), 3000);
    assert.equal(
      calculateEffectivePrincipal(100000, InterestType.COMPOUND, dues),
      103000
    );
  });

  it("compounds multiple unpaid months and excludes fully paid interest", () => {
    const unpaidMonths = [
      { dueAmount: 5000, paidAmount: 0, waivedAmount: 0, wasCompounded: true },
      { dueAmount: 5250, paidAmount: 0, waivedAmount: 0, wasCompounded: true },
    ];
    const effectivePrincipal = calculateEffectivePrincipal(
      100000,
      InterestType.COMPOUND,
      unpaidMonths
    );

    assert.equal(effectivePrincipal, 110250);
    assert.equal(monthlyInterestAmount(effectivePrincipal, 5), 5512.5);
    assert.equal(
      calculateEffectivePrincipal(100000, InterestType.COMPOUND, [
        { dueAmount: 5000, paidAmount: 5000, waivedAmount: 0, wasCompounded: true },
      ]),
      100000
    );
  });

  it("combines reduced or topped-up base principal with previously capitalized interest", () => {
    const capitalizedDue = [
      { dueAmount: 5000, paidAmount: 1000, waivedAmount: 0, wasCompounded: true },
    ];

    assert.equal(
      calculateEffectivePrincipal(75000, InterestType.COMPOUND, capitalizedDue),
      79000
    );
    assert.equal(
      calculateEffectivePrincipal(125000, InterestType.COMPOUND, capitalizedDue),
      129000
    );
  });
});

describe("due lifecycle collectability", () => {
  const futureDue = {
    id: "july-interest",
    dueAmount: 3000,
    paidAmount: 0,
    waivedAmount: 0,
    status: DueStatus.PENDING,
    penaltyAmount: 0,
    dueDate: new Date("2026-07-15"),
  };

  it("does not treat a 15 July due as collectible on 20 June", () => {
    const summary = calculateLoanSummary({
      originalPrincipal: 100000,
      currentPrincipal: 100000,
      asOfDate: new Date("2026-06-20"),
      dues: [futureDue],
    });
    const allocation = allocatePayment(3000, [futureDue], new Date("2026-06-20"));

    assert.equal(summary.pendingInterest, 0);
    assert.equal(summary.overdueInterest, 0);
    assert.equal(allocation.totalAllocated, 0);
    assert.equal(allocation.unallocated, 3000);
  });

  it("treats a 15 July due as collectible on 15 July", () => {
    const summary = calculateLoanSummary({
      originalPrincipal: 100000,
      currentPrincipal: 100000,
      asOfDate: new Date("2026-07-15"),
      dues: [futureDue],
    });
    const allocation = allocatePayment(3000, [futureDue], new Date("2026-07-15"));

    assert.equal(summary.pendingInterest, 3000);
    assert.equal(summary.overdueInterest, 0);
    assert.equal(allocation.totalAllocated, 3000);
    assert.equal(allocation.unallocated, 0);
  });

  it("treats an unpaid 15 July due as overdue on 16 July", () => {
    const summary = calculateLoanSummary({
      originalPrincipal: 100000,
      currentPrincipal: 100000,
      asOfDate: new Date("2026-07-16"),
      dues: [futureDue],
    });

    assert.equal(summary.pendingInterest, 0);
    assert.equal(summary.overdueInterest, 3000);
  });

  it("excludes future generated dues from outstanding interest", () => {
    const summary = calculateLoanSummary({
      originalPrincipal: 100000,
      currentPrincipal: 100000,
      asOfDate: new Date("2026-06-15"),
      dues: [
        {
          dueAmount: 3000,
          paidAmount: 0,
          waivedAmount: 0,
          status: DueStatus.OVERDUE,
          penaltyAmount: 0,
          dueDate: new Date("2026-06-05"),
        },
        {
          dueAmount: 3000,
          paidAmount: 0,
          waivedAmount: 0,
          status: DueStatus.PENDING,
          penaltyAmount: 0,
          dueDate: new Date("2026-07-05"),
        },
        {
          dueAmount: 3000,
          paidAmount: 0,
          waivedAmount: 0,
          status: DueStatus.PENDING,
          penaltyAmount: 0,
          dueDate: new Date("2026-08-05"),
        },
      ],
    });

    assert.equal(summary.pendingInterest + summary.overdueInterest, 3000);
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
    assert.equal(createdLoans[0].data.interestType, InterestType.SIMPLE);
    assert.equal(transactions[0].data.type, "PRINCIPAL_DISBURSEMENT");
    assert.equal(transactions[0].data.principalBefore, 0);
    assert.equal(transactions[0].data.principalAfter, 100000);
    assert.deepEqual(generatedDues, ["loan-new"]);
    assert.equal(auditLogs[0].data.action, "LOAN_CREATED");
    assert.deepEqual(revalidated, ["/borrowers/borrower-1", "/loans"]);
  });

  it("persists COMPOUND exactly when selected", async () => {
    const createdLoans: any[] = [];
    const mockPrisma = {
      borrower: {
        findFirst: async () => ({ id: "borrower-1", userId: "user-1" }),
      },
      loan: {
        create: async (args: any) => {
          createdLoans.push(args);
          return { id: "loan-compound", ...args.data };
        },
      },
      loanTransaction: { create: async (args: any) => args.data },
      auditLog: { create: async (args: any) => args.data },
    };

    const { createLoanAction } = loadLoanActions(mockPrisma, {
      generateDuesForLoan: async () => ({ generated: 3, errors: [] }),
    });
    const result = await createLoanAction({
      borrowerId: "borrower-1",
      principalAmount: 100000,
      interestRate: 5,
      interestType: InterestType.COMPOUND,
      loanFrequency: LoanFrequency.MONTHLY,
      compoundingRule: CompoundingRule.MONTHLY,
      startDate: new Date("2026-07-01"),
      dueDay: 1,
    });

    assert.deepEqual(result, { loanId: "loan-compound" });
    assert.equal(createdLoans[0].data.interestType, InterestType.COMPOUND);
    assert.equal(createdLoans[0].data.compoundingRule, CompoundingRule.MONTHLY);
  });

  it("submits the selected loan form state instead of a stale default radio value", () => {
    const source = readFileSync(
      require.resolve("../src/app/loans/new/page.tsx"),
      "utf8"
    );

    assert.match(source, /interestType,\s*\n\s*loanFrequency/);
    assert.doesNotMatch(source, /fd\.get\("interestType"\)/);
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
      {
        type: "regenerate",
        loanId: "loan-1",
        fromDate: startOfDay(new Date("2026-03-11")),
      },
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

  it("uses reduced base principal plus capitalized interest for future compound dues", async () => {
    const createdDues: any[] = [];
    const repaymentDate = new Date("2026-06-15");
    const historicalDue = {
      id: "compounded-june",
      loanId: "loan-compound",
      dueDate: new Date("2026-06-01"),
      dueAmount: 5000,
      paidAmount: 1000,
      waivedAmount: 0,
      status: DueStatus.OVERDUE,
      wasCompounded: true,
    };
    const loan = {
      id: "loan-compound",
      status: LoanStatus.ACTIVE,
      currentPrincipal: 75000,
      interestRate: 5,
      interestType: InterestType.COMPOUND,
      loanFrequency: LoanFrequency.MONTHLY,
      dueDay: 1,
      startDate: new Date("2026-01-01"),
      interestDues: [historicalDue],
    };
    const mockPrisma = {
      loan: { findUnique: async () => loan },
      interestDue: {
        deleteMany: async () => ({ count: 1 }),
        findFirst: async () => null,
        create: async (args: any) => {
          createdDues.push(args.data);
          return args.data;
        },
        update: async (args: any) => args.data,
      },
    };

    const { regenerateFutureDues } = loadDueEngine(mockPrisma);
    await regenerateFutureDues(
      "loan-compound",
      repaymentDate,
      new Date("2026-07-01")
    );

    assert.equal(createdDues.length, 1);
    assert.equal(createdDues[0].principalAtTime, 79000);
    assert.equal(createdDues[0].dueAmount, 3950);
    assert.equal(historicalDue.dueAmount, 5000);
    assert.equal(historicalDue.paidAmount, 1000);
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
    assert.deepEqual(dueCalls, [
      { loanId: "loan-2", fromDate: startOfDay(new Date("2026-04-06")) },
    ]);
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

  it("keeps a compound loan open while capitalized interest remains unpaid", async () => {
    const updates: any[] = [];
    const dueCalls: any[] = [];
    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      loan: {
        findUnique: async () => ({
          id: "loan-compound",
          currentPrincipal: 50000,
          interestDues: [
            {
              dueAmount: 5000,
              paidAmount: 0,
              waivedAmount: 0,
              wasCompounded: true,
            },
          ],
        }),
        update: async (args: any) => {
          updates.push(args);
          return args.data;
        },
      },
      loanTransaction: { create: async (args: any) => args.data },
      auditLog: { create: async (args: any) => args.data },
    };
    const { recordPrincipalRepayment } = loadPaymentEngine(mockPrisma, {
      regenerateFutureDues: async (loanId: string) => dueCalls.push(loanId),
      stopDueGeneration: async () => {
        throw new Error("Loan must not close with capitalized interest outstanding");
      },
    });

    const result = await recordPrincipalRepayment(
      {
        loanId: "loan-compound",
        amount: 50000,
        repaymentDate: new Date("2026-07-06"),
      },
      "user-1"
    );

    assert.deepEqual(result, { newPrincipal: 0, loanClosed: false });
    assert.equal(updates[0].data.status, LoanStatus.ACTIVE);
    assert.deepEqual(dueCalls, ["loan-compound"]);
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

  it("capitalizes only unpaid overdue compound interest and preserves historical amounts", async () => {
    const today = startOfDay(new Date());
    const overdueDue = {
      id: "compound-overdue",
      loanId: "loan-compound",
      dueDate: subDays(today, 1),
      dueAmount: 5000,
      paidAmount: 1000,
      waivedAmount: 0,
      status: DueStatus.OVERDUE,
      wasCompounded: false,
    };
    const updates: any[] = [];
    const deletes: any[] = [];

    const loan = {
      id: "loan-compound",
      status: LoanStatus.ACTIVE,
      currentPrincipal: 100000,
      interestRate: 5,
      interestType: InterestType.COMPOUND,
      loanFrequency: LoanFrequency.MONTHLY,
      compoundingRule: CompoundingRule.MONTHLY,
      dueDay: 1,
      startDate: subDays(today, 32),
      interestDues: [overdueDue],
    };
    const mockPrisma = {
      loan: {
        findMany: async () => [loan],
        findUnique: async () => loan,
      },
      interestDue: {
        update: async (args: any) => {
          updates.push(args);
          overdueDue.wasCompounded = true;
          return { ...overdueDue, ...args.data };
        },
        deleteMany: async (args: any) => {
          deletes.push(args);
          return { count: 2 };
        },
        findFirst: async () => ({ id: "existing-future-due" }),
        create: async () => {
          throw new Error("Existing future dues should prevent duplicate creation");
        },
      },
    };

    const { capitalizeOverdueInterest } = loadDueEngine(mockPrisma);
    const result = await capitalizeOverdueInterest(today);

    assert.deepEqual(result, { capitalized: 1, loansUpdated: 1 });
    assert.deepEqual(updates[0].where, { id: "compound-overdue" });
    assert.equal(updates[0].data.wasCompounded, true);
    assert.equal(updates[0].data.compoundedAt, today);
    assert.equal("dueAmount" in updates[0].data, false);
    assert.equal("paidAmount" in updates[0].data, false);
    assert.deepEqual(deletes[0].where, {
      loanId: "loan-compound",
      dueDate: { gte: startOfDay(new Date(today.getTime() + 24 * 60 * 60 * 1000)) },
      status: DueStatus.PENDING,
    });
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

  it("uses collectible dues only for dashboard pending and overdue totals", async () => {
    const dueQueries: any[] = [];

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
          dueQueries.push(args);

          if (!args.where.status) {
            return [{ dueAmount: 3000, paidAmount: 1000, waivedAmount: 0, status: DueStatus.PARTIAL }];
          }

          if (args.where.dueDate?.lte || args.where.dueDate?.lt) {
            return [{ dueAmount: 3000, paidAmount: 1000, waivedAmount: 0 }];
          }

          return [];
        },
      },
      payment: {
        findMany: async () => [],
      },
    };

    const { getDashboardStatsAction } = loadPaymentActions(mockPrisma);
    const stats = await getDashboardStatsAction();

    const pendingQuery = dueQueries.find((query) => query.where.status?.in?.length === 2);
    const overdueQuery = dueQueries.find((query) => query.where.status?.in?.includes(DueStatus.OVERDUE));

    assert.deepEqual(pendingQuery.where.status.in, [DueStatus.PENDING, DueStatus.PARTIAL]);
    assert.ok(pendingQuery.where.dueDate.lte instanceof Date);
    assert.deepEqual(overdueQuery.where.status.in, [DueStatus.PENDING, DueStatus.PARTIAL, DueStatus.OVERDUE]);
    assert.ok(overdueQuery.where.dueDate.lt instanceof Date);
    assert.equal(stats.pendingInterest, 2000);
    assert.equal(stats.overdueInterest, 2000);
  });

  it("loads optimized dashboard data from shared due and payment queries without changing output shape", async () => {
    const queryCounts = {
      loanFindMany: 0,
      loanCount: 0,
      borrowerCount: 0,
      dueFindMany: 0,
      paymentFindMany: 0,
      settingsFindUnique: 0,
    };
    const today = startOfDay(new Date());
    const visibleTodayDue = {
      id: "due-today",
      loanId: "loan-1",
      dueDate: today,
      dueAmount: 3000,
      paidAmount: 1000,
      waivedAmount: 0,
      status: DueStatus.PARTIAL,
      daysOverdue: 0,
      loan: {
        id: "loan-1",
        loanNumber: "LN-2026-1001",
        currentPrincipal: 100000,
        borrower: { id: "borrower-1", fullName: "Rahul Sharma", mobile: "9876543210", isArchived: false },
      },
    };
    const visibleOverdueDue = {
      id: "due-overdue",
      loanId: "loan-1",
      dueDate: subDays(today, 10),
      dueAmount: 3000,
      paidAmount: 0,
      waivedAmount: 0,
      status: DueStatus.OVERDUE,
      daysOverdue: 10,
      loan: visibleTodayDue.loan,
    };
    const archivedOverdueDue = {
      id: "due-archived",
      loanId: "loan-2",
      dueDate: subDays(today, 5),
      dueAmount: 2000,
      paidAmount: 0,
      waivedAmount: 0,
      status: DueStatus.OVERDUE,
      daysOverdue: 5,
      loan: {
        id: "loan-2",
        loanNumber: "LN-2026-2002",
        currentPrincipal: 50000,
        borrower: { id: "borrower-2", fullName: "Archived Borrower", mobile: "9876500000", isArchived: true },
      },
    };

    const mockPrisma = {
      loan: {
        findMany: async () => {
          queryCounts.loanFindMany += 1;
          return [
            {
              currentPrincipal: 100000,
              interestRate: 3,
              interestType: InterestType.COMPOUND,
              loanFrequency: LoanFrequency.MONTHLY,
              interestDues: [
                {
                  dueAmount: 5000,
                  paidAmount: 0,
                  waivedAmount: 0,
                  wasCompounded: true,
                },
              ],
            },
            {
              currentPrincipal: 50000,
              interestRate: 2,
              interestType: InterestType.SIMPLE,
              loanFrequency: LoanFrequency.MONTHLY,
              interestDues: [],
            },
          ];
        },
        count: async () => {
          queryCounts.loanCount += 1;
          return 1;
        },
      },
      borrower: {
        count: async () => {
          queryCounts.borrowerCount += 1;
          return 1;
        },
      },
      interestDue: {
        findMany: async (args: any) => {
          queryCounts.dueFindMany += 1;
          if (args.where.status) {
            return [visibleTodayDue, visibleOverdueDue, archivedOverdueDue];
          }
          return [
            { dueAmount: 3000, paidAmount: 1000, waivedAmount: 0, status: DueStatus.PARTIAL },
            { dueAmount: 3000, paidAmount: 0, waivedAmount: 0, status: DueStatus.OVERDUE },
          ];
        },
      },
      payment: {
        findMany: async () => {
          queryCounts.paymentFindMany += 1;
          return [
            {
              id: "payment-1",
              amount: 1000,
              paymentDate: today,
              createdAt: today,
              loan: {
                loanNumber: "LN-2026-1001",
                borrower: { fullName: "Rahul Sharma", isArchived: false },
              },
            },
            {
              id: "payment-archived",
              amount: 500,
              paymentDate: today,
              createdAt: today,
              loan: {
                loanNumber: "LN-2026-2002",
                borrower: { fullName: "Archived Borrower", isArchived: true },
              },
            },
          ];
        },
      },
      settings: {
        findUnique: async () => {
          queryCounts.settingsFindUnique += 1;
          return null;
        },
      },
    };

    const { getDashboardDataAction } = loadPaymentActions(mockPrisma);
    const dashboard = await getDashboardDataAction();

    assert.deepEqual(queryCounts, {
      loanFindMany: 1,
      loanCount: 1,
      borrowerCount: 1,
      dueFindMany: 2,
      paymentFindMany: 1,
      settingsFindUnique: 2,
    });
    assert.equal(dashboard.stats.totalPrincipalLent, 155000);
    assert.equal(dashboard.stats.closedLoanCount, 1);
    assert.equal(dashboard.stats.activeBorrowerCount, 1);
    assert.equal(dashboard.stats.monthlyExpectedInterest, 6000);
    assert.equal(dashboard.stats.interestReceivedThisMonth, 1500);
    assert.equal(dashboard.stats.pendingInterest, 2000);
    assert.equal(dashboard.stats.overdueInterest, 5000);
    assert.equal(dashboard.stats.overdueCount, 2);
    assert.equal(dashboard.todayCollections.length, 1);
    assert.equal(dashboard.todayCollections[0].remainingAmount, 2000);
    assert.equal(dashboard.overdueAccounts.length, 1);
    assert.equal(dashboard.overdueAccounts[0].totalOverdue, 3000);
    assert.equal(dashboard.collectedToday.length, 1);
    assert.equal(dashboard.collectedToday[0].amount, 1000);
  });
});

describe("ownership isolation hardening", () => {
  it("scopes settings upsert by authenticated user", async () => {
    const upsertCalls: any[] = [];

    const { saveTemplateAction } = loadSettingsActions({
      settings: {
        upsert: async (args: any) => {
          upsertCalls.push(args);
          return args;
        },
      },
      auditLog: { create: async () => ({}) },
    });

    await saveTemplateAction(MessageType.DUE_REMINDER, "Template A");

    assert.deepEqual(upsertCalls[0].where, {
      userId_key: {
        userId: "user-1",
        key: `whatsapp_template_${MessageType.DUE_REMINDER}`,
      },
    });
    assert.equal(upsertCalls[0].create.userId, "user-1");
  });

  it("rejects principal repayment when loan does not belong to authenticated user", async () => {
    const { recordPrincipalRepayment } = loadPaymentEngine({
      $transaction: async (callback: any) => callback({
        loan: {
          findFirst: async () => null,
        },
      }),
    }, {
      regenerateFutureDues: async () => undefined,
      stopDueGeneration: async () => undefined,
    });

    await assert.rejects(
      recordPrincipalRepayment(
        {
          loanId: "foreign-loan",
          amount: 1000,
          repaymentDate: new Date("2026-08-11"),
        },
        "user-a"
      ),
      /Loan not found/
    );
  });

  it("rejects loan top-up when loan does not belong to authenticated user", async () => {
    const { recordLoanTopUp } = loadPaymentEngine({
      $transaction: async (callback: any) => callback({
        loan: {
          findFirst: async () => null,
        },
      }),
    }, {
      regenerateFutureDues: async () => undefined,
      stopDueGeneration: async () => undefined,
    });

    await assert.rejects(
      recordLoanTopUp(
        {
          loanId: "foreign-loan",
          amount: 1000,
          topUpDate: new Date("2026-08-11"),
        },
        "user-a"
      ),
      /Loan not found/
    );
  });

  it("rejects due regeneration for a loan outside user ownership", async () => {
    const { regenerateFutureDues } = loadDueEngine({
      loan: {
        findFirst: async () => null,
      },
      interestDue: {
        deleteMany: async () => ({ count: 0 }),
      },
    });

    await assert.rejects(
      regenerateFutureDues(
        "foreign-loan",
        new Date("2026-08-11"),
        undefined,
        { userId: "user-a" }
      ),
      /Loan not found/
    );
  });

  it("rejects stop due generation for a loan outside user ownership", async () => {
    const { stopDueGeneration } = loadDueEngine({
      loan: {
        findFirst: async () => null,
      },
      interestDue: {
        deleteMany: async () => ({ count: 0 }),
      },
    });

    await assert.rejects(
      stopDueGeneration("foreign-loan", { userId: "user-a" }),
      /Loan not found/
    );
  });
});

describe("screen data source filters", () => {
  it("loads today's collections from dues due today and still excludes paid dues", async () => {
    const dueQueries: any[] = [];
    const mockPrisma = {
      interestDue: {
        findMany: async (args: any) => {
          dueQueries.push(args);
          return [
            {
              id: "due-today",
              loanId: "loan-1",
              dueDate: new Date(),
              dueAmount: 3000,
              paidAmount: 1000,
              waivedAmount: 0,
              status: DueStatus.PARTIAL,
              loan: {
                id: "loan-1",
                loanNumber: "LN-2026-1001",
                borrower: { id: "borrower-1", fullName: "Rahul Sharma", mobile: "9876543210" },
              },
            },
          ];
        },
      },
      settings: { findUnique: async () => null },
    };

    const { getTodayCollectionsAction } = loadPaymentActions(mockPrisma);
    const collections = await getTodayCollectionsAction();

    assert.deepEqual(dueQueries[0].where.status.in, [DueStatus.PENDING, DueStatus.PARTIAL]);
    assert.ok(dueQueries[0].where.dueDate.gte instanceof Date);
    assert.ok(dueQueries[0].where.dueDate.lte instanceof Date);
    assert.equal(collections[0].remainingAmount, 2000);
    assert.ok(collections[0].whatsappLink);
  });

  it("keeps overdue dues actionable in overdue collections", async () => {
    const dueQueries: any[] = [];
    const mockPrisma = {
      interestDue: {
        findMany: async (args: any) => {
          dueQueries.push(args);
          return [
            {
              id: "due-overdue",
              loanId: "loan-1",
              dueDate: subDays(startOfDay(new Date()), 10),
              dueAmount: 3000,
              paidAmount: 1000,
              waivedAmount: 0,
              status: DueStatus.OVERDUE,
              daysOverdue: 10,
              loan: {
                id: "loan-1",
                loanNumber: "LN-2026-1001",
                currentPrincipal: 50000,
                borrower: { id: "borrower-1", fullName: "Rahul Sharma", mobile: "9876543210" },
              },
            },
          ];
        },
      },
      settings: { findUnique: async () => null },
    };

    const { getOverdueAccountsAction } = loadPaymentActions(mockPrisma);
    const accounts = await getOverdueAccountsAction();

    assert.deepEqual(dueQueries[0].where.status.in, [DueStatus.PENDING, DueStatus.PARTIAL, DueStatus.OVERDUE]);
    assert.ok(dueQueries[0].where.dueDate.lt instanceof Date);
    assert.equal(accounts[0].totalOverdue, 2000);
    assert.equal(accounts[0].overdueCount, 1);
    assert.ok(accounts[0].whatsappLink);
  });

  it("clamps current-month reports to today so future dues do not inflate pending totals", async () => {
    const dueQueries: any[] = [];
    const mockPrisma = {
      interestDue: {
        findMany: async (args: any) => {
          dueQueries.push(args);
          return [];
        },
      },
    };

    const { getMonthlyReportAction } = loadPaymentActions(mockPrisma);
    await getMonthlyReportAction("2026-06");

    assert.ok(dueQueries[0].where.dueDate.gte instanceof Date);
    assert.ok(dueQueries[0].where.dueDate.lte instanceof Date);
    assert.ok(dueQueries[0].where.dueDate.lte <= new Date());
  });

  it("loads borrower list summaries from current and overdue dues only", async () => {
    const borrowerQueries: any[] = [];
    const mockPrisma = {
      borrower: {
        findMany: async (args: any) => {
          borrowerQueries.push(args);
          return [];
        },
        count: async () => 0,
      },
    };

    const { getBorrowersAction } = loadBorrowerActions(mockPrisma);
    await getBorrowersAction();

    const dueWhere = borrowerQueries[0].include.loans.select.interestDues.where;
    assert.deepEqual(dueWhere.status.in, ["PENDING", "PARTIAL", "OVERDUE"]);
    assert.ok(dueWhere.dueDate.lte instanceof Date);
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

  it("marks a due today as paid after full payment", async () => {
    const dueUpdates: any[] = [];
    const today = new Date("2026-07-15");

    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      interestDue: {
        findMany: async () => [
          {
            id: "today-due",
            dueDate: today,
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
        create: async (args: any) => ({ id: "payment-today", receiptNumber: "RCT-20260715-1001", ...args.data }),
      },
      paymentAllocation: {
        create: async (args: any) => args.data,
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
        loanId: "loan-current",
        amount: 3000,
        paymentDate: today,
        paymentMethod: PaymentMethod.CASH,
      },
      "user-1"
    );

    assert.match(result.receiptNumber, /^RCT-/);
    assert.equal(result.allocated, 3000);
    assert.equal(dueUpdates[0].data.paidAmount, 3000);
    assert.equal(dueUpdates[0].data.status, DueStatus.PAID);
  });

  it("allocates a card-launched full payment to the selected due before older unpaid dues", async () => {
    const allocations: any[] = [];
    const dueUpdates: any[] = [];
    const paymentDate = new Date("2026-06-14");

    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      interestDue: {
        findMany: async () => [
          {
            id: "older-overdue",
            dueDate: new Date("2026-05-14"),
            periodStart: new Date("2026-04-14"),
            periodEnd: new Date("2026-05-14"),
            dueAmount: 3000,
            paidAmount: 0,
            waivedAmount: 0,
            status: DueStatus.OVERDUE,
          },
          {
            id: "selected-june",
            dueDate: new Date("2026-06-14"),
            periodStart: new Date("2026-05-14"),
            periodEnd: new Date("2026-06-14"),
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
        create: async (args: any) => ({ id: "payment-selected", receiptNumber: "RCT-20260614-2001", ...args.data }),
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
        loanId: "loan-selected",
        dueId: "selected-june",
        amount: 3000,
        paymentDate,
        paymentMethod: PaymentMethod.CASH,
      },
      "user-1"
    );

    assert.equal(result.allocated, 3000);
    assert.equal(result.unallocated, 0);
    assert.deepEqual(
      allocations.map((a) => ({ dueId: a.data.dueId, allocatedAmount: a.data.allocatedAmount })),
      [{ dueId: "selected-june", allocatedAmount: 3000 }]
    );
    assert.equal(dueUpdates[0].where.id, "selected-june");
    assert.equal(dueUpdates[0].data.paidAmount, 3000);
    assert.equal(dueUpdates[0].data.status, DueStatus.PAID);
  });

  it("allocates a card-launched partial payment to the selected due and leaves it partial", async () => {
    const allocations: any[] = [];
    const dueUpdates: any[] = [];
    const paymentDate = new Date("2026-06-14");

    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      interestDue: {
        findMany: async () => [
          {
            id: "older-overdue",
            dueDate: new Date("2026-05-14"),
            periodStart: new Date("2026-04-14"),
            periodEnd: new Date("2026-05-14"),
            dueAmount: 3000,
            paidAmount: 0,
            waivedAmount: 0,
            status: DueStatus.OVERDUE,
          },
          {
            id: "selected-june",
            dueDate: new Date("2026-06-14"),
            periodStart: new Date("2026-05-14"),
            periodEnd: new Date("2026-06-14"),
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
        create: async (args: any) => ({ id: "payment-partial-selected", receiptNumber: "RCT-20260614-2002", ...args.data }),
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
        loanId: "loan-selected",
        dueId: "selected-june",
        amount: 1000,
        paymentDate,
        paymentMethod: PaymentMethod.CASH,
      },
      "user-1"
    );

    assert.equal(result.allocated, 1000);
    assert.equal(result.unallocated, 0);
    assert.deepEqual(
      allocations.map((a) => ({ dueId: a.data.dueId, allocatedAmount: a.data.allocatedAmount })),
      [{ dueId: "selected-june", allocatedAmount: 1000 }]
    );
    assert.equal(dueUpdates[0].where.id, "selected-june");
    assert.equal(dueUpdates[0].data.paidAmount, 1000);
    assert.equal(dueUpdates[0].data.status, DueStatus.PARTIAL);
  });

  it("allocates selected due first, then sends overpayment through oldest-first rules", async () => {
    const allocations: any[] = [];
    const dueUpdates: any[] = [];
    const paymentDate = new Date("2026-06-14");

    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      interestDue: {
        findMany: async () => [
          {
            id: "older-overdue",
            dueDate: new Date("2026-05-14"),
            periodStart: new Date("2026-04-14"),
            periodEnd: new Date("2026-05-14"),
            dueAmount: 3000,
            paidAmount: 0,
            waivedAmount: 0,
            status: DueStatus.OVERDUE,
          },
          {
            id: "selected-june",
            dueDate: new Date("2026-06-14"),
            periodStart: new Date("2026-05-14"),
            periodEnd: new Date("2026-06-14"),
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
        create: async (args: any) => ({ id: "payment-overpay-selected", receiptNumber: "RCT-20260614-2003", ...args.data }),
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
        loanId: "loan-selected",
        dueId: "selected-june",
        amount: 5000,
        paymentDate,
        paymentMethod: PaymentMethod.UPI,
      },
      "user-1"
    );

    assert.equal(result.allocated, 5000);
    assert.equal(result.unallocated, 0);
    assert.deepEqual(
      allocations.map((a) => ({ dueId: a.data.dueId, allocatedAmount: a.data.allocatedAmount })),
      [
        { dueId: "selected-june", allocatedAmount: 3000 },
        { dueId: "older-overdue", allocatedAmount: 2000 },
      ]
    );
    assert.equal(dueUpdates[0].where.id, "selected-june");
    assert.equal(dueUpdates[0].data.status, DueStatus.PAID);
    assert.equal(dueUpdates[1].where.id, "older-overdue");
    assert.equal(dueUpdates[1].data.paidAmount, 2000);
    assert.equal(dueUpdates[1].data.status, DueStatus.PARTIAL);
  });

  it("keeps an overdue due collectible and marks it partial after partial payment", async () => {
    const dueQueries: any[] = [];
    const dueUpdates: any[] = [];
    const paymentDate = new Date("2026-06-15");

    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      interestDue: {
        findMany: async (args: any) => {
          dueQueries.push(args);
          return [
            {
              id: "overdue-due",
              dueDate: new Date("2026-06-05"),
              dueAmount: 3000,
              paidAmount: 0,
              waivedAmount: 0,
              status: DueStatus.OVERDUE,
            },
          ];
        },
        update: async (args: any) => {
          dueUpdates.push(args);
          return args.data;
        },
      },
      payment: {
        create: async (args: any) => ({ id: "payment-overdue", receiptNumber: "RCT-20260615-1002", ...args.data }),
      },
      paymentAllocation: {
        create: async (args: any) => args.data,
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
        loanId: "loan-overdue",
        amount: 1000,
        paymentDate,
        paymentMethod: PaymentMethod.UPI,
      },
      "user-1"
    );

    assert.deepEqual(dueQueries[0].where.dueDate, { lte: paymentDate });
    assert.equal(result.allocated, 1000);
    assert.equal(dueUpdates[0].data.paidAmount, 1000);
    assert.equal(dueUpdates[0].data.status, DueStatus.PARTIAL);
  });

  it("regenerates future compound dues after paying capitalized interest", async () => {
    const regenerationCalls: any[] = [];
    const paymentDate = new Date("2026-06-15");
    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      interestDue: {
        findMany: async () => [
          {
            id: "capitalized-due",
            dueDate: new Date("2026-06-05"),
            periodStart: new Date("2026-05-05"),
            periodEnd: new Date("2026-06-05"),
            dueAmount: 5000,
            paidAmount: 0,
            waivedAmount: 0,
            status: DueStatus.OVERDUE,
            wasCompounded: true,
          },
        ],
        update: async (args: any) => args.data,
      },
      payment: {
        create: async (args: any) => ({
          id: "payment-capitalized",
          receiptNumber: "RCT-COMPOUND",
          ...args.data,
        }),
      },
      paymentAllocation: { create: async (args: any) => args.data },
      auditLog: { create: async (args: any) => args.data },
    };

    const { recordPayment } = loadPaymentEngine(mockPrisma, {
      regenerateFutureDues: async (loanId: string, fromDate: Date) => {
        regenerationCalls.push({ loanId, fromDate });
      },
      stopDueGeneration: async () => undefined,
    });
    await recordPayment(
      {
        loanId: "loan-compound",
        amount: 2000,
        paymentDate,
        paymentMethod: PaymentMethod.CASH,
      },
      "user-1"
    );

    assert.equal(regenerationCalls.length, 1);
    assert.equal(regenerationCalls[0].loanId, "loan-compound");
    assert.equal(
      regenerationCalls[0].fromDate.getTime(),
      startOfDay(new Date("2026-06-16")).getTime()
    );
  });

  it("does not allocate payments to future dues before they become collectible", async () => {
    const allocations: any[] = [];
    const paymentDate = new Date("2026-06-20");

    const mockPrisma = {
      $transaction: async (callback: any) => callback(mockPrisma),
      interestDue: {
        findMany: async (args: any) => {
          assert.deepEqual(args.where.dueDate, { lte: paymentDate });
          return [];
        },
        update: async () => {
          throw new Error("Future due should not be updated");
        },
      },
      payment: {
        create: async (args: any) => ({ id: "payment-future", receiptNumber: "RCT-20260620-1003", ...args.data }),
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
        loanId: "loan-future",
        amount: 3000,
        paymentDate,
        paymentMethod: PaymentMethod.CASH,
      },
      "user-1"
    );

    assert.equal(result.allocated, 0);
    assert.equal(result.unallocated, 3000);
    assert.equal(allocations.length, 0);
  });

  it("returns a payment receipt WhatsApp link after recording payment", async () => {
    const revalidated: string[] = [];
    let loanFindCount = 0;

    const mockPrisma = {
      loan: {
        findFirst: async () => {
          loanFindCount++;
          if (loanFindCount === 1) return { id: "loan-receipt", borrowerId: "borrower-receipt" };
          return {
            id: "loan-receipt",
            loanNumber: "LN-2026-7007",
            principalAmount: 100000,
            currentPrincipal: 100000,
            borrower: {
              id: "borrower-receipt",
              fullName: "Gurjot Singh",
              mobile: "9876543210",
            },
            interestDues: [
              {
                dueAmount: 3000,
                paidAmount: 3000,
                waivedAmount: 0,
                status: DueStatus.PAID,
                penaltyAmount: 0,
                dueDate: new Date("2026-07-15"),
              },
            ],
          };
        },
      },
      settings: {
        findUnique: async () => ({
          value:
            "Dear {{borrowerName}}\n{{allocationDetails}}\nReceipt {{receiptNumber}} {{paymentDate}} {{amount}} {{paymentMethod}} {{loanNumber}} Remaining {{remainingBalance}}",
        }),
      },
    };

    const { recordPaymentAction } = loadPaymentActions(mockPrisma, {
      recordPayment: async () => ({
        paymentId: "payment-receipt",
        receiptNumber: "RCT-20260715-7007",
        allocated: 3000,
        unallocated: 0,
        allocationDetails: [
          {
            dueId: "due-july",
            dueDate: new Date("2026-07-15"),
            periodStart: new Date("2026-06-15"),
            periodEnd: new Date("2026-07-15"),
            amountAllocated: 3000,
            remainingForDue: 0,
          },
        ],
      }),
      revalidatePath: (path: string) => revalidated.push(path),
    });

    const result = await recordPaymentAction({
      loanId: "loan-receipt",
      amount: 3000,
      paymentDate: new Date("2026-07-15"),
      paymentMethod: PaymentMethod.CASH,
    });

    assert.equal(result.paymentId, "payment-receipt");
    assert.ok(result.receiptWhatsappLink);
    const url = new URL(result.receiptWhatsappLink);
    assert.equal(url.pathname, "/919876543210");
    assert.equal(
      url.searchParams.get("text"),
      "Dear Gurjot Singh\nInterest Period: July 2026\nDue Date: 15 Jul 2026\nAmount Allocated: \u20b93,000\nReceipt RCT-20260715-7007 15 Jul 2026 \u20b93,000 CASH LN-2026-7007 Remaining \u20b90\n\nInterest Type: Simple Interest"
    );
    assert.ok(revalidated.includes("/collections"));
    assert.ok(revalidated.includes("/dashboard"));
    assert.ok(revalidated.includes("/borrowers/borrower-receipt"));
  });
});

describe("registration and user onboarding", () => {
  it("rejects registration with invalid parameters", async () => {
    const { registerAction } = loadAuthActions({});

    const fdShortName = new FormData();
    fdShortName.set("name", "A");
    fdShortName.set("mobile", "9876543210");
    fdShortName.set("password", "password123");
    fdShortName.set("confirmPassword", "password123");
    const resShortName = await registerAction(fdShortName);
    assert.equal(resShortName.error, "Full name must be at least 2 characters long");

    const fdShortMobile = new FormData();
    fdShortMobile.set("name", "John Lender");
    fdShortMobile.set("mobile", "123");
    fdShortMobile.set("password", "password123");
    fdShortMobile.set("confirmPassword", "password123");
    const resShortMobile = await registerAction(fdShortMobile);
    assert.equal(resShortMobile.error, "Please enter a valid mobile number (at least 10 digits)");

    const fdShortPassword = new FormData();
    fdShortPassword.set("name", "John Lender");
    fdShortPassword.set("mobile", "9876543210");
    fdShortPassword.set("password", "short");
    fdShortPassword.set("confirmPassword", "short");
    const resShortPassword = await registerAction(fdShortPassword);
    assert.equal(resShortPassword.error, "Password must be at least 8 characters long");

    const fdMismatch = new FormData();
    fdMismatch.set("name", "John Lender");
    fdMismatch.set("mobile", "9876543210");
    fdMismatch.set("password", "password123");
    fdMismatch.set("confirmPassword", "different123");
    const resMismatch = await registerAction(fdMismatch);
    assert.equal(resMismatch.error, "Passwords do not match");
  });

  it("rejects registration if mobile number already exists", async () => {
    const { registerAction } = loadAuthActions({
      user: {
        findUnique: async () => ({ id: "existing-user", mobile: "9876543210" }),
      },
    });

    const fd = new FormData();
    fd.set("name", "John Lender");
    fd.set("mobile", "9876543210");
    fd.set("password", "password123");
    fd.set("confirmPassword", "password123");

    const result = await registerAction(fd);
    assert.equal(result.error, "An account with this mobile number already exists");
  });

  it("successfully registers new user, hashes password, and creates session", async () => {
    const createdUsers: any[] = [];
    const auditLogs: any[] = [];
    const options: any = {};

    const { registerAction } = loadAuthActions(
      {
        user: {
          findUnique: async () => null,
          create: async (args: any) => {
            const newUser = { id: "user-new", ...args.data };
            createdUsers.push(newUser);
            return newUser;
          },
          update: async () => ({}),
        },
        auditLog: {
          create: async (args: any) => {
            auditLogs.push(args.data);
            return args.data;
          },
        },
      },
      options
    );

    const fd = new FormData();
    fd.set("name", "New Lender");
    fd.set("mobile", "98765 99999");
    fd.set("password", "securePass123");
    fd.set("confirmPassword", "securePass123");

    await assert.rejects(
      async () => {
        await registerAction(fd);
      },
      (err: any) => err.message === "NEXT_REDIRECT:/dashboard"
    );

    assert.equal(createdUsers.length, 1);
    assert.equal(createdUsers[0].name, "New Lender");
    assert.equal(createdUsers[0].mobile, "9876599999");
    assert.equal(createdUsers[0].passwordHash, "hashed_securePass123");
    assert.equal(createdUsers[0].role, "ADMIN");
    assert.equal(createdUsers[0].isActive, true);
    assert.equal(options.savedToken, "token_user-new");
    assert.equal(options.redirectUrl, "/dashboard");
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].userId, "user-new");
  });

  it("handles login, wrong password, unknown mobile, and logout", async () => {
    const options: any = {};
    const auditLogs: any[] = [];

    const { loginAction, logoutAction } = loadAuthActions(
      {
        user: {
          findUnique: async ({ where }: any) => {
            if (where.mobile === "9876543210") {
              return {
                id: "user-1",
                name: "Existing Lender",
                mobile: "9876543210",
                passwordHash: "hashed_correctPass123",
                role: "ADMIN",
                isActive: true,
              };
            }
            return null;
          },
          update: async () => ({}),
        },
        auditLog: {
          create: async (args: any) => {
            auditLogs.push(args.data);
            return args.data;
          },
        },
      },
      options
    );

    // Unknown mobile
    const fdUnknown = new FormData();
    fdUnknown.set("mobile", "0000000000");
    fdUnknown.set("password", "correctPass123");
    const resUnknown = await loginAction(fdUnknown);
    assert.equal(resUnknown.error, "Invalid mobile number or password");

    // Wrong password
    const fdWrong = new FormData();
    fdWrong.set("mobile", "9876543210");
    fdWrong.set("password", "wrongPass");
    const resWrong = await loginAction(fdWrong);
    assert.equal(resWrong.error, "Invalid mobile number or password");

    // Correct login
    const fdValid = new FormData();
    fdValid.set("mobile", "9876543210");
    fdValid.set("password", "correctPass123");

    await assert.rejects(
      async () => {
        await loginAction(fdValid);
      },
      (err: any) => err.message === "NEXT_REDIRECT:/dashboard"
    );

    assert.equal(options.savedToken, "token_user-1");

    // Logout
    options.session = { id: "user-1" };
    await assert.rejects(
      async () => {
        await logoutAction();
      },
      (err: any) => err.message === "NEXT_REDIRECT:/login"
    );

    assert.equal(options.clearedSession, true);
  });

  it("enforces secure reset tokens, token hashing, rate limiting, and tokenVersion session invalidation", async () => {

    const utils = await import("@/utils");
    const token1 = utils.generateResetToken();
    const token2 = utils.generateResetToken();

    assert.notEqual(token1, token2);
    assert.equal(token1.length >= 64, true); // 32 bytes hex = 64 chars

    const hashed1 = utils.hashResetToken(token1);
    const hashed2 = utils.hashResetToken(token1);
    assert.equal(hashed1, hashed2);
    assert.notEqual(hashed1, token1);

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const testKey = "test_rate_limit_" + Date.now();
    for (let i = 0; i < 3; i++) {
      const res = checkRateLimit(testKey, 3, 60000);
      assert.equal(res.allowed, true);
    }
    const blockedRes = checkRateLimit(testKey, 3, 60000);
    assert.equal(blockedRes.allowed, false);
    assert.equal(blockedRes.retryAfterSeconds > 0, true);
  });

  it("configures required security headers in next.config.js", async () => {
    const nextConfig = require("../next.config.js");
    assert.equal(typeof nextConfig.headers, "function");

    const headerConfigs = await nextConfig.headers();
    assert.equal(headerConfigs.length > 0, true);
    assert.equal(headerConfigs[0].source, "/:path*");

    const headersList = headerConfigs[0].headers;
    const headerKeys = headersList.map((h: any) => h.key);

    assert.equal(headerKeys.includes("X-Content-Type-Options"), true);
    assert.equal(headerKeys.includes("X-Frame-Options"), true);
    assert.equal(headerKeys.includes("Referrer-Policy"), true);
    assert.equal(headerKeys.includes("Permissions-Policy"), true);

    const frameHeader = headersList.find((h: any) => h.key === "X-Frame-Options");
    assert.equal(frameHeader.value, "DENY");

    const nosniffHeader = headersList.find((h: any) => h.key === "X-Content-Type-Options");
    assert.equal(nosniffHeader.value, "nosniff");
  });

  it("handles SMS provider configuration, success, non-2xx, and network errors safely", async () => {
    const { sendPasswordResetSMS } = await import("@/lib/sms");
    const origEnv = process.env.NODE_ENV;
    const origFetch = global.fetch;

    try {
      // 1. Missing credentials in production -> fails with expected message
      (process.env as any).NODE_ENV = "production";
      delete process.env.SMS_PROVIDER_API_KEY;
      delete process.env.SMS_PROVIDER_URL;

      const resProdMissing = await sendPasswordResetSMS("9876543210", "raw_token_123");
      assert.equal(resProdMissing.success, false);
      assert.equal(resProdMissing.error, "Password reset delivery is not configured");

      // 2. Configured + HTTP 200 -> succeeds
      process.env.SMS_PROVIDER_API_KEY = "test_key";
      process.env.SMS_PROVIDER_URL = "https://sms.example.com/send";
      (global as any).fetch = async () => ({ ok: true, status: 200 });

      const resSuccess = await sendPasswordResetSMS("9876543210", "raw_token_123");
      assert.equal(resSuccess.success, true);

      // 3. Configured + HTTP 500 -> fails
      (global as any).fetch = async () => ({ ok: false, status: 500 });
      const res500 = await sendPasswordResetSMS("9876543210", "raw_token_123");
      assert.equal(res500.success, false);
      assert.equal(res500.error, "SMS dispatch failed");

      // 4. Network error -> fails gracefully
      (global as any).fetch = async () => { throw new Error("Network timeout"); };
      const resNetErr = await sendPasswordResetSMS("9876543210", "raw_token_123");
      assert.equal(resNetErr.success, false);
      assert.equal(resNetErr.error, "SMS dispatch network error");

    } finally {
      (process.env as any).NODE_ENV = origEnv;
      global.fetch = origFetch;
      delete process.env.SMS_PROVIDER_API_KEY;
      delete process.env.SMS_PROVIDER_URL;
    }
  });
});


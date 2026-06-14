// ============================================================
// WHATSAPP INTEGRATION
// Uses wa.me deep links — no API key required.
// Templates stored in Settings table, editable by lender.
// ============================================================

import { prisma } from "@/lib/prisma";
import { MessageType } from "@prisma/client";
import { createWhatsAppLink, fillTemplate, formatCurrency, formatDate } from "@/utils";
import { format } from "date-fns";
import type { PaymentAllocationDetail } from "@/types";

// ============================================================
// DEFAULT TEMPLATES
// ============================================================

export const DEFAULT_TEMPLATES: Record<MessageType, string> = {
  [MessageType.DUE_REMINDER]: `Dear {{borrowerName}},

Your interest payment of {{amount}} is scheduled for {{dueDate}} for loan {{loanNumber}}.

Please arrange payment on the due date.

Thank you`,

  [MessageType.BALANCE_REMINDER]: `Dear {{borrowerName}},

This is a reminder regarding your outstanding balance:

Loan: {{loanNumber}}
Principal Outstanding: {{principal}}
Pending Interest: {{pendingInterest}}
Total Outstanding: {{totalOutstanding}}

Please contact us to discuss repayment.

Thank you`,

  [MessageType.PAYMENT_RECEIPT]: `Dear {{borrowerName}},

Payment received. Thank you.

{{allocationDetails}}

Receipt Number: {{receiptNumber}}
Date: {{paymentDate}}
Amount Received: {{amount}}
Payment Method: {{paymentMethod}}
Loan Number: {{loanNumber}}
Remaining Pending Interest: {{remainingBalance}}

Thank you.`,

  [MessageType.ACCOUNT_STATEMENT]: `Dear {{borrowerName}},

Your account statement for loan {{loanNumber}}:

Principal: {{principal}}
Interest Rate: {{interestRate}}% monthly
Total Interest Paid: {{totalPaid}}
Pending Interest: {{pendingInterest}}
Outstanding Principal: {{outstandingPrincipal}}

For detailed statement, please contact us.

Thank you`,

  [MessageType.CUSTOM]: ``,
};

// ============================================================
// GET TEMPLATE (from DB or default)
// ============================================================

export async function getTemplate(type: MessageType): Promise<string> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: `whatsapp_template_${type}` },
    });
    return setting?.value || DEFAULT_TEMPLATES[type];
  } catch {
    return DEFAULT_TEMPLATES[type];
  }
}

// ============================================================
// TEMPLATE RENDERERS
// ============================================================

export function renderDueReminderMessage(
  template: string,
  params: {
    borrowerName: string;
    amount: number;
    dueDate: Date | string;
    loanNumber: string;
  }
): string {
  return fillTemplate(template, {
    borrowerName: params.borrowerName,
    amount: formatCurrency(params.amount),
    dueDate: formatDate(params.dueDate),
    loanNumber: params.loanNumber,
  });
}

export function renderPaymentReceiptMessage(
  template: string,
  params: {
    borrowerName: string;
    amount: number;
    paymentDate: Date | string;
    paymentMethod: string;
    loanNumber: string;
    receiptNumber: string;
    remainingBalance: number;
    allocationDetails?: PaymentAllocationDetail[];
  }
): string {
  const allocationDetails = formatAllocationDetails(params.allocationDetails || []);
  return fillTemplate(template, {
    borrowerName: params.borrowerName,
    amount: formatCurrency(params.amount),
    paymentDate: formatDate(params.paymentDate),
    paymentMethod: params.paymentMethod,
    loanNumber: params.loanNumber,
    receiptNumber: params.receiptNumber,
    remainingBalance: formatCurrency(params.remainingBalance),
    allocationDetails,
  });
}

export function formatAllocationDetails(allocations: PaymentAllocationDetail[]): string {
  if (allocations.length === 0) return "";

  return allocations
    .map((allocation) => {
      const lines = [
        `Interest Period: ${format(new Date(allocation.dueDate), "MMMM yyyy")}`,
        `Due Date: ${formatDate(allocation.dueDate)}`,
        `Amount Allocated: ${formatCurrency(allocation.amountAllocated)}`,
      ];

      if (allocation.remainingForDue > 0) {
        lines.push(`Remaining For This Due: ${formatCurrency(allocation.remainingForDue)}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export function renderBalanceReminderMessage(
  template: string,
  params: {
    borrowerName: string;
    loanNumber: string;
    principal: number;
    pendingInterest: number;
    totalOutstanding: number;
  }
): string {
  return fillTemplate(template, {
    borrowerName: params.borrowerName,
    loanNumber: params.loanNumber,
    principal: formatCurrency(params.principal),
    pendingInterest: formatCurrency(params.pendingInterest),
    totalOutstanding: formatCurrency(params.totalOutstanding),
  });
}

export function renderAccountStatementMessage(
  template: string,
  params: {
    borrowerName: string;
    loanNumber: string;
    principal: number;
    interestRate: number | string;
    totalPaid: number;
    pendingInterest: number;
    outstandingPrincipal: number;
  }
): string {
  return fillTemplate(template, {
    borrowerName: params.borrowerName,
    loanNumber: params.loanNumber,
    principal: formatCurrency(params.principal),
    interestRate: String(params.interestRate),
    totalPaid: formatCurrency(params.totalPaid),
    pendingInterest: formatCurrency(params.pendingInterest),
    outstandingPrincipal: formatCurrency(params.outstandingPrincipal),
  });
}

// ============================================================
// BUILD DUE REMINDER LINK
// ============================================================

export async function buildDueReminderLink(params: {
  phone: string;
  borrowerName: string;
  amount: number;
  dueDate: Date;
  loanNumber: string;
}, templateOverride?: string): Promise<string> {
  const template = templateOverride ?? await getTemplate(MessageType.DUE_REMINDER);
  const message = renderDueReminderMessage(template, params);
  return createWhatsAppLink(params.phone, message);
}

// ============================================================
// BUILD PAYMENT RECEIPT LINK
// ============================================================

export async function buildPaymentReceiptLink(params: {
  phone: string;
  borrowerName: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  loanNumber: string;
  receiptNumber: string;
  remainingBalance: number;
  allocationDetails?: PaymentAllocationDetail[];
}, templateOverride?: string): Promise<string> {
  const template = templateOverride ?? await getTemplate(MessageType.PAYMENT_RECEIPT);
  const message = renderPaymentReceiptMessage(template, params);
  return createWhatsAppLink(params.phone, message);
}

// ============================================================
// BUILD BALANCE REMINDER LINK
// ============================================================

export async function buildBalanceReminderLink(params: {
  phone: string;
  borrowerName: string;
  loanNumber: string;
  principal: number;
  pendingInterest: number;
  totalOutstanding: number;
}, templateOverride?: string): Promise<string> {
  const template = templateOverride ?? await getTemplate(MessageType.BALANCE_REMINDER);
  const message = renderBalanceReminderMessage(template, params);
  return createWhatsAppLink(params.phone, message);
}

// ============================================================
// BUILD ACCOUNT STATEMENT LINK
// ============================================================

export async function buildAccountStatementLink(params: {
  phone: string;
  borrowerName: string;
  loanNumber: string;
  principal: number;
  interestRate: number | string;
  totalPaid: number;
  pendingInterest: number;
  outstandingPrincipal: number;
}, templateOverride?: string): Promise<string> {
  const template = templateOverride ?? await getTemplate(MessageType.ACCOUNT_STATEMENT);
  const message = renderAccountStatementMessage(template, params);
  return createWhatsAppLink(params.phone, message);
}

// ============================================================
// LOG MESSAGE SENT
// ============================================================

export async function logMessageSent(params: {
  borrowerId: string;
  loanId?: string;
  messageType: MessageType;
  content: string;
}): Promise<void> {
  await prisma.messageLog.create({
    data: {
      borrowerId: params.borrowerId,
      loanId: params.loanId,
      messageType: params.messageType,
      content: params.content,
      wasDelivered: true, // We assume delivered (can't verify wa.me)
    },
  });
}

// ============================================================
// WHATSAPP INTEGRATION
// Uses wa.me deep links — no API key required.
// Templates stored in Settings table, editable by lender.
// ============================================================

import { prisma } from "@/lib/prisma";
import { MessageType } from "@prisma/client";
import { createWhatsAppLink, fillTemplate, formatCurrency, formatDate } from "@/utils";

// ============================================================
// DEFAULT TEMPLATES
// ============================================================

export const DEFAULT_TEMPLATES: Record<MessageType, string> = {
  [MessageType.DUE_REMINDER]: `Dear {{borrowerName}},

Your interest payment of {{amount}} is due on {{dueDate}} for loan {{loanNumber}}.

Please arrange payment at your earliest convenience.

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

Payment received. Thank you!

Receipt: {{receiptNumber}}
Date: {{paymentDate}}
Amount Received: {{amount}}
Payment Method: {{paymentMethod}}
Loan: {{loanNumber}}
Remaining Balance: {{remainingBalance}}

Thank you for your payment.`,

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
// BUILD DUE REMINDER LINK
// ============================================================

export async function buildDueReminderLink(params: {
  phone: string;
  borrowerName: string;
  amount: number;
  dueDate: Date;
  loanNumber: string;
}): Promise<string> {
  const template = await getTemplate(MessageType.DUE_REMINDER);
  const message = fillTemplate(template, {
    borrowerName: params.borrowerName,
    amount: formatCurrency(params.amount),
    dueDate: formatDate(params.dueDate),
    loanNumber: params.loanNumber,
  });
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
}): Promise<string> {
  const template = await getTemplate(MessageType.PAYMENT_RECEIPT);
  const message = fillTemplate(template, {
    borrowerName: params.borrowerName,
    amount: formatCurrency(params.amount),
    paymentDate: formatDate(params.paymentDate),
    paymentMethod: params.paymentMethod,
    loanNumber: params.loanNumber,
    receiptNumber: params.receiptNumber,
    remainingBalance: formatCurrency(params.remainingBalance),
  });
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
}): Promise<string> {
  const template = await getTemplate(MessageType.BALANCE_REMINDER);
  const message = fillTemplate(template, {
    borrowerName: params.borrowerName,
    loanNumber: params.loanNumber,
    principal: formatCurrency(params.principal),
    pendingInterest: formatCurrency(params.pendingInterest),
    totalOutstanding: formatCurrency(params.totalOutstanding),
  });
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

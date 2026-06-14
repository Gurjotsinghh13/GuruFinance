import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Prisma, PrismaClient } from "@prisma/client";

const CONFIRMATION_FLAG = "--confirm-delete-business-data";

type CountKey =
  | "borrowers"
  | "loans"
  | "interestDues"
  | "payments"
  | "paymentAllocations"
  | "loanTransactions"
  | "cheques"
  | "documents"
  | "messageLogs"
  | "auditLogs";

function loadDotEnv() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function assertConfirmed() {
  if (!process.argv.includes(CONFIRMATION_FLAG)) {
    console.error("Refusing to delete business data.");
    console.error(`Run again with ${CONFIRMATION_FLAG} after taking a verified database backup.`);
    process.exit(1);
  }
}

async function countBusinessData(
  prisma: PrismaClient | Prisma.TransactionClient
): Promise<Record<CountKey, number>> {
  const [
    borrowers,
    loans,
    interestDues,
    payments,
    paymentAllocations,
    loanTransactions,
    cheques,
    documents,
    messageLogs,
    auditLogs,
  ] = await Promise.all([
    prisma.borrower.count(),
    prisma.loan.count(),
    prisma.interestDue.count(),
    prisma.payment.count(),
    prisma.paymentAllocation.count(),
    prisma.loanTransaction.count(),
    prisma.cheque.count(),
    prisma.loanDocument.count(),
    prisma.messageLog.count(),
    prisma.auditLog.count(),
  ]);

  return {
    borrowers,
    loans,
    interestDues,
    payments,
    paymentAllocations,
    loanTransactions,
    cheques,
    documents,
    messageLogs,
    auditLogs,
  };
}

function printCounts(label: string, counts: Record<CountKey, number>) {
  console.log(`\n${label}`);
  console.table(counts);
}

async function main() {
  assertConfirmed();
  loadDotEnv();

  const prisma = new PrismaClient();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const before = await countBusinessData(tx);

      await tx.paymentAllocation.deleteMany();
      await tx.payment.deleteMany();
      await tx.cheque.deleteMany();
      await tx.loanDocument.deleteMany();
      await tx.messageLog.deleteMany();
      await tx.loanTransaction.deleteMany();
      await tx.interestDue.deleteMany();
      await tx.loan.deleteMany();
      await tx.borrower.deleteMany();
      await tx.auditLog.deleteMany();

      const after = await countBusinessData(tx);
      return { before, after };
    });

    printCounts("Counts before deletion", result.before);
    printCounts("Counts after deletion", result.after);
    console.log("\nCleanup complete.");
    console.log("Users, login credentials, sessions, settings, and WhatsApp templates were preserved.");
    console.log("This operation is reversible only by restoring a database backup.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error("\nCleanup failed. The transaction was rolled back.");
  console.error(error);
  process.exit(1);
});

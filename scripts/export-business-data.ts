import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

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

function serializeForJson(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (
    typeof value === "object" &&
    (
      value.constructor?.name === "Decimal" ||
      (
        typeof (value as { toNumber?: unknown }).toNumber === "function" &&
        Array.isArray((value as { d?: unknown }).d)
      )
    )
  ) {
    return (value as { toString: () => string }).toString();
  }
  if (Array.isArray(value)) return value.map(serializeForJson);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        serializeForJson(nestedValue),
      ])
    );
  }

  return value;
}

async function main() {
  loadDotEnv();

  const prisma = new PrismaClient();
  const backupDir = join(process.cwd(), "backups");
  const outputPath = join(backupDir, "pre-cleanup-export.json");

  try {
    const [
      borrowers,
      loans,
      interestDues,
      payments,
      paymentAllocations,
      loanTransactions,
    ] = await Promise.all([
      prisma.borrower.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.loan.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.interestDue.findMany({ orderBy: [{ loanId: "asc" }, { dueDate: "asc" }] }),
      prisma.payment.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.paymentAllocation.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.loanTransaction.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      recordCounts: {
        borrowers: borrowers.length,
        loans: loans.length,
        interestDues: interestDues.length,
        payments: payments.length,
        paymentAllocations: paymentAllocations.length,
        loanTransactions: loanTransactions.length,
      },
      borrowers,
      loans,
      interestDues,
      payments,
      paymentAllocations,
      loanTransactions,
    };

    mkdirSync(backupDir, { recursive: true });
    writeFileSync(
      outputPath,
      JSON.stringify(serializeForJson(exportData), null, 2),
      "utf8"
    );

    console.log(`Business data exported to ${outputPath}`);
    console.table(exportData.recordCounts);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Export failed.");
  console.error(error);
  process.exit(1);
});

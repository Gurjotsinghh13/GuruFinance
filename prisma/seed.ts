// ============================================================
// SEED DATA
// Creates admin user + sample borrowers + loans for testing
// Run: npx prisma db seed
// ============================================================

import { PrismaClient, InterestType, LoanFrequency, LoanStatus, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateLoanNumber } from "../src/utils";
import { generateDuesForLoan } from "../src/features/due-engine";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Admin user ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  const user = await prisma.user.upsert({
    where: { mobile: "9999999999" },
    update: {},
    create: {
      name: "Loan Admin",
      mobile: "9999999999",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`✅ Admin user created: mobile=9999999999 password=Admin@123`);

  // ── Borrowers ──────────────────────────────────────────────
  const borrowers = [
    {
      fullName: "Rahul Sharma",
      mobile: "9876543210",
      address: "12, Gandhi Nagar, Kota, Rajasthan",
      notes: "Regular payment history. Reliable borrower.",
    },
    {
      fullName: "Aman Verma",
      mobile: "9812345678",
      address: "45, Talwandi, Kota",
      notes: "Sometimes delays by 3-4 days.",
    },
    {
      fullName: "Vikas Gupta",
      mobile: "9898989898",
      address: "Station Road, Kota",
    },
    {
      fullName: "Sunita Devi",
      mobile: "9754321098",
      address: "Vigyan Nagar, Kota",
      notes: "Pays via UPI always.",
    },
  ];

  const createdBorrowers = [];
  for (const b of borrowers) {
    const borrower = await prisma.borrower.upsert({
      where: { id: `seed-${b.mobile}` },
      update: {},
      create: {
        id: `seed-${b.mobile}`,
        ...b,
        userId: user.id,
      },
    });
    createdBorrowers.push(borrower);
    console.log(`✅ Borrower: ${borrower.fullName}`);
  }

  // ── Loans ──────────────────────────────────────────────────
  const startDate1 = new Date("2024-01-15");
  const startDate2 = new Date("2024-03-01");
  const startDate3 = new Date("2024-06-01");

  const loansToCreate = [
    {
      borrower: createdBorrowers[0],
      principalAmount: 100000,
      interestRate: 3,
      interestType: InterestType.SIMPLE,
      loanFrequency: LoanFrequency.MONTHLY,
      startDate: startDate1,
    },
    {
      borrower: createdBorrowers[1],
      principalAmount: 50000,
      interestRate: 2.5,
      interestType: InterestType.SIMPLE,
      loanFrequency: LoanFrequency.MONTHLY,
      startDate: startDate2,
    },
    {
      borrower: createdBorrowers[2],
      principalAmount: 75000,
      interestRate: 3,
      interestType: InterestType.SIMPLE,
      loanFrequency: LoanFrequency.MONTHLY,
      startDate: startDate3,
    },
    {
      borrower: createdBorrowers[3],
      principalAmount: 30000,
      interestRate: 2,
      interestType: InterestType.SIMPLE,
      loanFrequency: LoanFrequency.MONTHLY,
      startDate: startDate2,
    },
  ];

  for (const loanData of loansToCreate) {
    const existing = await prisma.loan.findFirst({
      where: { borrowerId: loanData.borrower.id },
    });
    if (existing) continue;

    const loan = await prisma.loan.create({
      data: {
        loanNumber: generateLoanNumber(),
        borrowerId: loanData.borrower.id,
        principalAmount: loanData.principalAmount,
        currentPrincipal: loanData.principalAmount,
        interestRate: loanData.interestRate,
        interestType: loanData.interestType,
        loanFrequency: loanData.loanFrequency,
        startDate: loanData.startDate,
        dueDay: loanData.startDate.getDate(),
        status: LoanStatus.ACTIVE,
      },
    });

    // Record disbursement
    await prisma.loanTransaction.create({
      data: {
        loanId: loan.id,
        type: TransactionType.PRINCIPAL_DISBURSEMENT,
        amount: loanData.principalAmount,
        principalBefore: 0,
        principalAfter: loanData.principalAmount,
        notes: "Initial disbursement",
        transactionDate: loanData.startDate,
      },
    });

    // Generate dues
    await generateDuesForLoan(loan.id);

    console.log(`✅ Loan created: ${loan.loanNumber} for ${loanData.borrower.fullName}`);
  }

  // ── Default WhatsApp settings ──────────────────────────────
  const { DEFAULT_TEMPLATES } = await import("../src/features/whatsapp");
  for (const [type, template] of Object.entries(DEFAULT_TEMPLATES)) {
    if (type === "CUSTOM") continue;
    await prisma.settings.upsert({
      where: { key: `whatsapp_template_${type}` },
      update: {},
      create: { key: `whatsapp_template_${type}`, value: template },
    });
  }

  console.log("✅ Default WhatsApp templates saved");
  console.log("\n🎉 Seed complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Login: 9999999999");
  console.log("Password: Admin@123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

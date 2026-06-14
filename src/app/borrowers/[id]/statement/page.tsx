import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StatementClient } from "@/components/borrowers/StatementClient";
import { calculateLoanSummary } from "@/features/interest-engine";
import { serializeDecimal } from "@/utils";
import { buildAccountStatementLink } from "@/features/whatsapp";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BorrowerStatementPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAuth();

  const borrower = await prisma.borrower.findFirst({
    where: { id, userId: session.id },
    include: {
      loans: {
        include: {
          interestDues: { orderBy: { dueDate: "asc" } },
          payments: {
            include: { allocations: { include: { due: true } }, cheque: true },
            orderBy: { paymentDate: "asc" },
          },
          transactions: { orderBy: { transactionDate: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!borrower) notFound();

  const loansWithSummary = borrower.loans.map((loan) => ({
    loan,
    summary: calculateLoanSummary({
      originalPrincipal: Number(loan.principalAmount),
      currentPrincipal: Number(loan.currentPrincipal),
      dues: loan.interestDues.map((d) => ({
        dueAmount: Number(d.dueAmount),
        paidAmount: Number(d.paidAmount),
        waivedAmount: Number(d.waivedAmount),
        status: d.status,
        penaltyAmount: Number(d.penaltyAmount),
      })),
    }),
  }));
  const grandTotals = loansWithSummary.reduce(
    (acc, { loan, summary }) => ({
      principal: acc.principal + Number(loan.currentPrincipal),
      received: acc.received + summary.totalInterestReceived,
      pending: acc.pending + summary.pendingInterest + summary.overdueInterest,
    }),
    { principal: 0, received: 0, pending: 0 }
  );
  const activeLoans = borrower.loans.filter((loan) => loan.status === "ACTIVE");
  const whatsappLink = await buildAccountStatementLink({
    phone: borrower.mobile,
    borrowerName: borrower.fullName,
    loanNumber:
      activeLoans.length === 0
        ? "No active loans"
        : activeLoans.length === 1
        ? activeLoans[0].loanNumber
        : activeLoans.map((loan) => loan.loanNumber).join(", "),
    principal: grandTotals.principal,
    interestRate:
      activeLoans.length === 1 ? Number(activeLoans[0].interestRate) : "Multiple rates",
    totalPaid: grandTotals.received,
    pendingInterest: grandTotals.pending,
    outstandingPrincipal: grandTotals.principal,
  });

  return (
    <StatementClient
      borrower={serializeDecimal(borrower)}
      loansWithSummary={serializeDecimal(loansWithSummary)}
      whatsappLink={whatsappLink}
    />
  );
}

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StatementClient } from "@/components/borrowers/StatementClient";
import { calculateLoanSummary } from "@/features/interest-engine";
import { serializeDecimal } from "@/utils";

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

  return (
    <StatementClient
      borrower={serializeDecimal(borrower)}
      loansWithSummary={serializeDecimal(loansWithSummary)}
    />
  );
}

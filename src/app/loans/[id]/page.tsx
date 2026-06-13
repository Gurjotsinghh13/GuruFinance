import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { calculateLoanSummary } from "@/features/interest-engine";
import { LoanDetailClient } from "@/components/loans/LoanDetailClient";
import { serializeDecimal } from "@/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LoanDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAuth();

  const loan = await prisma.loan.findFirst({
    where: {
      id,
      borrower: { userId: session.id },
    },
    include: {
      borrower: true,
      interestDues: { orderBy: { dueDate: "asc" } },
      payments: {
        include: {
          allocations: { include: { due: true } },
          cheque: true,
        },
        orderBy: { paymentDate: "desc" },
      },
      transactions: { orderBy: { transactionDate: "desc" } },
      cheques: { orderBy: { chequeDate: "desc" } },
    },
  });

  if (!loan) notFound();

  const summary = calculateLoanSummary({
    originalPrincipal: Number(loan.principalAmount),
    currentPrincipal: Number(loan.currentPrincipal),
    dues: loan.interestDues.map((d) => ({
      dueAmount: Number(d.dueAmount),
      paidAmount: Number(d.paidAmount),
      waivedAmount: Number(d.waivedAmount),
      status: d.status,
      penaltyAmount: Number(d.penaltyAmount),
    })),
  });

  return <LoanDetailClient loan={serializeDecimal(loan)} summary={summary} />;
}

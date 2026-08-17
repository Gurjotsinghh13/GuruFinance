import { getBorrowerLedgerAction } from "@/app/actions/borrowers";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { BorrowerHeader } from "@/components/borrowers/BorrowerHeader";
import { LoanCard } from "@/components/loans/LoanCard";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { formatCurrency, serializeDecimal } from "@/utils";
import { LoanStatus } from "@prisma/client";
import { calculateLoanSummary } from "@/features/interest-engine";
import { buildBalanceReminderLink } from "@/features/whatsapp";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BorrowerDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAuth();
  const borrower = await getBorrowerLedgerAction(id);

  if (!borrower) notFound();

  // Calculate totals across all loans
  let totalPrincipal = 0;
  let totalInterestReceived = 0;
  let totalPending = 0;
  let totalOverdue = 0;

  const loansWithSummary = borrower.loans.map((loan) => {
  const summary = calculateLoanSummary({
    originalPrincipal: Number(loan.principalAmount),
    currentPrincipal: Number(loan.currentPrincipal),
    interestType: loan.interestType,
    dues: loan.interestDues.map((d) => ({
      dueAmount: Number(d.dueAmount),
      paidAmount: Number(d.paidAmount),
      waivedAmount: Number(d.waivedAmount),
      status: d.status,
      penaltyAmount: Number(d.penaltyAmount),
      dueDate: d.dueDate,
      wasCompounded: d.wasCompounded,
    })),
  });


    if (loan.status === LoanStatus.ACTIVE) {
      totalPrincipal += summary.effectivePrincipal;
      totalInterestReceived += summary.totalInterestReceived;
      totalPending += summary.pendingInterest;
      totalOverdue += Math.max(
        0,
        summary.overdueInterest - summary.capitalizedInterest
      );
    }

    return { loan, summary };
  });
  const activeLoanNumbers = borrower.loans
    .filter((loan) => loan.status === LoanStatus.ACTIVE)
    .map((loan) => loan.loanNumber);
  const whatsappLink = await buildBalanceReminderLink({
    userId: session.id,
    phone: borrower.mobile,
    borrowerName: borrower.fullName,
    loanNumber:
      activeLoanNumbers.length === 0
        ? "No active loans"
        : activeLoanNumbers.length === 1
        ? activeLoanNumbers[0]
        : activeLoanNumbers.join(", "),
    principal: totalPrincipal,
    pendingInterest: totalPending + totalOverdue,
    totalOutstanding: totalPrincipal + totalPending + totalOverdue,
    interestType:
      activeLoanNumbers.length === 1
        ? borrower.loans.find((loan) => loan.status === LoanStatus.ACTIVE)?.interestType === "COMPOUND"
          ? "Compound Interest"
          : "Simple Interest"
        : "Multiple Interest Types",
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Borrower header */}
      <BorrowerHeader borrower={serializeDecimal(borrower)} whatsappLink={whatsappLink} />

      {/* Financial summary */}
      <div className="card p-4">
        <h2 className="section-title mb-3">Financial Summary</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">Outstanding Principal</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{formatCurrency(totalPrincipal)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Interest Received</p>
            <p className="text-lg font-bold text-emerald-700 tabular-nums">{formatCurrency(totalInterestReceived)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Unpaid Interest</p>
            <p className={`text-lg font-bold tabular-nums ${totalPending > 0 ? "text-amber-700" : "text-gray-900"}`}>
              {formatCurrency(totalPending)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Overdue Interest</p>
            <p className={`text-lg font-bold tabular-nums ${totalOverdue > 0 ? "text-red-700" : "text-gray-900"}`}>
              {formatCurrency(totalOverdue)}
            </p>
          </div>
        </div>
      </div>

      {/* Loans section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Loans ({borrower.loans.length})</h2>
          <Link href={`/loans/new?borrowerId=${borrower.id}`} className="btn-primary text-xs px-3 py-2">
            <PlusCircle className="w-3.5 h-3.5" />
            New Loan
          </Link>
        </div>

        {borrower.loans.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-gray-500 text-sm">No loans yet</p>
            <Link href={`/loans/new?borrowerId=${borrower.id}`} className="btn-primary mt-3 mx-auto w-fit text-sm">
              Create First Loan
            </Link>
          </div>
        )}

        {loansWithSummary.map(({ loan, summary }) => (
          <LoanCard key={loan.id} loan={serializeDecimal(loan)} summary={summary} />
        ))}
      </div>
    </div>
  );
}

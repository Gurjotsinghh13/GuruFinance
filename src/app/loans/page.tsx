import { getLoansAction } from "@/app/actions/loans";
import { LoanStatus } from "@prisma/client";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { formatCurrency, formatDate, formatPercent } from "@/utils";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function LoansPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = (params.status as LoanStatus) || LoanStatus.ACTIVE;

  const loans = await getLoansAction({ status });

  const tabs = [
    { value: LoanStatus.ACTIVE, label: "Active" },
    { value: LoanStatus.CLOSED, label: "Closed" },
    { value: LoanStatus.ARCHIVED, label: "Archived" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Loans</h1>
        <Link href="/loans/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Loan</span>
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/loans?status=${tab.value}`}
            className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition-colors ${
              status === tab.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Empty state */}
      {loans.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-gray-500 text-sm">No {status.toLowerCase()} loans</p>
          {status === LoanStatus.ACTIVE && (
            <Link href="/loans/new" className="btn-primary mt-3 mx-auto w-fit text-sm">
              Create New Loan
            </Link>
          )}
        </div>
      )}

      {/* Loans list */}
      <div className="space-y-2">
        {loans.map((loan) => {
          const pendingDues = loan.interestDues;
          const pendingAmount = pendingDues.reduce(
            (s, d) => s + Number(d.dueAmount) - Number(d.paidAmount),
            0
          );
          const hasOverdue = pendingDues.some((d) => d.status === "OVERDUE");

          return (
            <Link
              key={loan.id}
              href={`/loans/${loan.id}`}
              className={`card p-4 flex items-center gap-4 hover:border-indigo-200 transition-colors ${
                hasOverdue ? "border-red-200" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-indigo-700">
                    {loan.loanNumber}
                  </span>
                  {hasOverdue && <span className="badge-overdue">Overdue</span>}
                </div>
                <p className="text-sm font-medium text-gray-900 mt-0.5">
                  {loan.borrower.fullName}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500 tabular-nums">
                    {formatCurrency(Number(loan.currentPrincipal))}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatPercent(Number(loan.interestRate))}/
                    {loan.loanFrequency === "MONTHLY" ? "mo" : "day"}
                  </span>
                  {pendingAmount > 0 && (
                    <span className={`text-xs font-medium tabular-nums ${hasOverdue ? "text-red-600" : "text-amber-600"}`}>
                      Unpaid: {formatCurrency(pendingAmount)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Since {formatDate(loan.startDate)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-xs font-medium ${
                  loan.status === "ACTIVE" ? "text-emerald-600" : "text-gray-400"
                }`}>
                  {loan.status}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {loan._count.payments} receipts
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

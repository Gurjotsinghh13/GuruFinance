"use client";

import { ArrowLeft, Printer, MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/utils";
import { DueStatus } from "@prisma/client";
import type { LoanSummaryOutput } from "@/features/interest-engine";
import type { Borrower, Loan, InterestDue, Payment, LoanTransaction } from "@prisma/client";
import { format } from "date-fns";

interface Props {
  borrower: Borrower;
  loansWithSummary: {
    loan: Loan & { interestDues: InterestDue[]; payments: Payment[]; transactions: LoanTransaction[] };
    summary: LoanSummaryOutput;
  }[];
  whatsappLink: string;
}

export function StatementClient({ borrower, loansWithSummary, whatsappLink }: Props) {
  const statementDate = format(new Date(), "dd MMMM yyyy");

  const grandTotals = loansWithSummary.reduce(
    (acc, { loan, summary }) => ({
      principal: acc.principal + summary.effectivePrincipal,
      received: acc.received + summary.totalInterestReceived,
      pending:
        acc.pending +
        summary.pendingInterest +
        summary.overdueInterest -
        summary.capitalizedInterest,
    }),
    { principal: 0, received: 0, pending: 0 }
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Actions bar - hidden in print */}
      <div className="flex items-center gap-3 print:hidden">
        <Link href={`/borrowers/${borrower.id}`} className="btn-ghost p-2" aria-label="Back to borrower">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 flex-1">Account Statement</h1>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-whatsapp text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          Share
        </a>
        <button onClick={() => window.print()} className="btn-secondary text-sm">
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      {/* Statement document */}
      <div className="card p-6 print:shadow-none print:border-none" id="statement">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-gray-200 mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Account Statement</h2>
            <p className="text-sm text-gray-500 mt-0.5">As of {statementDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest">LoanBook</p>
            <p className="text-xs text-gray-400 mt-0.5">Smart Loan & Interest Management</p>
          </div>
        </div>

        {/* Borrower info */}
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Borrower Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400">Name</p>
              <p className="text-sm font-semibold text-gray-900">{borrower.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Mobile</p>
              <p className="text-sm font-semibold text-gray-900">{borrower.mobile}</p>
            </div>
            {borrower.address && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400">Address</p>
                <p className="text-sm text-gray-900">{borrower.address}</p>
              </div>
            )}
          </div>
        </div>

        {/* Grand summary */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Overall Summary</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400">Outstanding Principal</p>
              <p className="text-base font-bold text-gray-900 tabular-nums">
                {formatCurrency(grandTotals.principal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Interest Received</p>
              <p className="text-base font-bold text-emerald-700 tabular-nums">
                {formatCurrency(grandTotals.received)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Unpaid Interest</p>
              <p className={`text-base font-bold tabular-nums ${grandTotals.pending > 0 ? "text-red-700" : "text-gray-500"}`}>
                {formatCurrency(grandTotals.pending)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Outstanding</p>
              <p className="text-base font-bold text-gray-900 tabular-nums">
                {formatCurrency(grandTotals.principal + grandTotals.pending)}
              </p>
            </div>
          </div>
        </div>

        {/* Per loan breakdown */}
        {loansWithSummary.map(({ loan, summary }) => (
          <div key={loan.id} className="mb-6 last:mb-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-indigo-700">{loan.loanNumber}</span>
                <span className={loan.status === "ACTIVE" ? "badge-active" : "badge-closed"}>
                  {loan.status}
                </span>
              </div>
              <span className="text-xs text-gray-500">{formatDate(loan.startDate)}</span>
            </div>

            {/* Loan details row */}
            <div className="grid grid-cols-4 gap-2 text-xs mb-3">
              <div className="rounded bg-gray-50 p-2">
                <p className="text-gray-400">
                  {loan.interestType === "COMPOUND" ? "Effective Principal" : "Principal"}
                </p>
                <p className="font-semibold tabular-nums">{formatCurrency(summary.effectivePrincipal)}</p>
              </div>
              <div className="rounded bg-gray-50 p-2">
                <p className="text-gray-400">Rate</p>
                <p className="font-semibold">{Number(loan.interestRate)}%/{loan.loanFrequency === "MONTHLY" ? "mo" : "day"}</p>
              </div>
              <div className="rounded bg-gray-50 p-2">
                <p className="text-gray-400">Interest Type</p>
                <p className="font-semibold">
                  {loan.interestType === "COMPOUND" ? "Compound" : "Simple"}
                </p>
              </div>
              <div className="rounded bg-gray-50 p-2">
                <p className="text-gray-400">Received</p>
                <p className="font-semibold text-emerald-700 tabular-nums">
                  {formatCurrency(summary.totalInterestReceived)}
                </p>
              </div>
            </div>

            {/* Interest dues table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Due Date</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500">Amount</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500">Paid</th>
                    <th className="text-right py-2 px-2 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.interestDues.map((due) => (
                    <tr key={due.id} className="border-t border-gray-100">
                      <td className="py-2 px-2 text-gray-700">{formatDate(due.dueDate)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(Number(due.dueAmount))}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-emerald-700">
                        {Number(due.paidAmount) > 0 ? formatCurrency(Number(due.paidAmount)) : "—"}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className={
                          due.status === DueStatus.PAID ? "text-emerald-600 font-medium" :
                          due.status === DueStatus.OVERDUE ? "text-red-600 font-medium" :
                          due.status === DueStatus.PARTIAL ? "text-amber-600 font-medium" :
                          "text-gray-400"
                        }>
                          {due.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Generated by LoanBook - Smart Loan & Interest Management on {statementDate}.
          </p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #statement, #statement * { visibility: visible; }
          #statement { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

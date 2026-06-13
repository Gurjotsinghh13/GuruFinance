"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronUp, IndianRupee, TrendingUp,
  Calendar, CheckCircle2, AlertCircle, Clock
} from "lucide-react";
import { formatCurrency, formatDate, formatPercent } from "@/utils";
import { DueStatus, LoanStatus } from "@prisma/client";
import type { LoanSummaryOutput } from "@/features/interest-engine";
import type { Loan, InterestDue } from "@prisma/client";

interface Props {
  loan: Loan & {
    interestDues: InterestDue[];
    payments: any[];
    transactions: any[];
  };
  summary: LoanSummaryOutput;
}

export function LoanCard({ loan, summary }: Props) {
  const [expanded, setExpanded] = useState(false);

  const isActive = loan.status === LoanStatus.ACTIVE;
  const isClosed = loan.status === LoanStatus.CLOSED;

  const recentDues = [...loan.interestDues]
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    .slice(0, 6);

  return (
    <div className={`card overflow-hidden ${!isActive ? "opacity-75" : ""}`}>
      {/* Loan header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-indigo-700">
                {loan.loanNumber}
              </span>
              <span className={isClosed ? "badge-closed" : "badge-active"}>
                {loan.status}
              </span>
              {summary.overdueInterest > 0 && (
                <span className="badge-overdue">Overdue</span>
              )}
            </div>

            {/* Key figures */}
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-xs text-gray-500">Principal</p>
                <p className="text-base font-bold text-gray-900 tabular-nums">
                  {formatCurrency(Number(loan.currentPrincipal))}
                </p>
                {Number(loan.currentPrincipal) !== Number(loan.principalAmount) && (
                  <p className="text-xs text-gray-400">
                    orig. {formatCurrency(Number(loan.principalAmount))}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Interest Rate</p>
                <p className="text-base font-bold text-gray-900">
                  {formatPercent(Number(loan.interestRate))} / {loan.loanFrequency === "MONTHLY" ? "mo" : "day"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="text-sm font-medium text-gray-700">{formatDate(loan.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium text-gray-700">
                  {loan.interestType === "SIMPLE" ? "Simple" : "Compound"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary row */}
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500">Received</p>
            <p className="text-sm font-semibold text-emerald-700 tabular-nums">
              {formatCurrency(summary.totalInterestReceived)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className={`text-sm font-semibold tabular-nums ${summary.pendingInterest > 0 ? "text-amber-700" : "text-gray-500"}`}>
              {formatCurrency(summary.pendingInterest)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Overdue</p>
            <p className={`text-sm font-semibold tabular-nums ${summary.overdueInterest > 0 ? "text-red-700" : "text-gray-500"}`}>
              {formatCurrency(summary.overdueInterest)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          <Link
            href={`/loans/${loan.id}`}
            className="btn-secondary flex-1 text-xs py-2"
          >
            View Full Ledger
          </Link>
          <button
            onClick={() => setExpanded((s) => !s)}
            className="btn-ghost text-xs py-2 px-3"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded: recent dues */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Recent Interest Dues
          </p>
          {recentDues.length === 0 ? (
            <p className="text-sm text-gray-400">No dues generated yet</p>
          ) : (
            <div className="space-y-2">
              {recentDues.map((due) => {
                const outstanding =
                  Number(due.dueAmount) - Number(due.paidAmount) - Number(due.waivedAmount);
                return (
                  <div
                    key={due.id}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      {due.status === DueStatus.PAID ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : due.status === DueStatus.OVERDUE ? (
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {formatDate(due.dueDate)}
                        </p>
                        {due.status === DueStatus.OVERDUE && (
                          <p className="text-xs text-red-500">{due.daysOverdue}d overdue</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-gray-900">
                        {formatCurrency(Number(due.dueAmount))}
                      </p>
                      {due.status === DueStatus.PARTIAL && (
                        <p className="text-xs text-amber-600 tabular-nums">
                          ₹{formatCurrency(outstanding)} left
                        </p>
                      )}
                      {due.status !== DueStatus.PAID && due.status !== DueStatus.PENDING && (
                        <span className={
                          due.status === DueStatus.OVERDUE
                            ? "badge-overdue"
                            : due.status === DueStatus.PARTIAL
                            ? "badge-partial"
                            : "badge-pending"
                        }>
                          {due.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

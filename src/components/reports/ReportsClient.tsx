"use client";

import { formatCurrency, formatPercent } from "@/utils";
import { TrendingUp, TrendingDown, IndianRupee, BarChart3 } from "lucide-react";

interface MonthData {
  key: string;
  label: string;
  totalDue: number;
  totalReceived: number;
  totalPending: number;
  overdueCount: number;
  collectionRate: number;
}

interface LoanSummary {
  loanNumber: string;
  currentPrincipal: any;
  interestRate: any;
  loanFrequency: string;
  borrower: { fullName: string };
  interestDues: { dueAmount: any; paidAmount: any; waivedAmount: any; status: string; dueDate?: Date | string }[];
}

interface Props {
  monthlyData: MonthData[];
  activeLoansSummary: LoanSummary[];
  overdueTotal: number;
}

export function ReportsClient({ monthlyData, activeLoansSummary, overdueTotal }: Props) {
  const maxDue = Math.max(...monthlyData.map((m) => m.totalDue), 1);
  const totalPrincipal = activeLoansSummary.reduce(
    (s, l) => s + Number(l.currentPrincipal), 0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Reports</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <span className="stat-label">Active Principal</span>
          <span className="stat-value">{formatCurrency(totalPrincipal)}</span>
          <span className="stat-sub">{activeLoansSummary.length} loans</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Overdue Interest</span>
          <span className={`stat-value ${overdueTotal > 0 ? "text-red-700" : "text-gray-900"}`}>
            {formatCurrency(overdueTotal)}
          </span>
          <span className="stat-sub">needs collection</span>
        </div>
      </div>

      {/* Monthly collection chart */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-500" />
          <h2 className="section-title">Monthly Collection (Last 6 Months)</h2>
        </div>

        {/* Bar chart */}
        <div className="space-y-3">
          {monthlyData.map((month) => (
            <div key={month.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600 w-20">{month.label}</span>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="text-emerald-600 tabular-nums">
                    {formatCurrency(month.totalReceived)}
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="tabular-nums">{formatCurrency(month.totalDue)}</span>
                  <span className={`font-semibold w-10 text-right ${
                    month.collectionRate >= 80 ? "text-emerald-600" :
                    month.collectionRate >= 50 ? "text-amber-600" : "text-red-600"
                  }`}>
                    {month.collectionRate}%
                  </span>
                </div>
              </div>
              <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
                {/* Total due bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-gray-200 rounded-full"
                  style={{ width: `${(month.totalDue / maxDue) * 100}%` }}
                />
                {/* Received bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(month.totalReceived / maxDue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-500">Received</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-200" />
            <span className="text-xs text-gray-500">Expected</span>
          </div>
        </div>
      </div>

      {/* Monthly table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="section-title">Monthly Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Month</th>
                <th className="text-right">Expected</th>
                <th className="text-right">Received</th>
                <th className="text-right">Pending</th>
                <th className="text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {[...monthlyData].reverse().map((month) => (
                <tr key={month.key}>
                  <td className="font-medium text-gray-900">{month.label}</td>
                  <td className="text-right tabular-nums">{formatCurrency(month.totalDue)}</td>
                  <td className="text-right tabular-nums text-emerald-700">{formatCurrency(month.totalReceived)}</td>
                  <td className="text-right tabular-nums text-amber-700">{formatCurrency(month.totalPending)}</td>
                  <td className={`text-right font-semibold ${
                    month.collectionRate >= 80 ? "text-emerald-600" :
                    month.collectionRate >= 50 ? "text-amber-600" : "text-red-600"
                  }`}>
                    {month.collectionRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active loans outstanding */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="section-title">Outstanding Report</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Loan</th>
                <th className="text-right">Principal</th>
                <th className="text-right">Pending</th>
                <th className="text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {activeLoansSummary.map((loan) => {
                const pendingInterest = loan.interestDues.reduce(
                  (s: number, d: any) =>
                    s + Math.max(0, Number(d.dueAmount) - Number(d.paidAmount) - Number(d.waivedAmount)),
                  0
                );
                const hasOverdue = loan.interestDues.some((d: any) => d.status === "OVERDUE");

                return (
                  <tr key={loan.loanNumber} className={hasOverdue ? "bg-red-50/50" : ""}>
                    <td className="font-medium text-gray-900">{loan.borrower.fullName}</td>
                    <td className="font-mono text-xs text-indigo-700">{loan.loanNumber}</td>
                    <td className="text-right tabular-nums">{formatCurrency(Number(loan.currentPrincipal))}</td>
                    <td className={`text-right tabular-nums font-medium ${
                      hasOverdue ? "text-red-600" : pendingInterest > 0 ? "text-amber-600" : "text-gray-500"
                    }`}>
                      {formatCurrency(pendingInterest)}
                    </td>
                    <td className="text-right">
                      {formatPercent(Number(loan.interestRate))}/{loan.loanFrequency === "MONTHLY" ? "mo" : "day"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

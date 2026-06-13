import { formatCurrency, formatCurrencyCompact } from "@/utils";
import type { DashboardStats } from "@/types";

export function DashboardStats({ stats }: { stats: DashboardStats }) {
  const statCards = [
    {
      label: "Principal Lent",
      value: formatCurrencyCompact(stats.totalPrincipalLent),
      sub: `${stats.activeLoanCount} active loans`,
      color: "text-gray-900",
    },
    {
      label: "Monthly Expected",
      value: formatCurrencyCompact(stats.monthlyExpectedInterest),
      sub: "this month",
      color: "text-gray-900",
    },
    {
      label: "Received",
      value: formatCurrencyCompact(stats.interestReceivedThisMonth),
      sub: "this month",
      color: "text-emerald-700",
    },
    {
      label: "Overdue Interest",
      value: formatCurrencyCompact(stats.overdueInterest),
      sub: `${stats.overdueCount} accounts`,
      color: stats.overdueInterest > 0 ? "text-red-700" : "text-gray-900",
    },
    {
      label: "Active Borrowers",
      value: stats.activeBorrowerCount.toString(),
      sub: `${stats.closedLoanCount} closed loans`,
      color: "text-gray-900",
    },
    {
      label: "Pending Interest",
      value: formatCurrencyCompact(stats.pendingInterest),
      sub: "not yet overdue",
      color: "text-amber-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {statCards.map((card) => (
        <div key={card.label} className="stat-card">
          <span className="stat-label">{card.label}</span>
          <span className={`stat-value ${card.color}`}>{card.value}</span>
          <span className="stat-sub">{card.sub}</span>
        </div>
      ))}
    </div>
  );
}

import { formatCurrency } from "@/utils";
import { AlertCircle, Clock, TrendingDown } from "lucide-react";

interface Props {
  todayCount: number;
  todayAmount: number;
  overdueCount: number;
  overdueAmount: number;
  pendingInterest: number;
}

export function MorningBriefing({
  todayCount,
  todayAmount,
  overdueCount,
  overdueAmount,
  pendingInterest,
}: Props) {
  const todayLabel = `${todayCount} due${todayCount === 1 ? "" : "s"} today`;
  const overdueLabel = `${overdueCount} overdue due${overdueCount === 1 ? "" : "s"}`;

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Today */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-medium text-gray-500">Today</span>
        </div>
        <p className="text-xl font-bold text-gray-900 tabular-nums">
          {formatCurrency(todayAmount)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
          {todayLabel}
        </p>
      </div>

      {/* Overdue */}
      <div className={`card p-4 ${overdueCount > 0 ? "border-red-200 bg-red-50" : ""}`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className={`w-4 h-4 ${overdueCount > 0 ? "text-red-500" : "text-gray-400"}`} />
          <span className="text-xs font-medium text-gray-500">Overdue</span>
        </div>
        <p className={`text-xl font-bold tabular-nums ${overdueCount > 0 ? "text-red-700" : "text-gray-900"}`}>
          {formatCurrency(overdueAmount)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
          {overdueLabel}
        </p>
      </div>

      {/* Pending */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-gray-500">Unpaid</span>
        </div>
        <p className="text-xl font-bold text-gray-900 tabular-nums">
          {formatCurrency(pendingInterest)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">interest</p>
      </div>
    </div>
  );
}

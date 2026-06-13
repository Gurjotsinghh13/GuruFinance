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
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Today */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-medium text-gray-500">Today</span>
        </div>
        <p className="text-xl font-bold text-gray-900 tabular-nums">
          {todayCount}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
          {formatCurrency(todayAmount)}
        </p>
      </div>

      {/* Overdue */}
      <div className={`card p-4 ${overdueCount > 0 ? "border-red-200 bg-red-50" : ""}`}>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className={`w-4 h-4 ${overdueCount > 0 ? "text-red-500" : "text-gray-400"}`} />
          <span className="text-xs font-medium text-gray-500">Overdue</span>
        </div>
        <p className={`text-xl font-bold tabular-nums ${overdueCount > 0 ? "text-red-700" : "text-gray-900"}`}>
          {overdueCount}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
          {formatCurrency(overdueAmount)}
        </p>
      </div>

      {/* Pending */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-medium text-gray-500">Pending</span>
        </div>
        <p className="text-xl font-bold text-gray-900 tabular-nums">
          {formatCurrency(pendingInterest)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">interest due</p>
      </div>
    </div>
  );
}

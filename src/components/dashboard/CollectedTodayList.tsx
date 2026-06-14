import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/utils";
import type { CollectedTodayPayment } from "@/types";

interface Props {
  payments: CollectedTodayPayment[];
}

export function CollectedTodayList({ payments }: Props) {
  const totalCollected = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">Collected Today</h2>
        {totalCollected > 0 && (
          <span className="text-sm font-semibold text-emerald-700 tabular-nums">
            {formatCurrency(totalCollected)}
          </span>
        )}
      </div>

      {payments.length === 0 ? (
        <div className="card p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No receipts recorded today</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((payment) => (
            <div key={payment.id} className="card p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{payment.borrowerName}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {payment.loanNumber} - {format(new Date(payment.receivedAt), "hh:mm a")}
                </p>
              </div>
              <div className="text-emerald-700 font-bold tabular-nums">
                <span>{formatCurrency(payment.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { Phone, MessageCircle, IndianRupee, CheckCircle2, Clock } from "lucide-react";
import { formatCurrency, createWhatsAppLink } from "@/utils";
import type { TodayCollection } from "@/types";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { buildDueReminderLink } from "@/features/whatsapp";

interface Props {
  collections: TodayCollection[];
}

export function TodayCollectionList({ collections }: Props) {
  const [selectedDue, setSelectedDue] = useState<TodayCollection | null>(null);

  const totalExpected = collections.reduce((s, c) => s + c.remainingAmount, 0);

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">Today's Collections</h2>
        {totalExpected > 0 && (
          <span className="text-sm font-semibold text-indigo-700 tabular-nums">
            {formatCurrency(totalExpected)}
          </span>
        )}
      </div>

      {/* Empty state */}
      {collections.length === 0 && (
        <div className="card p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No collections due today</p>
          <p className="text-xs text-gray-500 mt-1">All caught up!</p>
        </div>
      )}

      {/* Collection cards */}
      <div className="space-y-2">
        {collections.map((item) => (
          <CollectionCard
            key={item.dueId}
            item={item}
            onReceive={() => setSelectedDue(item)}
          />
        ))}
      </div>

      {/* Payment modal */}
      {selectedDue && (
        <PaymentModal
          loanId={selectedDue.loanId}
          dueId={selectedDue.dueId}
          defaultAmount={selectedDue.remainingAmount}
          borrowerName={selectedDue.borrowerName}
          loanNumber={selectedDue.loanNumber}
          onClose={() => setSelectedDue(null)}
        />
      )}
    </section>
  );
}

function CollectionCard({
  item,
  onReceive,
}: {
  item: TodayCollection;
  onReceive: () => void;
}) {
  const waLink = createWhatsAppLink(
    item.mobile,
    `Dear ${item.borrowerName},\n\nYour interest payment of ${formatCurrency(item.remainingAmount)} is due today for loan ${item.loanNumber}.\n\nPlease arrange payment.\n\nThank you`
  );

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">{item.borrowerName}</p>
            {item.status === "PARTIAL" && (
              <span className="badge-partial">Partial</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{item.loanNumber}</p>
          <div className="mt-2 flex items-center gap-1">
            <IndianRupee className="w-4 h-4 text-gray-400" />
            <span className="text-lg font-bold text-gray-900 tabular-nums">
              {formatCurrency(item.remainingAmount)}
            </span>
          </div>
          {item.status === "PARTIAL" && item.paidAmount > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
              Paid {formatCurrency(item.paidAmount)} of {formatCurrency(item.dueAmount)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={onReceive}
            className="btn-primary text-xs px-3 py-2"
          >
            Receive
          </button>
          <div className="flex gap-1.5">
            <a
              href={`tel:${item.mobile}`}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              title="Call"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
              title="WhatsApp reminder"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

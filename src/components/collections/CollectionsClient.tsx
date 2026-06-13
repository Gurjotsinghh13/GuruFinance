"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Phone, MessageCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate, createWhatsAppLink } from "@/utils";
import { DueStatus } from "@prisma/client";
import { PaymentModal } from "@/components/payments/PaymentModal";

interface DueItem {
  id: string;
  dueDate: Date;
  dueAmount: any;
  paidAmount: any;
  waivedAmount: any;
  status: DueStatus;
  daysOverdue: number;
  loan: {
    id: string;
    loanNumber: string;
    borrower: { id: string; fullName: string; mobile: string };
  };
}

interface Props {
  dues: DueItem[];
  totalExpected: number;
  activeView: string;
}

const VIEWS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Next 7 Days" },
  { value: "overdue", label: "Overdue" },
];

export function CollectionsClient({ dues, totalExpected, activeView }: Props) {
  const router = useRouter();
  const [selectedDue, setSelectedDue] = useState<DueItem | null>(null);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Collections</h1>
        {totalExpected > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Expected</p>
            <p className="text-base font-bold text-indigo-700 tabular-nums">
              {formatCurrency(totalExpected)}
            </p>
          </div>
        )}
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {VIEWS.map((v) => (
          <Link
            key={v.value}
            href={`/collections?view=${v.value}`}
            className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition-colors ${
              activeView === v.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      {/* Empty */}
      {dues.length === 0 && (
        <div className="card p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">
            {activeView === "today"
              ? "No collections due today"
              : activeView === "overdue"
              ? "No overdue accounts"
              : "No upcoming collections"}
          </p>
        </div>
      )}

      {/* Due cards */}
      <div className="space-y-2">
        {dues.map((due) => {
          const outstanding =
            Number(due.dueAmount) - Number(due.paidAmount) - Number(due.waivedAmount);
          const waLink = createWhatsAppLink(
            due.loan.borrower.mobile,
            `Dear ${due.loan.borrower.fullName},\n\nYour interest payment of ${formatCurrency(outstanding)} for loan ${due.loan.loanNumber} is ${due.status === DueStatus.OVERDUE ? `overdue by ${due.daysOverdue} days` : `due on ${formatDate(due.dueDate)}`}.\n\nPlease arrange payment.\n\nThank you`
          );

          return (
            <div
              key={due.id}
              className={`card p-4 ${
                due.status === DueStatus.OVERDUE
                  ? "border-red-200 bg-red-50/50"
                  : due.status === DueStatus.PARTIAL
                  ? "border-amber-200"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/borrowers/${due.loan.borrower.id}`}
                      className="font-semibold text-gray-900 hover:text-indigo-700 truncate"
                    >
                      {due.loan.borrower.fullName}
                    </Link>
                    <span className={
                      due.status === DueStatus.OVERDUE ? "badge-overdue" :
                      due.status === DueStatus.PARTIAL ? "badge-partial" : "badge-pending"
                    }>
                      {due.status === DueStatus.OVERDUE ? `${due.daysOverdue}d overdue` : due.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {due.loan.loanNumber} · Due {formatDate(due.dueDate)}
                  </p>
                  <div className="mt-2">
                    <span className="text-lg font-bold tabular-nums text-gray-900">
                      {formatCurrency(outstanding)}
                    </span>
                    {due.status === DueStatus.PARTIAL && (
                      <span className="text-xs text-gray-500 ml-2">
                        of {formatCurrency(Number(due.dueAmount))}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSelectedDue(due)}
                    className="btn-primary text-xs px-3 py-2"
                  >
                    Receive
                  </button>
                  <div className="flex gap-1.5">
                    <a
                      href={`tel:${due.loan.borrower.mobile}`}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment modal */}
      {selectedDue && (
        <PaymentModal
          loanId={selectedDue.loan.id}
          dueId={selectedDue.id}
          defaultAmount={
            Number(selectedDue.dueAmount) -
            Number(selectedDue.paidAmount) -
            Number(selectedDue.waivedAmount)
          }
          borrowerName={selectedDue.loan.borrower.fullName}
          loanNumber={selectedDue.loan.loanNumber}
          onClose={() => { setSelectedDue(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

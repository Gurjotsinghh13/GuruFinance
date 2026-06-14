"use client";

import { useEffect, useState } from "react";
import { Phone, MessageCircle, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils";
import type { OverdueAccount } from "@/types";
import Link from "next/link";
import { PaymentModal } from "@/components/payments/PaymentModal";

interface Props {
  accounts: OverdueAccount[];
}

export function OverdueList({ accounts }: Props) {
  const [selectedAccount, setSelectedAccount] = useState<OverdueAccount | null>(null);
  const [visibleAccounts, setVisibleAccounts] = useState(accounts);
  const totalOverdue = visibleAccounts.reduce((s, a) => s + a.totalOverdue, 0);

  useEffect(() => {
    setVisibleAccounts(accounts);
  }, [accounts]);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="section-title text-red-700">Overdue Accounts</h2>
        </div>
        <span className="text-sm font-semibold text-red-700 tabular-nums">
          {formatCurrency(totalOverdue)}
        </span>
      </div>

      <div className="space-y-2">
        {visibleAccounts.map((account) => (
            <div
              key={account.loanId}
              className="card p-4 border-red-200 bg-red-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/borrowers/${account.borrowerId}`}
                    className="font-semibold text-gray-900 hover:text-indigo-700 truncate block"
                  >
                    {account.borrowerName}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">{account.loanNumber}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-lg font-bold text-red-700 tabular-nums">
                      {formatCurrency(account.totalOverdue)}
                    </span>
                    <span className="badge-overdue">
                      {account.daysOverdue}d overdue
                    </span>
                    {account.overdueCount > 1 && (
                      <span className="text-xs text-gray-500">
                        {account.overdueCount} dues
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSelectedAccount(account)}
                    className="btn-primary text-xs px-3 py-2"
                  >
                    Receive
                  </button>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${account.mobile}`}
                      className="flex items-center justify-center w-9 h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
                      title="Call"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <a
                      href={account.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
        ))}
      </div>

      {selectedAccount && (
        <PaymentModal
          loanId={selectedAccount.loanId}
          defaultAmount={selectedAccount.totalOverdue}
          borrowerName={selectedAccount.borrowerName}
          loanNumber={selectedAccount.loanNumber}
          onPaymentSuccess={(result) => {
            setVisibleAccounts((current) => {
              if (result.allocated >= selectedAccount.totalOverdue) {
                return current.filter((account) => account.loanId !== selectedAccount.loanId);
              }

              return current.map((account) =>
                account.loanId === selectedAccount.loanId
                  ? {
                      ...account,
                      totalOverdue: Math.max(0, account.totalOverdue - result.allocated),
                    }
                  : account
              );
            });
          }}
          onClose={() => {
            setSelectedAccount(null);
          }}
        />
      )}
    </section>
  );
}

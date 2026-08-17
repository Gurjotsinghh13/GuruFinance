"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, IndianRupee, TrendingDown, TrendingUp,
  CheckCircle2, AlertCircle, Clock, X, Loader2,
  MessageCircle, Phone, FileText, MoreVertical,
  ChevronDown, ChevronUp, Plus
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "@/utils";
import { DueStatus, LoanStatus, PaymentMethod } from "@prisma/client";
import { PaymentModal } from "@/components/payments/PaymentModal";
import { closeLoanAction, principalRepaymentAction, loanTopUpAction } from "@/app/actions/loans";
import type { LoanSummaryOutput } from "@/features/interest-engine";
import type { Loan, Borrower, InterestDue, Payment, LoanTransaction, Cheque } from "@prisma/client";

interface Props {
  loan: Loan & {
    borrower: Borrower;
    interestDues: InterestDue[];
    payments: (Payment & { allocations: any[]; cheque: Cheque | null })[];
    transactions: LoanTransaction[];
    cheques: Cheque[];
  };
  summary: LoanSummaryOutput;
  balanceWhatsappLink: string;
}

type Tab = "dues" | "payments" | "transactions";
const COLLECTIBLE_DUE_STATUSES: DueStatus[] = [
  DueStatus.PENDING,
  DueStatus.PARTIAL,
  DueStatus.OVERDUE,
];

export function LoanDetailClient({ loan, summary, balanceWhatsappLink }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("dues");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedDue, setSelectedDue] = useState<InterestDue | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isActive = loan.status === LoanStatus.ACTIVE;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const collectibleDues = loan.interestDues.filter((d) =>
    COLLECTIBLE_DUE_STATUSES.includes(d.status) &&
    new Date(d.dueDate).getTime() <= todayStart.getTime()
  );
  const upcomingDues = loan.interestDues
    .filter((d) =>
      COLLECTIBLE_DUE_STATUSES.includes(d.status) &&
      new Date(d.dueDate).getTime() > todayStart.getTime()
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const ledgerDues = loan.interestDues.filter(
    (d) => d.status === DueStatus.PAID || new Date(d.dueDate).getTime() <= todayStart.getTime()
  );
  const nextDue = collectibleDues.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  )[0];

  function handleCloseLoan() {
    startTransition(async () => {
      const result = await closeLoanAction(loan.id);
      if (result.error) {
        setError(result.error);
      } else {
        setShowCloseConfirm(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back nav */}
      <div className="flex items-center gap-2">
        <Link href={`/borrowers/${loan.borrowerId}`} className="btn-ghost p-2" aria-label="Back to borrower">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500">{loan.borrower.fullName}</p>
          <h1 className="font-mono font-bold text-indigo-700">{loan.loanNumber}</h1>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button onClick={() => setShowMenu((s) => !s)} className="btn-ghost p-2" aria-label="Open menu">
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-20 w-48 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden py-1">
                {isActive && (
                  <>
                    <button
                      onClick={() => { setShowMenu(false); setShowTopUpModal(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Top-Up Loan
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); setShowRepayModal(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      Principal Repayment
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); setShowCloseConfirm(true); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <X className="w-3.5 h-3.5" />
                      Close Loan
                    </button>
                  </>
                )}
                <a
                  href={balanceWhatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full"
                  onClick={() => setShowMenu(false)}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Balance Reminder
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loan summary card */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={isActive ? "badge-active" : "badge-closed"}>{loan.status}</span>
              <span className="text-sm text-gray-500">
                {formatPercent(Number(loan.interestRate))} / {loan.loanFrequency === "MONTHLY" ? "month" : "day"}
              </span>
              <span className="text-sm text-gray-500">
                {loan.interestType === "COMPOUND" ? "Compound Interest" : "Simple Interest"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Started {formatDate(loan.startDate)}</p>
          </div>
          {isActive && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="btn-primary text-sm"
            >
              <Plus className="w-4 h-4" />
              Receive
            </button>
          )}
        </div>

        {/* Financial grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">
              {loan.interestType === "COMPOUND" ? "Base Principal" : "Current Principal"}
            </p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {formatCurrency(Number(loan.currentPrincipal))}
            </p>
            {Number(loan.currentPrincipal) !== Number(loan.principalAmount) && (
              <p className="text-xs text-gray-400">orig. {formatCurrency(Number(loan.principalAmount))}</p>
            )}
            {loan.interestType === "COMPOUND" && (
              <div className="mt-2 space-y-0.5 text-xs">
                <p className="text-gray-500">
                  Capitalized Interest: {formatCurrency(summary.capitalizedInterest)}
                </p>
                <p className="font-semibold text-gray-800">
                  Effective Principal: {formatCurrency(summary.effectivePrincipal)}
                </p>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-xs text-gray-500">Interest Received</p>
            <p className="text-lg font-bold text-emerald-700 tabular-nums">
              {formatCurrency(summary.totalInterestReceived)}
            </p>
          </div>
          <div className={`rounded-lg p-3 ${summary.overdueInterest > 0 ? "bg-red-50" : "bg-amber-50"}`}>
            <p className="text-xs text-gray-500">Unpaid Interest</p>
            <p className={`text-lg font-bold tabular-nums ${summary.overdueInterest > 0 ? "text-red-700" : "text-amber-700"}`}>
              {formatCurrency(summary.pendingInterest + summary.overdueInterest)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Total Outstanding</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {formatCurrency(Number(loan.currentPrincipal) + summary.pendingInterest + summary.overdueInterest)}
            </p>
          </div>
        </div>

        {/* Next due */}
        {nextDue && isActive && (
          <div className={`mt-3 rounded-lg px-4 py-3 flex items-center justify-between ${
            nextDue.status === DueStatus.OVERDUE ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"
          }`}>
            <div>
              <p className="text-xs font-medium text-gray-500">
                {nextDue.status === DueStatus.OVERDUE ? "Overdue Since" : "Next Due"}
              </p>
              <p className="text-sm font-semibold text-gray-900">{formatDate(nextDue.dueDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums text-gray-900">
                {formatCurrency(Number(nextDue.dueAmount) - Number(nextDue.paidAmount))}
              </p>
              {nextDue.status === DueStatus.OVERDUE && (
                <p className="text-xs text-red-600">{nextDue.daysOverdue}d overdue</p>
              )}
            </div>
          </div>
        )}

        {upcomingDues.length > 0 && isActive && (
          <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-xs font-medium text-blue-700 mb-2">Upcoming Dues</p>
            <div className="space-y-1.5">
              {upcomingDues.slice(0, 3).map((due) => (
                <div key={due.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{formatDate(due.dueDate)}</span>
                  <span className="font-semibold tabular-nums text-gray-900">
                    {formatCurrency(Number(due.dueAmount) - Number(due.paidAmount) - Number(due.waivedAmount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collateral */}
        {loan.collateral && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Collateral: <span className="font-medium text-gray-700">{loan.collateral}</span></p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-gray-200">
          {(["dues", "payments", "transactions"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "payments" ? "received" : tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* DUES TAB */}
          {activeTab === "dues" && (
            <div className="space-y-2">
              {ledgerDues.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No dues generated yet</p>
              ) : (
                [...ledgerDues]
                  .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
                  .map((due) => {
                    const outstanding = Number(due.dueAmount) - Number(due.paidAmount) - Number(due.waivedAmount);
                    return (
                      <div
                        key={due.id}
                        className={`flex items-center justify-between rounded-lg px-3 py-3 border ${
                          due.status === DueStatus.PAID
                            ? "bg-emerald-50/50 border-emerald-100"
                            : due.status === DueStatus.OVERDUE
                            ? "bg-red-50 border-red-200"
                            : due.status === DueStatus.PARTIAL
                            ? "bg-amber-50/50 border-amber-200"
                            : "bg-gray-50 border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {due.status === DueStatus.PAID ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : due.status === DueStatus.OVERDUE ? (
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-800">{formatDate(due.dueDate)}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={
                                due.status === DueStatus.PAID ? "badge-paid" :
                                due.status === DueStatus.OVERDUE ? "badge-overdue" :
                                due.status === DueStatus.PARTIAL ? "badge-partial" : "badge-pending"
                              }>
                                {due.status}
                              </span>
                              {due.status === DueStatus.OVERDUE && (
                                <span className="text-xs text-red-500">{due.daysOverdue}d</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums text-gray-900">
                            {formatCurrency(Number(due.dueAmount))}
                          </p>
                          {due.status === DueStatus.PARTIAL && (
                            <p className="text-xs text-amber-600 tabular-nums">
                              {formatCurrency(outstanding)} left
                            </p>
                          )}
                          {due.status === DueStatus.PAID && Number(due.paidAmount) > 0 && (
                            <p className="text-xs text-emerald-600">Paid</p>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* PAYMENTS TAB */}
          {activeTab === "payments" && (
            <div className="space-y-2">
              {loan.payments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No receipts recorded</p>
              ) : (
                loan.payments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold tabular-nums text-emerald-700">
                          {formatCurrency(Number(payment.amount))}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(payment.paymentDate)} · {payment.paymentMethod}
                        </p>
                        {payment.receiptNumber && (
                          <p className="text-xs text-gray-400 mt-0.5">{payment.receiptNumber}</p>
                        )}
                        {payment.notes && (
                          <p className="text-xs text-gray-500 mt-0.5 italic">{payment.notes}</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>{payment.allocations.length} due(s) covered</p>
                        {payment.cheque && (
                          <p className="text-amber-600">Cheque #{payment.cheque.chequeNumber}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === "transactions" && (
            <div className="space-y-2">
              {loan.transactions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No transactions</p>
              ) : (
                loan.transactions.map((tx) => (
                  <div key={tx.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {tx.type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(tx.transactionDate)}</p>
                        {tx.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{tx.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold tabular-nums ${
                          tx.type === "LOAN_TOPUP" ? "text-indigo-700" :
                          tx.type === "PRINCIPAL_REPAYMENT" ? "text-emerald-700" :
                          "text-gray-900"
                        }`}>
                          {tx.type === "LOAN_TOPUP" ? "+" : tx.type === "PRINCIPAL_REPAYMENT" ? "-" : ""}
                          {formatCurrency(Number(tx.amount))}
                        </p>
                        <p className="text-xs text-gray-400">
                          → {formatCurrency(Number(tx.principalAfter))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment modal */}
      {showPaymentModal && (
        <PaymentModal
          loanId={loan.id}
          defaultAmount={nextDue ? Number(nextDue.dueAmount) - Number(nextDue.paidAmount) : 0}
          borrowerName={loan.borrower.fullName}
          loanNumber={loan.loanNumber}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {/* Top-up modal */}
      {showTopUpModal && (
        <TopUpModal
          loanId={loan.id}
          currentPrincipal={Number(loan.currentPrincipal)}
          onClose={() => { setShowTopUpModal(false); router.refresh(); }}
        />
      )}

      {/* Principal repayment modal */}
      {showRepayModal && (
        <PrincipalRepayModal
          loanId={loan.id}
          currentPrincipal={Number(loan.currentPrincipal)}
          onClose={() => { setShowRepayModal(false); router.refresh(); }}
        />
      )}

      {/* Close loan confirm */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-2">Close this loan?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Future interest dues will stop generating. This action cannot be easily undone.
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowCloseConfirm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleCloseLoan} disabled={isPending} className="btn-danger flex-1">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Close Loan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Top-Up Modal ─────────────────────────────────────────
function TopUpModal({
  loanId, currentPrincipal, onClose
}: { loanId: string; currentPrincipal: number; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loanTopUpAction({
        loanId,
        amount: parseFloat(fd.get("amount") as string),
        topUpDate: new Date(fd.get("topUpDate") as string),
        notes: (fd.get("notes") as string) || undefined,
      });
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Loan Top-Up</h3>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close modal"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-gray-500">Current Principal: <strong>{formatCurrency(currentPrincipal)}</strong></p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Top-Up Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <input name="amount" type="number" step="0.01" min="1" required className="input-base pl-8" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input name="topUpDate" type="date" defaultValue={today} max={today} required className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <input name="notes" type="text" className="input-base" placeholder="Optional" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Top-Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Principal Repay Modal ────────────────────────────────
function PrincipalRepayModal({
  loanId, currentPrincipal, onClose
}: { loanId: string; currentPrincipal: number; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await principalRepaymentAction({
        loanId,
        amount: parseFloat(fd.get("amount") as string),
        repaymentDate: new Date(fd.get("repaymentDate") as string),
        notes: (fd.get("notes") as string) || undefined,
      });
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Principal Repayment</h3>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close modal"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-gray-500">
            Current Principal: <strong>{formatCurrency(currentPrincipal)}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Repayment Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
              <input name="amount" type="number" step="0.01" min="1" max={currentPrincipal} required className="input-base pl-8" placeholder="0" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Max: {formatCurrency(currentPrincipal)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input name="repaymentDate" type="date" defaultValue={today} max={today} required className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <input name="notes" type="text" className="input-base" placeholder="Optional" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Record Repayment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { X, Loader2, IndianRupee } from "lucide-react";
import { recordPaymentAction } from "@/app/actions/payments";
import { PaymentMethod } from "@prisma/client";
import { formatCurrency } from "@/utils";
import { useRouter } from "next/navigation";

interface Props {
  loanId: string;
  dueId?: string;
  defaultAmount: number;
  borrowerName: string;
  loanNumber: string;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { value: PaymentMethod.CASH, label: "Cash" },
  { value: PaymentMethod.UPI, label: "UPI" },
  { value: PaymentMethod.BANK_TRANSFER, label: "Bank Transfer" },
  { value: PaymentMethod.CHEQUE, label: "Cheque" },
];

export function PaymentModal({
  loanId,
  dueId,
  defaultAmount,
  borrowerName,
  loanNumber,
  onClose,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [showChequeFields, setShowChequeFields] = useState(false);

  function handleMethodChange(m: PaymentMethod) {
    setMethod(m);
    setShowChequeFields(m === PaymentMethod.CHEQUE);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const amount = parseFloat(fd.get("amount") as string);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    startTransition(async () => {
      const result = await recordPaymentAction({
        loanId,
        amount,
        paymentDate: new Date(fd.get("paymentDate") as string),
        paymentMethod: method,
        notes: fd.get("notes") as string || undefined,
        chequeNumber: fd.get("chequeNumber") as string || undefined,
        bankName: fd.get("bankName") as string || undefined,
        chequeDate: fd.get("chequeDate")
          ? new Date(fd.get("chequeDate") as string)
          : undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          router.refresh();
        }, 1200);
      }
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Record Payment</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {borrowerName} · {loanNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <IndianRupee className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="font-semibold text-gray-900">Payment Recorded!</p>
            <p className="text-sm text-gray-500 mt-1">Ledger updated successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount Received
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  ₹
                </span>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={defaultAmount}
                  placeholder="0"
                  required
                  className="input-base pl-8 text-lg font-semibold"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Expected: {formatCurrency(defaultAmount)}
              </p>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Payment Date
              </label>
              <input
                name="paymentDate"
                type="date"
                defaultValue={today}
                max={today}
                required
                className="input-base"
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => handleMethodChange(m.value)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      method === m.value
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cheque fields */}
            {showChequeFields && (
              <div className="space-y-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Cheque Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Cheque Number
                    </label>
                    <input
                      name="chequeNumber"
                      type="text"
                      required={showChequeFields}
                      className="input-base text-sm"
                      placeholder="123456"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <input
                      name="bankName"
                      type="text"
                      required={showChequeFields}
                      className="input-base text-sm"
                      placeholder="SBI"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cheque Date
                  </label>
                  <input
                    name="chequeDate"
                    type="date"
                    className="input-base text-sm"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                name="notes"
                type="text"
                placeholder="Any notes..."
                className="input-base"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Record Payment"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

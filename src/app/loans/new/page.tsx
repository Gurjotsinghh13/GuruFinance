"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createLoanAction } from "@/app/actions/loans";
import { InterestType, LoanFrequency, CompoundingRule } from "@prisma/client";
import { ArrowLeft, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/utils";
import { monthlyInterestAmount } from "@/features/interest-engine";

export default function NewLoanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const borrowerId = searchParams.get("borrowerId") || "";

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Live preview state
  const [principal, setPrincipal] = useState(0);
  const [rate, setRate] = useState(0);
  const [frequency, setFrequency] = useState<LoanFrequency>(LoanFrequency.MONTHLY);
  const [interestType, setInterestType] = useState<InterestType>(InterestType.SIMPLE);
  const [showCompound, setShowCompound] = useState(false);

  const previewMonthly =
    principal > 0 && rate > 0
      ? monthlyInterestAmount(principal, rate)
      : 0;

  function handleInterestTypeChange(type: InterestType) {
    setInterestType(type);
    setShowCompound(type === InterestType.COMPOUND);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const startDateStr = fd.get("startDate") as string;
    const startDate = new Date(startDateStr);

    startTransition(async () => {
      const result = await createLoanAction({
        borrowerId,
        principalAmount: parseFloat(fd.get("principalAmount") as string),
        interestRate: parseFloat(fd.get("interestRate") as string),
        interestType,
        loanFrequency: fd.get("loanFrequency") as LoanFrequency,
        compoundingRule: fd.get("compoundingRule") as CompoundingRule | undefined,
        startDate,
        dueDay: startDate.getDate(), // Default: same day as start
        notes: (fd.get("notes") as string) || undefined,
        collateral: (fd.get("collateral") as string) || undefined,
        guarantorName: (fd.get("guarantorName") as string) || undefined,
        guarantorMobile: (fd.get("guarantorMobile") as string) || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push(`/loans/${result.loanId}`);
      }
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={borrowerId ? `/borrowers/${borrowerId}` : "/loans"}
          className="btn-ghost p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">New Loan</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Principal */}
        <div className="card p-4 space-y-4">
          <h2 className="section-title">Loan Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Principal Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
              <input
                name="principalAmount"
                type="number"
                step="0.01"
                min="1"
                required
                className="input-base pl-8"
                placeholder="0"
                onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Interest Rate <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  name="interestRate"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="input-base pr-8"
                  placeholder="3"
                  onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Frequency <span className="text-red-500">*</span>
              </label>
              <select
                name="loanFrequency"
                required
                className="input-base"
                onChange={(e) => setFrequency(e.target.value as LoanFrequency)}
              >
                <option value={LoanFrequency.MONTHLY}>Monthly</option>
                <option value={LoanFrequency.DAILY}>Daily</option>
              </select>
            </div>
          </div>

          {/* Interest preview */}
          {previewMonthly > 0 && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-indigo-900">
                    Monthly interest: {formatCurrency(previewMonthly)}
                  </p>
                  <p className="text-xs text-indigo-600 mt-0.5">
                    {rate}% of {formatCurrency(principal)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Interest Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: InterestType.SIMPLE, label: "Simple Interest" },
                { value: InterestType.COMPOUND, label: "Compound Interest" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleInterestTypeChange(opt.value)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors text-left ${
                    interestType === opt.value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Compounding rule */}
          {showCompound && (
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Compounding Rule
                </label>
                <select name="compoundingRule" className="input-base">
                  <option value={CompoundingRule.MONTHLY}>Compound Monthly</option>
                  <option value={CompoundingRule.AFTER_1_MISSED}>After 1 Missed Payment</option>
                  <option value={CompoundingRule.AFTER_2_MISSED}>After 2 Missed Payments</option>
                  <option value={CompoundingRule.CUSTOM}>Custom</option>
                </select>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Unpaid eligible interest can be capitalized according to the loan's compounding rules.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="card p-4 space-y-4">
          <h2 className="section-title">Dates</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Loan Start Date <span className="text-red-500">*</span>
            </label>
            <input
              name="startDate"
              type="date"
              defaultValue={today}
              max={today}
              required
              className="input-base"
            />
            <p className="text-xs text-gray-500 mt-1">
              Interest dues will be generated on this day each month
            </p>
          </div>
        </div>

        {/* Collateral & guarantor */}
        <div className="card p-4 space-y-4">
          <h2 className="section-title">Security Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Collateral
            </label>
            <input
              name="collateral"
              type="text"
              className="input-base"
              placeholder="e.g., Gold chain, Property documents, RC book"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Guarantor Name
              </label>
              <input name="guarantorName" type="text" className="input-base" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Guarantor Mobile
              </label>
              <input name="guarantorMobile" type="tel" className="input-base" placeholder="Optional" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Notes
          </label>
          <textarea name="notes" rows={3} className="input-base resize-none" placeholder="Any additional notes..." />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pb-4">
          <Link
            href={borrowerId ? `/borrowers/${borrowerId}` : "/loans"}
            className="btn-secondary flex-1 text-center"
          >
            Cancel
          </Link>
          <button type="submit" disabled={isPending} className="btn-primary flex-1">
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Loan"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

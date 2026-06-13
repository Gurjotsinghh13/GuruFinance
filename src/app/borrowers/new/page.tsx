"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBorrowerAction } from "@/app/actions/borrowers";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewBorrowerPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createBorrowerAction({
        fullName: fd.get("fullName") as string,
        mobile: fd.get("mobile") as string,
        alternateMobile: (fd.get("alternateMobile") as string) || undefined,
        address: (fd.get("address") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push(`/borrowers/${result.borrowerId}`);
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/borrowers" className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">New Borrower</h1>
      </div>

      <div className="card p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input name="fullName" type="text" required className="input-base" placeholder="Enter full name" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <input name="mobile" type="tel" required className="input-base" placeholder="10-digit mobile number" pattern="[0-9]{10}" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Alternate Mobile
            </label>
            <input name="alternateMobile" type="tel" className="input-base" placeholder="Optional" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Address
            </label>
            <textarea name="address" rows={3} className="input-base resize-none" placeholder="Home or work address" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes
            </label>
            <textarea name="notes" rows={2} className="input-base resize-none" placeholder="Any additional notes..." />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Link href="/borrowers" className="btn-secondary flex-1 text-center">
              Cancel
            </Link>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Borrower"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

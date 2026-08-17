"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBorrowerAction } from "@/app/actions/borrowers";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Borrower } from "@prisma/client";

// This is a client component that receives borrower data as props
// The server page fetches data and passes it here
export function EditBorrowerForm({ borrower }: { borrower: Borrower }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateBorrowerAction(borrower.id, {
        fullName: fd.get("fullName") as string,
        mobile: fd.get("mobile") as string,
        alternateMobile: (fd.get("alternateMobile") as string) || undefined,
        address: (fd.get("address") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push(`/borrowers/${borrower.id}`);
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/borrowers/${borrower.id}`} className="btn-ghost p-2" aria-label="Back to borrower">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Edit Borrower</h1>
      </div>

      <div className="card p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input name="fullName" type="text" required defaultValue={borrower.fullName} className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number</label>
            <input name="mobile" type="tel" required defaultValue={borrower.mobile} className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Alternate Mobile</label>
            <input name="alternateMobile" type="tel" defaultValue={borrower.alternateMobile || ""} className="input-base" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <textarea name="address" rows={3} defaultValue={borrower.address || ""} className="input-base resize-none" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea name="notes" rows={2} defaultValue={borrower.notes || ""} className="input-base resize-none" placeholder="Optional" />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Link href={`/borrowers/${borrower.id}`} className="btn-secondary flex-1 text-center">Cancel</Link>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { setupAccountEmailAction } from "@/app/actions/auth";
import { Landmark, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import Link from "next/link";

export default function AccountSetupPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await setupAccountEmailAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
          <Landmark className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">LoanBook</h1>
          <p className="text-sm text-gray-500 mt-0.5">Smart Loan &amp; Interest Management</p>
        </div>
      </div>

      {/* Account setup card */}
      <div className="w-full max-w-sm card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Link href="/login" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h2 className="text-lg font-semibold text-gray-900">Account Migration</h2>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Existing lenders: Enter your registered mobile number and password to link your email address for secure login.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Registered Mobile */}
          <div>
            <label
              htmlFor="mobile"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Registered Mobile Number
            </label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              placeholder="10-digit mobile number"
              className="input-base"
            />
          </div>

          {/* Account Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Account Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Enter your current password"
              className="input-base"
            />
          </div>

          {/* New Email Address */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              New Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="Enter your email address"
              className="input-base"
            />
          </div>

          {/* Confirm Email Address */}
          <div>
            <label
              htmlFor="confirmEmail"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Confirm Email Address
            </label>
            <input
              id="confirmEmail"
              name="confirmEmail"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="Re-enter your email address"
              className="input-base"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Linking Email...
              </>
            ) : (
              "Complete Email Setup"
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        LoanBook — Smart Loan &amp; Interest Management
      </p>
    </div>
  );
}

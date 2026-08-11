"use client";

import { useState, useTransition } from "react";
import { registerAction } from "@/app/actions/auth";
import { Landmark, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await registerAction(formData);
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

      {/* Registration card */}
      <div className="w-full max-w-sm card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Create an account</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Enter your full name"
              className="input-base"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Email Address
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

          {/* Mobile (contact info) */}
          <div>
            <label
              htmlFor="mobile"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Mobile Number
            </label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              placeholder="Enter 10-digit mobile number"
              className="input-base"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                className="input-base pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Re-enter your password"
                className="input-base pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
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
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>

          {/* Login link */}
          <div className="text-center pt-2">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        LoanBook — Smart Loan &amp; Interest Management
      </p>
    </div>
  );
}

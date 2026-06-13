"use client";

import { useState, useTransition } from "react";
import { forgotPasswordAction, resetPasswordAction } from "@/app/actions/auth";
import { Landmark, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const mobile = fd.get("mobile") as string;

    startTransition(async () => {
      const result = await forgotPasswordAction(mobile);
      if (result.token) {
        // Dev mode: show token directly
        setToken(result.token);
        setMessage(`Dev mode: Your reset token is shown below. In production, this would be sent via SMS.`);
        setStep("reset");
      } else {
        setMessage("If this mobile number is registered, a reset link has been sent.");
      }
    });
  }

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const newPassword = fd.get("newPassword") as string;
    const confirmPassword = fd.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordAction(
        fd.get("token") as string,
        newPassword
      );
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/login?reset=success");
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
          <Landmark className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">GuruFinance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Smart Loan & Interest Management</p>
        </div>
      </div>

      <div className="w-full max-w-sm card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Link href="/login" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h2 className="text-lg font-semibold text-gray-900">
            {step === "request" ? "Forgot Password" : "Reset Password"}
          </h2>
        </div>

        {step === "request" && (
          <form onSubmit={handleRequest} className="space-y-4">
            <p className="text-sm text-gray-500">
              Enter your registered mobile number to reset your password.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mobile Number
              </label>
              <input
                name="mobile"
                type="tel"
                required
                className="input-base"
                placeholder="10-digit mobile number"
              />
            </div>

            {message && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                <p className="text-sm text-blue-700">{message}</p>
              </div>
            )}

            <button type="submit" disabled={isPending} className="btn-primary w-full">
              {isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleReset} className="space-y-4">
            {message && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-sm text-amber-700">{message}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reset Token
              </label>
              <input
                name="token"
                type="text"
                required
                defaultValue={token}
                className="input-base font-mono text-sm"
                placeholder="Paste your reset token"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <input
                name="newPassword"
                type="password"
                required
                minLength={8}
                className="input-base"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                className="input-base"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button type="submit" disabled={isPending} className="btn-primary w-full">
              {isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

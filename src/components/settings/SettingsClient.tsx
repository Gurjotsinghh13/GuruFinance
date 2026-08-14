"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings, MessageSquare, Lock, Save, Loader2, Check, Download, UserCheck } from "lucide-react";
import { saveTemplateAction } from "@/app/actions/settings";
import { changePasswordAction, updateAccountAction, exportUserDataAction } from "@/app/actions/auth";
import type { SessionUser } from "@/types";

interface Template {
  type: string;
  value: string;
}

interface Props {
  user: SessionUser;
  mobile: string;
  templates: Template[];
}


const TEMPLATE_LABELS: Record<string, string> = {
  DUE_REMINDER: "Due Reminder",
  BALANCE_REMINDER: "Balance Reminder",
  PAYMENT_RECEIPT: "Receipt Message",
  ACCOUNT_STATEMENT: "Account Statement",
};

const TEMPLATE_VARS: Record<string, string[]> = {
  DUE_REMINDER: ["{{borrowerName}}", "{{amount}}", "{{dueDate}}", "{{loanNumber}}", "{{interestType}}"],
  BALANCE_REMINDER: ["{{borrowerName}}", "{{loanNumber}}", "{{interestType}}", "{{principal}}", "{{pendingInterest}}", "{{totalOutstanding}}"],
  PAYMENT_RECEIPT: ["{{borrowerName}}", "{{allocationDetails}}", "{{amount}}", "{{paymentDate}}", "{{paymentMethod}}", "{{loanNumber}}", "{{interestType}}", "{{receiptNumber}}", "{{remainingBalance}}"],
  ACCOUNT_STATEMENT: ["{{borrowerName}}", "{{loanNumber}}", "{{interestType}}", "{{principal}}", "{{interestRate}}", "{{totalPaid}}", "{{pendingInterest}}", "{{outstandingPrincipal}}"],
};

export function SettingsClient({ user, mobile, templates }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"templates" | "security" | "export">("templates");
  const [templateValues, setTemplateValues] = useState<Record<string, string>>(
    Object.fromEntries(templates.map((t) => [t.type, t.value]))
  );
  const [savedTypes, setSavedTypes] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [exportError, setExportError] = useState<string | null>(null);

  function handleSaveTemplate(type: string) {
    startTransition(async () => {
      const result = await saveTemplateAction(type, templateValues[type]);
      if (result.success) {
        setSavedTypes((s) => new Set([...s, type]));
        router.refresh();
        setTimeout(() => setSavedTypes((s) => { const n = new Set(s); n.delete(type); return n; }), 2000);
      }
    });
  }

  async function handleUpdateAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateAccountAction(fd);
      if (result.error) setAccountError(result.error);
      else setAccountSuccess(true);
    });
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await changePasswordAction(fd);
      if (result.error) setPasswordError(result.error);
      else { setPasswordSuccess(true); (e.target as HTMLFormElement).reset(); }
    });
  }

  async function handleExportData() {
    setExportError(null);
    startTransition(async () => {
      const result = await exportUserDataAction();
      if (result.error || !result.csvData) {
        setExportError(result.error || "Failed to export portfolio data");
        return;
      }
      const blob = new Blob([result.csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", result.filename || "loanbook_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {[
          { value: "templates", label: "WhatsApp Templates", icon: MessageSquare },
          { value: "security", label: "Account & Security", icon: Lock },
          { value: "export", label: "Data Export", icon: Download },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* WhatsApp Templates */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              <p className="text-sm text-gray-600">
                Customize messages sent via WhatsApp. Use the variables shown below each template.
              </p>
            </div>
          </div>

          {templates.map((template) => (
            <div key={template.type} className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{TEMPLATE_LABELS[template.type]}</h3>
                <button
                  onClick={() => handleSaveTemplate(template.type)}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    savedTypes.has(template.type)
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {savedTypes.has(template.type) ? (
                    <><Check className="w-3.5 h-3.5" /> Saved</>
                  ) : isPending ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving</>
                  ) : (
                    <><Save className="w-3.5 h-3.5" /> Save</>
                  )}
                </button>
              </div>

              <textarea
                rows={6}
                value={templateValues[template.type] || ""}
                onChange={(e) =>
                  setTemplateValues((prev) => ({ ...prev, [template.type]: e.target.value }))
                }
                className="input-base resize-none font-mono text-xs leading-relaxed"
              />

              <div className="flex flex-wrap gap-1.5">
                {(TEMPLATE_VARS[template.type] || []).map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() =>
                      setTemplateValues((prev) => ({
                        ...prev,
                        [template.type]: (prev[template.type] || "") + variable,
                      }))
                    }
                    className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 font-mono transition-colors"
                  >
                    {variable}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">Click a variable to insert it at the end</p>
            </div>
          ))}
        </div>
      )}

      {/* Security & Account */}
      {activeTab === "security" && (
        <div className="space-y-4">
          {/* Account Details Update */}
          <div className="card p-5">
            <h3 className="font-medium text-gray-900 mb-4">Account Information</h3>
            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input name="name" type="text" defaultValue={user.name} required className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="input-base bg-gray-50 text-gray-500 cursor-not-allowed"
                  title="Email address cannot be changed here. Contact support to update your email."
                />
                <p className="text-xs text-gray-400 mt-1">Email address is used for login and cannot be changed here.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number</label>
                <input name="mobile" type="tel" defaultValue={mobile} required className="input-base" />
              </div>

              {accountError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{accountError}</p>
                </div>
              )}
              {accountSuccess && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <p className="text-sm text-emerald-700">Account details updated successfully.</p>
                </div>
              )}

              <button type="submit" disabled={isPending} className="btn-primary w-full">
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Account Details"}
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="card p-5">
            <h3 className="font-medium text-gray-900 mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                <input name="currentPassword" type="password" required className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <input name="newPassword" type="password" required minLength={8} className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                <input name="confirmPassword" type="password" required minLength={8} className="input-base" />
              </div>

              {passwordError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-700">{passwordError}</p>
                </div>
              )}
              {passwordSuccess && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <p className="text-sm text-emerald-700">Password changed successfully.</p>
                </div>
              )}

              <button type="submit" disabled={isPending} className="btn-primary w-full">
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Data Export */}
      {activeTab === "export" && (
        <div className="card p-5 space-y-4">
          <div>
            <h3 className="font-medium text-gray-900">Export Portfolio Data</h3>
            <p className="text-xs text-gray-500 mt-1">
              Download your complete borrower and loan portfolio data as a sanitized CSV spreadsheet.
            </p>
          </div>

          {exportError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{exportError}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportData}
            disabled={isPending}
            className="btn-primary w-full inline-flex items-center justify-center gap-2"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
            ) : (
              <><Download className="w-4 h-4" /> Download Portfolio CSV</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

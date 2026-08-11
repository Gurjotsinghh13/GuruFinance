import {
  getDashboardDataAction,
} from "@/app/actions/payments";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { TodayCollectionList } from "@/components/dashboard/TodayCollectionList";
import { OverdueList } from "@/components/dashboard/OverdueList";
import { MorningBriefing } from "@/components/dashboard/MorningBriefing";
import { CollectedTodayList } from "@/components/dashboard/CollectedTodayList";
import { format } from "date-fns";

import Link from "next/link";
import { UserPlus } from "lucide-react";

export default async function DashboardPage() {
  const { stats, todayCollections, overdueAccounts, collectedToday } =
    await getDashboardDataAction();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          LoanBook
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {greeting} - Smart Loan & Interest Management
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {format(new Date(), "EEEE, d MMMM yyyy")}
        </p>
      </div>

      {/* Onboarding card for new lenders */}
      {stats.activeBorrowerCount === 0 && stats.activeLoanCount === 0 && (
        <div className="card p-6 bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-100 text-center space-y-4 shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
            👋
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Start managing your lending business</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
              Welcome to LoanBook! Follow these two quick steps to set up your portfolio:
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left py-2">
            <div className="p-3 rounded-lg border border-gray-200 bg-white flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p className="text-xs font-semibold text-gray-900">Add your first borrower</p>
                <p className="text-xs text-gray-500">Record contact details & profile</p>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 bg-white flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p className="text-xs font-semibold text-gray-900">Create your first loan</p>
                <p className="text-xs text-gray-500">Set principal & interest rate</p>
              </div>
            </div>
          </div>
          <div className="pt-1">
            <Link href="/borrowers/new" className="btn-primary inline-flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add First Borrower
            </Link>
          </div>
        </div>
      )}

      {/* Morning briefing */}
      <MorningBriefing
        todayCount={todayCollections.length}
        todayAmount={todayCollections.reduce((s, c) => s + c.remainingAmount, 0)}
        overdueCount={stats.overdueCount}
        overdueAmount={stats.overdueInterest}
        pendingInterest={stats.pendingInterest}
      />

      {/* Key stats */}
      <DashboardStats stats={stats} />

      {/* Today's collections */}
      <TodayCollectionList collections={todayCollections} />

      {/* Collected today */}
      <CollectedTodayList payments={collectedToday} />

      {/* Overdue accounts */}
      {overdueAccounts.length > 0 && (
        <OverdueList accounts={overdueAccounts} />
      )}
    </div>
  );
}

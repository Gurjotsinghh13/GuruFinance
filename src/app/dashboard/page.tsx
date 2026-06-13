import { getDashboardStatsAction, getTodayCollectionsAction, getOverdueAccountsAction } from "@/app/actions/payments";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { TodayCollectionList } from "@/components/dashboard/TodayCollectionList";
import { OverdueList } from "@/components/dashboard/OverdueList";
import { MorningBriefing } from "@/components/dashboard/MorningBriefing";
import { format } from "date-fns";

export default async function DashboardPage() {
  const [stats, todayCollections, overdueAccounts] = await Promise.all([
    getDashboardStatsAction(),
    getTodayCollectionsAction(),
    getOverdueAccountsAction(),
  ]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          GuruFinance
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {greeting} - Smart Loan & Interest Management
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {format(new Date(), "EEEE, d MMMM yyyy")}
        </p>
      </div>

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

      {/* Overdue accounts */}
      {overdueAccounts.length > 0 && (
        <OverdueList accounts={overdueAccounts} />
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Phone, ChevronRight, Archive, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/utils";
import { DueStatus } from "@prisma/client";
import { archiveBorrowerAction, restoreBorrowerAction } from "@/app/actions/borrowers";

interface BorrowerData {
  id: string;
  fullName: string;
  mobile: string;
  isArchived: boolean;
  loans: {
    id: string;
    status: string;
    currentPrincipal: any;
    interestDues: { dueAmount: any; paidAmount: any; waivedAmount: any; status: string }[];
  }[];
  _count: { loans: number };
}

interface Props {
  borrowers: BorrowerData[];
  initialSearch?: string;
  showArchived?: boolean;
}

export function BorrowersList({ borrowers, initialSearch, showArchived }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch || "");
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setSearch(value);
    const params = new URLSearchParams();
    if (value) params.set("search", value);
    if (showArchived) params.set("archived", "true");
    router.push(`/borrowers?${params.toString()}`);
  }

  function getBorrowerStats(loans: BorrowerData["loans"]) {
    const activeLoans = loans.filter((l) => l.status === "ACTIVE");
    const totalPrincipal = activeLoans.reduce(
      (s, l) => s + Number(l.currentPrincipal),
      0
    );
    let pendingInterest = 0;
    let hasOverdue = false;

    for (const loan of activeLoans) {
      for (const due of loan.interestDues) {
        const outstanding =
          Number(due.dueAmount) - Number(due.paidAmount) - Number(due.waivedAmount);
        if (outstanding > 0) {
          pendingInterest += outstanding;
          if (due.status === DueStatus.OVERDUE) hasOverdue = true;
        }
      }
    }

    return { totalPrincipal, pendingInterest, hasOverdue, activeLoanCount: activeLoans.length };
  }

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or mobile..."
            className="input-base pl-9"
          />
        </div>
        <Link
          href={showArchived ? "/borrowers" : "/borrowers?archived=true"}
          className="btn-secondary text-sm px-3"
        >
          {showArchived ? "Active" : "Archived"}
        </Link>
      </div>

      {/* Empty state */}
      {borrowers.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-gray-500 text-sm">
            {search ? `No borrowers found for "${search}"` : "No borrowers yet"}
          </p>
          {!search && (
            <Link href="/borrowers/new" className="btn-primary mt-4 mx-auto w-fit">
              Add your first borrower
            </Link>
          )}
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {borrowers.map((borrower) => {
          const stats = getBorrowerStats(borrower.loans);

          return (
            <Link
              key={borrower.id}
              href={`/borrowers/${borrower.id}`}
              className={`card p-4 flex items-center gap-4 hover:border-indigo-200 transition-colors ${
                borrower.isArchived ? "opacity-60" : ""
              } ${stats.hasOverdue ? "border-red-200" : ""}`}
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                  stats.hasOverdue
                    ? "bg-red-100 text-red-700"
                    : "bg-indigo-100 text-indigo-700"
                }`}
              >
                {borrower.fullName.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">
                    {borrower.fullName}
                  </p>
                  {stats.hasOverdue && (
                    <span className="badge-overdue">Overdue</span>
                  )}
                  {borrower.isArchived && (
                    <span className="badge-closed">Archived</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-500">{borrower.mobile}</p>
                </div>
                {stats.activeLoanCount > 0 && (
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-600 tabular-nums">
                      Principal: <span className="font-medium">{formatCurrency(stats.totalPrincipal)}</span>
                    </span>
                    {stats.pendingInterest > 0 && (
                      <span className={`text-xs tabular-nums font-medium ${stats.hasOverdue ? "text-red-600" : "text-amber-600"}`}>
                        Due: {formatCurrency(stats.pendingInterest)}
                      </span>
                    )}
                  </div>
                )}
                {stats.activeLoanCount === 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {borrower._count.loans} loan{borrower._count.loans !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

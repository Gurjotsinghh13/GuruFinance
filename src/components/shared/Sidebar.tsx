"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Landmark, LayoutDashboard, Users, FileText,
  ClipboardList, TrendingUp, Settings, LogOut, ScrollText,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/types";
import { cn } from "@/utils";

const navItems = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard },
  { href: "/borrowers", label: "Borrowers", icon: Users },
  { href: "/loans", label: "Loans", icon: FileText },
  { href: "/collections", label: "Collections", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: TrendingUp },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-200">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Landmark className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-gray-900 block leading-none">LoanBook</span>
          <span className="text-xs text-gray-400">Smart Loan & Interest Management</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-indigo-600" : "text-gray-400")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4 text-gray-400" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

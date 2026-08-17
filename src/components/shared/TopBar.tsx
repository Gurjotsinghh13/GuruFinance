import type { SessionUser } from "@/types";
import { GlobalSearch } from "./GlobalSearch";
import { LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import Link from "next/link";

export function TopBar({ user }: { user: SessionUser }) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-20">
      {/* Mobile settings button — replaces GF logo; desktop sidebar already has Settings */}
      <div className="lg:hidden flex-shrink-0">
        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      {/* Search */}
      <GlobalSearch />

      {/* User avatar */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        <div className="hidden sm:block text-right">
          <p className="text-xs font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-400">{user.role}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <form action={logoutAction} className="lg:hidden">
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}

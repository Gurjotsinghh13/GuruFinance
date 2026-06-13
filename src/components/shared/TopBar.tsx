import type { SessionUser } from "@/types";
import { GlobalSearch } from "./GlobalSearch";

export function TopBar({ user }: { user: SessionUser }) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-20">
      {/* Mobile logo */}
      <div className="lg:hidden flex-shrink-0">
        <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">GF</span>
        </div>
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
      </div>
    </header>
  );
}

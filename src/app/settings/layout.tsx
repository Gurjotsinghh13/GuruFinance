import { requireAuth } from "@/lib/auth";
import { Sidebar } from "@/components/shared/Sidebar";
import { MobileNav } from "@/components/shared/MobileNav";
import { TopBar } from "@/components/shared/TopBar";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar user={session} />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        <TopBar user={session} />
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}

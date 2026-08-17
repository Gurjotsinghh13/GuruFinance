import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/utils";

export default async function AuditLogPage() {
  const session = await requireAuth();

  const logs = await prisma.auditLog.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true } },
    },
  });

  const actionColors: Record<string, string> = {
    PAYMENT_RECORDED: "badge-paid",
    LOAN_CREATED: "badge-active",
    BORROWER_CREATED: "badge-active",
    LOAN_CLOSED: "badge-closed",
    BORROWER_ARCHIVED: "badge-closed",
    PRINCIPAL_REPAID: "badge-partial",
    LOAN_TOPUP: "badge-partial",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">Last 100 actions</p>
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-gray-100">
          {logs.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-400">No activity yet</div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={actionColors[log.action] || "badge-pending"}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-gray-500">{log.entityType}</span>
                </div>
                {log.details && typeof log.details === "object" && (
                  <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                    {JSON.stringify(log.details).slice(0, 80)}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-500">{formatDateTime(log.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

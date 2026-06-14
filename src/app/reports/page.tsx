import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DueStatus, LoanStatus } from "@prisma/client";
import { ReportsClient } from "@/components/reports/ReportsClient";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { serializeDecimal } from "@/utils";

export default async function ReportsPage() {
  const session = await requireAuth();
  const today = new Date();

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { key: format(d, "yyyy-MM"), label: format(d, "MMM yyyy"), date: d };
  }).reverse();

  const monthlyData = await Promise.all(
    months.map(async ({ key, label, date }) => {
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const reportEnd = end > today ? today : end;

      const dues = await prisma.interestDue.findMany({
        where: {
          dueDate: { gte: start, lte: reportEnd },
          loan: { borrower: { userId: session.id } },
        },
        select: {
          dueAmount: true,
          paidAmount: true,
          waivedAmount: true,
          status: true,
        },
      });

      const totalDue = dues.reduce((s, d) => s + Number(d.dueAmount), 0);
      const totalReceived = dues.reduce((s, d) => s + Number(d.paidAmount), 0);
      const totalPending = dues.reduce(
        (s, d) =>
          s + Math.max(0, Number(d.dueAmount) - Number(d.paidAmount) - Number(d.waivedAmount)),
        0
      );
      const overdueCount = dues.filter((d) => d.status === DueStatus.OVERDUE).length;

      return {
        key,
        label,
        totalDue,
        totalReceived,
        totalPending,
        overdueCount,
        collectionRate: totalDue > 0 ? Math.round((totalReceived / totalDue) * 100) : 0,
      };
    })
  );

  const activeLoansSummary = await prisma.loan.findMany({
    where: { status: LoanStatus.ACTIVE, borrower: { userId: session.id } },
    select: {
      loanNumber: true,
      currentPrincipal: true,
      interestRate: true,
      loanFrequency: true,
      borrower: { select: { fullName: true } },
      interestDues: {
        where: {
          status: { in: [DueStatus.PENDING, DueStatus.PARTIAL, DueStatus.OVERDUE] },
          dueDate: { lte: today },
        },
        select: {
          dueAmount: true,
          paidAmount: true,
          waivedAmount: true,
          status: true,
          dueDate: true,
        },
      },
    },
  });

  const overdueDues = await prisma.interestDue.findMany({
    where: {
      status: { in: [DueStatus.PENDING, DueStatus.PARTIAL, DueStatus.OVERDUE] },
      dueDate: { lt: today },
      loan: { borrower: { userId: session.id } },
    },
    select: { dueAmount: true, paidAmount: true, waivedAmount: true },
  });
  const overdueTotal = overdueDues.reduce(
    (sum, due) =>
      sum + Math.max(0, Number(due.dueAmount) - Number(due.paidAmount) - Number(due.waivedAmount)),
    0
  );

  return (
    <ReportsClient
      monthlyData={monthlyData}
      activeLoansSummary={serializeDecimal(activeLoansSummary)}
      overdueTotal={overdueTotal}
    />
  );
}

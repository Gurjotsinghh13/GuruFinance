import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DueStatus, LoanStatus, MessageType } from "@prisma/client";
import { CollectionsClient } from "@/components/collections/CollectionsClient";
import { startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { serializeDecimal } from "@/utils";
import { buildDueReminderLink, getTemplate } from "@/features/whatsapp";

interface Props {
  searchParams: Promise<{ view?: string; date?: string }>;
}

export default async function CollectionsPage({ searchParams }: Props) {
  const session = await requireAuth();
  const params = await searchParams;
  const view = params.view === "week" ? "upcoming" : params.view || "today";

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  let dateFilter: { gte: Date; lte: Date } | undefined;

  if (view === "today") {
    dateFilter = { gte: todayStart, lte: todayEnd };
  } else if (view === "upcoming") {
    dateFilter = { gte: endOfDay(today), lte: endOfDay(addDays(today, 7)) };
  } else if (view === "overdue") {
    dateFilter = { gte: new Date("2000-01-01"), lte: endOfDay(subDays(today, 1)) };
  }

  const dues = await prisma.interestDue.findMany({
    where: {
      ...(view === "overdue"
        ? {
            status: { in: [DueStatus.PENDING, DueStatus.PARTIAL, DueStatus.OVERDUE] },
            dueDate: { lt: todayStart },
          }
        : { status: { in: [DueStatus.PENDING, DueStatus.PARTIAL, DueStatus.OVERDUE] } }),
      ...(dateFilter && view !== "overdue" ? { dueDate: dateFilter } : {}),
      loan: {
        status: LoanStatus.ACTIVE,
        borrower: { userId: session.id, isArchived: false },
      },
    },
    include: {
      loan: {
        include: {
          borrower: { select: { id: true, fullName: true, mobile: true } },
        },
      },
    },
    orderBy: [{ dueDate: "asc" }],
  });

  const totalExpected = dues.reduce(
    (s, d) => s + Number(d.dueAmount) - Number(d.paidAmount) - Number(d.waivedAmount),
    0
  );
  const dueTemplate = dues.some((due) => due.dueDate <= todayStart)
    ? await getTemplate(MessageType.DUE_REMINDER)
    : undefined;
  const duesWithLinks = await Promise.all(
    dues.map(async (due) => {
      const remainingAmount =
        Number(due.dueAmount) - Number(due.paidAmount) - Number(due.waivedAmount);

      return {
        ...due,
        whatsappLink:
          due.dueDate <= todayStart
            ? await buildDueReminderLink({
                phone: due.loan.borrower.mobile,
                borrowerName: due.loan.borrower.fullName,
                amount: remainingAmount,
                dueDate: due.dueDate,
                loanNumber: due.loan.loanNumber,
              }, dueTemplate)
            : undefined,
      };
    })
  );

  return (
    <CollectionsClient
      dues={serializeDecimal(duesWithLinks)}
      totalExpected={totalExpected}
      activeView={view}
    />
  );
}

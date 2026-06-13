import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DueStatus, LoanStatus } from "@prisma/client";
import { CollectionsClient } from "@/components/collections/CollectionsClient";
import { startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { serializeDecimal } from "@/utils";

interface Props {
  searchParams: Promise<{ view?: string; date?: string }>;
}

export default async function CollectionsPage({ searchParams }: Props) {
  const session = await requireAuth();
  const params = await searchParams;
  const view = params.view || "today";

  const today = new Date();
  let dateFilter: { gte: Date; lte: Date } | undefined;

  if (view === "today") {
    dateFilter = { gte: startOfDay(today), lte: endOfDay(today) };
  } else if (view === "week") {
    dateFilter = { gte: startOfDay(today), lte: endOfDay(addDays(today, 7)) };
  } else if (view === "overdue") {
    dateFilter = { gte: new Date("2000-01-01"), lte: endOfDay(subDays(today, 1)) };
  }

  const dues = await prisma.interestDue.findMany({
    where: {
      ...(view === "overdue"
        ? { status: DueStatus.OVERDUE }
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

  return (
    <CollectionsClient
      dues={serializeDecimal(dues)}
      totalExpected={totalExpected}
      activeView={view}
    />
  );
}

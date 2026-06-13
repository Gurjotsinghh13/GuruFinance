import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const [borrowers, loans] = await Promise.all([
    prisma.borrower.findMany({
      where: {
        userId: session.id,
        isArchived: false,
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { mobile: { contains: q } },
          { alternateMobile: { contains: q } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        mobile: true,
        _count: { select: { loans: true } },
      },
      take: 5,
    }),
    prisma.loan.findMany({
      where: {
        borrower: { userId: session.id },
        OR: [
          { loanNumber: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        loanNumber: true,
        currentPrincipal: true,
        status: true,
        borrower: { select: { fullName: true } },
      },
      take: 5,
    }),
  ]);

  const results = [
    ...borrowers.map((b) => ({
      type: "borrower" as const,
      id: b.id,
      title: b.fullName,
      subtitle: b.mobile,
      href: `/borrowers/${b.id}`,
    })),
    ...loans.map((l) => ({
      type: "loan" as const,
      id: l.id,
      title: l.loanNumber,
      subtitle: `${l.borrower.fullName} · ₹${Number(l.currentPrincipal).toLocaleString("en-IN")}`,
      href: `/loans/${l.id}`,
    })),
  ];

  return NextResponse.json({ results });
}

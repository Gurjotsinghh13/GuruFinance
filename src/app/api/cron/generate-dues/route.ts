// ============================================================
// CRON JOB - Nightly Due Generation
// Vercel Cron: runs at midnight IST (18:30 UTC)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import {
  capitalizeOverdueInterest,
  generateDuesForAllLoans,
  updateOverdueStatus,
} from "@/features/due-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[CRON] Starting nightly due generation...");

  try {
    // 1. Mark past dues overdue before calculating compound principal.
    const overdueResult = await updateOverdueStatus();
    console.log(`[CRON] Marked ${overdueResult.updated} dues as overdue`);

    // 2. Capitalize eligible unpaid interest and refresh future dues only.
    const capitalizationResult = await capitalizeOverdueInterest();
    console.log(`[CRON] Capitalized ${capitalizationResult.capitalized} overdue dues`);

    // 3. Extend the rolling due window after capitalization is current.
    const dueResult = await generateDuesForAllLoans();
    console.log(`[CRON] Generated ${dueResult.totalGenerated} dues for ${dueResult.processed} loans`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dueGeneration: dueResult,
      overdueUpdate: overdueResult,
      capitalization: capitalizationResult,
    });
  } catch (error) {
    console.error("[CRON] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

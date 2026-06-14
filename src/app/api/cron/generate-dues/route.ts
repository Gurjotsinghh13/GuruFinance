// ============================================================
// CRON JOB - Nightly Due Generation
// Vercel Cron: runs at midnight IST (18:30 UTC)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { generateDuesForAllLoans, updateOverdueStatus } from "@/features/due-engine";

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
    // 1. Generate dues for all active loans (3 months rolling)
    const dueResult = await generateDuesForAllLoans();
    console.log(`[CRON] Generated ${dueResult.totalGenerated} dues for ${dueResult.processed} loans`);

    // 2. Update overdue statuses
    const overdueResult = await updateOverdueStatus();
    console.log(`[CRON] Marked ${overdueResult.updated} dues as overdue`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dueGeneration: dueResult,
      overdueUpdate: overdueResult,
    });
  } catch (error) {
    console.error("[CRON] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

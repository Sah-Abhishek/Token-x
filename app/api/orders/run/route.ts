import { NextResponse } from "next/server";
import { runFills } from "@/app/lib/orders";

/**
 * Re-price every resting order across all accounts.
 *
 * Meant for a scheduler. It is a write path over other people's balances, so
 * it runs only for a caller holding `CRON_SECRET`; with the variable unset
 * the endpoint refuses rather than defaulting to open, because an open fill
 * runner is a free way to burn the upstream rate limit.
 *
 * Reading /api/orders fills that user's own orders, so the app is correct
 * without this endpoint. A schedule only makes fills happen for someone who
 * is not currently looking.
 */
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set, so scheduled fills are disabled." },
      { status: 503 },
    );
  }

  const presented = req.headers.get("authorization");
  if (presented !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  try {
    const result = await runFills();
    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Scheduled fill run failed:", error);
    return NextResponse.json({ error: "The fill run failed." }, { status: 500 });
  }
}

// Vercel Cron issues GET; POST is here for anything else driving it.
export const GET = handle;
export const POST = handle;

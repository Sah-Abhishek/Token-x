import { NextResponse } from "next/server";
import { getCurrentDbUser, isDatabaseUnreachable } from "@/app/lib/user";
import { getPortfolio } from "@/app/lib/portfolio";

/** The signed-in user's balance, positions and unrealised profit. */
export async function GET() {
  try {
    const user = await getCurrentDbUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to see your portfolio." }, { status: 401 });
    }

    const portfolio = await getPortfolio(user.id);

    return NextResponse.json(portfolio, {
      status: 200,
      // Account data is per-user and changes on every trade, so it is never
      // cached at the edge.
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
      return NextResponse.json({ error: "The database is unavailable." }, { status: 503 });
    }
    console.error("Portfolio lookup failed:", error);
    return NextResponse.json({ error: "Could not load your portfolio." }, { status: 500 });
  }
}

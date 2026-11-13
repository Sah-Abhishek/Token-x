import { NextResponse } from "next/server";
import { getCurrentDbUser, isDatabaseUnreachable } from "@/app/lib/user";
import { executeTrade, type TradeSide } from "@/app/lib/trade";

/** Place a simulated market order. */
export async function POST(req: Request) {
  let user;
  try {
    user = await getCurrentDbUser();
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
      return NextResponse.json(
        { error: "The database is unavailable, so orders cannot be recorded." },
        { status: 503 },
      );
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Sign in to place an order." }, { status: 401 });
  }

  let body: { coinId?: unknown; side?: unknown; amount?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const coinId = typeof body.coinId === "string" ? body.coinId.trim().toLowerCase() : "";
  const side = body.side === "BUY" || body.side === "SELL" ? (body.side as TradeSide) : null;

  if (!coinId || !side) {
    return NextResponse.json(
      { error: "A coinId and a side of BUY or SELL are required." },
      { status: 400 },
    );
  }

  try {
    const result = await executeTrade({
      userId: user.id,
      coinId,
      side,
      amount: body.amount,
    });

    if (!result.ok) {
      // These are the user's own input problems, not server faults.
      const status = result.code === "UNKNOWN_COIN" || result.code === "NO_PRICE" ? 422 : 400;
      return NextResponse.json({ error: result.message, code: result.code }, { status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
      return NextResponse.json(
        { error: "The database is unavailable, so the order was not placed." },
        { status: 503 },
      );
    }
    console.error("Trade failed:", error);
    return NextResponse.json({ error: "The order could not be placed." }, { status: 500 });
  }
}

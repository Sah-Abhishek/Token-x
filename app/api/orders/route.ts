import { NextResponse } from "next/server";
import { requireUser, readJson, databaseErrorResponse, PRIVATE_HEADERS } from "@/app/lib/api";
import { getOrders, placeLimitOrder, runFills, type OrderSide } from "@/app/lib/orders";

/**
 * The signed-in user's orders.
 *
 * Resting orders are re-priced before the list is returned. This app has no
 * always-on scheduler, so a read is the reliable moment to discover that the
 * market has reached a limit; the cron endpoint is a second path, not the
 * only one.
 */
export async function GET() {
  const auth = await requireUser("Sign in to see your orders.");
  if (!auth.ok) return auth.response;

  try {
    await runFills(auth.user.id);
    const orders = await getOrders(auth.user.id);
    return NextResponse.json({ orders }, { status: 200, headers: PRIVATE_HEADERS });
  } catch (error) {
    return databaseErrorResponse(error, "Your orders could not be loaded.");
  }
}

/** Rest a limit order. */
export async function POST(req: Request) {
  const auth = await requireUser("Sign in to place an order.");
  if (!auth.ok) return auth.response;

  const parsed = await readJson<{
    coinId?: unknown;
    side?: unknown;
    amount?: unknown;
    limitPrice?: unknown;
  }>(req);
  if (!parsed.ok) return parsed.response;

  const { body } = parsed;
  const coinId = typeof body.coinId === "string" ? body.coinId : "";
  const side = body.side === "BUY" || body.side === "SELL" ? (body.side as OrderSide) : null;

  if (!coinId || !side) {
    return NextResponse.json(
      { error: "A coinId and a side of BUY or SELL are required." },
      { status: 400 },
    );
  }

  try {
    const result = await placeLimitOrder({
      userId: auth.user.id,
      coinId,
      side,
      amount: body.amount,
      limitPrice: body.limitPrice,
    });

    if (!result.ok) {
      // Feed problems are not the caller's mistake, so they read as 422.
      const status = result.code === "UNKNOWN_COIN" || result.code === "NO_PRICE" ? 422 : 400;
      return NextResponse.json({ error: result.message, code: result.code }, { status });
    }

    return NextResponse.json(result, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) {
    return databaseErrorResponse(error, "The order could not be placed.");
  }
}

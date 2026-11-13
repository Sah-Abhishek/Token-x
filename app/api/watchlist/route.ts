import { NextResponse } from "next/server";
import { requireUser, readJson, databaseErrorResponse, PRIVATE_HEADERS } from "@/app/lib/api";
import { addToWatchlist, getWatchlist, removeFromWatchlist } from "@/app/lib/watchlist";

/** The signed-in user's watchlist, priced. */
export async function GET() {
  const auth = await requireUser("Sign in to see your watchlist.");
  if (!auth.ok) return auth.response;

  try {
    const coins = await getWatchlist(auth.user.id);
    return NextResponse.json({ coins }, { status: 200, headers: PRIVATE_HEADERS });
  } catch (error) {
    return databaseErrorResponse(error, "Your watchlist could not be loaded.");
  }
}

/** Follow a coin. Idempotent: following twice leaves one entry. */
export async function POST(req: Request) {
  const auth = await requireUser("Sign in to follow a coin.");
  if (!auth.ok) return auth.response;

  const parsed = await readJson<{ coinId?: unknown }>(req);
  if (!parsed.ok) return parsed.response;

  const coinId = typeof parsed.body.coinId === "string" ? parsed.body.coinId : "";
  if (!coinId) {
    return NextResponse.json({ error: "A coinId is required." }, { status: 400 });
  }

  try {
    const result = await addToWatchlist(auth.user.id, coinId);

    if (!result.ok) {
      const status = result.code === "LIST_FULL" ? 409 : 422;
      return NextResponse.json({ error: result.message, code: result.code }, { status });
    }

    return NextResponse.json(result, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) {
    return databaseErrorResponse(error, "The coin could not be added.");
  }
}

/** Stop following a coin. Idempotent: removing what is already gone is the
 *  outcome the caller asked for. */
export async function DELETE(req: Request) {
  const auth = await requireUser("Sign in to edit your watchlist.");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("coinId");

  let coinId = fromQuery ?? "";
  if (!coinId) {
    const parsed = await readJson<{ coinId?: unknown }>(req);
    if (parsed.ok && typeof parsed.body.coinId === "string") coinId = parsed.body.coinId;
  }

  if (!coinId) {
    return NextResponse.json({ error: "A coinId is required." }, { status: 400 });
  }

  try {
    const result = await removeFromWatchlist(auth.user.id, coinId);
    return NextResponse.json(result, { status: 200, headers: PRIVATE_HEADERS });
  } catch (error) {
    return databaseErrorResponse(error, "The coin could not be removed.");
  }
}

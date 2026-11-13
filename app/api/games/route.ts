import { NextResponse } from "next/server";
import { requireUser, readJson, databaseErrorResponse, PRIVATE_HEADERS } from "@/app/lib/api";
import {
  getBets,
  getGameStats,
  playCoinFlip,
  playDice,
  playPricePrediction,
  settleDuePredictions,
} from "@/app/lib/games";
import { prisma } from "@/app/lib/prisma";

/**
 * Bet history and the running totals.
 *
 * Predictions whose window has closed are settled before the history is
 * read, which is what makes a resting prediction resolve without a
 * scheduler.
 */
export async function GET() {
  const auth = await requireUser("Sign in to see your bets.");
  if (!auth.ok) return auth.response;

  try {
    await settleDuePredictions(auth.user.id);

    const [bets, stats, user] = await Promise.all([
      getBets(auth.user.id),
      getGameStats(auth.user.id),
      prisma.user.findUniqueOrThrow({
        where: { id: auth.user.id },
        select: { balanceUSD: true },
      }),
    ]);

    return NextResponse.json(
      { bets, stats, balanceUSD: user.balanceUSD.toNumber() },
      { status: 200, headers: PRIVATE_HEADERS },
    );
  } catch (error) {
    return databaseErrorResponse(error, "Your bets could not be loaded.");
  }
}

/** Play one round. The result is decided here, never in the browser. */
export async function POST(req: Request) {
  const auth = await requireUser("Sign in to play.");
  if (!auth.ok) return auth.response;

  const parsed = await readJson<{
    game?: unknown;
    stake?: unknown;
    choice?: unknown;
    target?: unknown;
    coinId?: unknown;
    seconds?: unknown;
  }>(req);
  if (!parsed.ok) return parsed.response;

  const { body } = parsed;
  const userId = auth.user.id;

  try {
    const result =
      body.game === "COIN_FLIP"
        ? await playCoinFlip({ userId, stake: body.stake, choice: body.choice })
        : body.game === "DICE"
          ? await playDice({ userId, stake: body.stake, target: body.target })
          : body.game === "PRICE_PREDICTION"
            ? await playPricePrediction({
                userId,
                stake: body.stake,
                coinId: body.coinId,
                choice: body.choice,
                seconds: body.seconds,
              })
            : null;

    if (!result) {
      return NextResponse.json(
        { error: "Pick one of the three games." },
        { status: 400 },
      );
    }

    if (!result.ok) {
      const status =
        result.code === "UNKNOWN_COIN" || result.code === "NO_PRICE"
          ? 422
          : result.code === "TOO_MANY_OPEN"
            ? 409
            : 400;
      return NextResponse.json({ error: result.message, code: result.code }, { status });
    }

    return NextResponse.json(result, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) {
    return databaseErrorResponse(error, "The round could not be played.");
  }
}

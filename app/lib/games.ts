import { randomInt } from "node:crypto";
import { Prisma } from "@/app/generated/prisma";
import { prisma } from "./prisma";
import { lookupCoin } from "./market";
import { parseMoney, toCents } from "./decimal";

export type GameName = "COIN_FLIP" | "DICE" | "PRICE_PREDICTION";
export type OutcomeName = "WIN" | "LOSE" | "PUSH";

export type GameFailure =
  | "INVALID_STAKE"
  | "STAKE_TOO_SMALL"
  | "STAKE_TOO_LARGE"
  | "INVALID_CHOICE"
  | "INVALID_TARGET"
  | "INVALID_DURATION"
  | "UNKNOWN_COIN"
  | "NO_PRICE"
  | "INSUFFICIENT_FUNDS"
  | "TOO_MANY_OPEN";

export type BetRow = {
  id: string;
  gameType: GameName;
  betAmount: number;
  outcome: OutcomeName | null;
  payout: number | null;
  choice: string | null;
  target: number | null;
  result: string | null;
  coinId: string | null;
  entryPrice: number | null;
  settlePrice: number | null;
  settleAt: string | null;
  settledAt: string | null;
  createdAt: string;
  /** Net change to the balance: payout minus stake. Null while unsettled. */
  net: number | null;
};

export type PlayResult =
  | { ok: true; bet: BetRow; balanceUSD: number }
  | { ok: false; code: GameFailure; message: string };

/* ---------------------------------------------------------------------------
 * House rules
 *
 * Every game pays at true odds less a flat 1%, and the number is stated in
 * the UI. A simulator that quietly paid worse than it showed would teach the
 * wrong lesson about the thing it is simulating.
 * ------------------------------------------------------------------------- */

export const HOUSE_EDGE = 0.01;

export const STAKE_MIN = 1;
export const STAKE_MAX = 1000;

/** The roll has to beat the target, so a target of 95 wins 5 times in 100. */
export const DICE_MIN_TARGET = 1;
export const DICE_MAX_TARGET = 95;

/** Even-money game: two outcomes, so true odds are 2x. */
export const COIN_MULTIPLIER = round2(2 * (1 - HOUSE_EDGE));

/** A prediction can also land exactly flat, which pushes. Treating a push as
 *  a third outcome is why this pays less than the coin. */
export const PREDICTION_MULTIPLIER = round2(2 * (1 - HOUSE_EDGE) * 0.96);

export const PREDICTION_DURATIONS = [60, 300, 900] as const;
export type PredictionDuration = (typeof PREDICTION_DURATIONS)[number];

/** At most this many predictions may be resting at once. Each one is
 *  re-priced whenever the page is read. */
const MAX_OPEN_PREDICTIONS = 10;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Payout per unit staked for a dice target, at true odds less the edge. */
export function diceMultiplier(target: number): number {
  const winningFaces = 100 - target;
  if (winningFaces <= 0) return 0;
  return round2((100 / winningFaces) * (1 - HOUSE_EDGE));
}

export function diceWinChance(target: number): number {
  return Math.max(0, Math.min(100, 100 - target));
}

/* ------------------------------------------------------------------------- */

function toRow(bet: {
  id: string;
  gameType: string;
  betAmount: Prisma.Decimal;
  outcome: string | null;
  payout: Prisma.Decimal | null;
  choice: string | null;
  target: Prisma.Decimal | null;
  result: string | null;
  coinId: string | null;
  entryPrice: Prisma.Decimal | null;
  settlePrice: Prisma.Decimal | null;
  settleAt: Date | null;
  settledAt: Date | null;
  createdAt: Date;
}): BetRow {
  const betAmount = bet.betAmount.toNumber();
  const payout = bet.payout?.toNumber() ?? null;

  return {
    id: bet.id,
    gameType: bet.gameType as GameName,
    betAmount,
    outcome: (bet.outcome as OutcomeName | null) ?? null,
    payout,
    choice: bet.choice,
    target: bet.target?.toNumber() ?? null,
    result: bet.result,
    coinId: bet.coinId,
    entryPrice: bet.entryPrice?.toNumber() ?? null,
    settlePrice: bet.settlePrice?.toNumber() ?? null,
    settleAt: bet.settleAt?.toISOString() ?? null,
    settledAt: bet.settledAt?.toISOString() ?? null,
    createdAt: bet.createdAt.toISOString(),
    net: payout === null ? null : round2(payout - betAmount),
  };
}

function validateStake(raw: unknown): Prisma.Decimal | GameFailure {
  const stake = parseMoney(raw);
  if (!stake) return "INVALID_STAKE";
  if (stake.lt(STAKE_MIN)) return "STAKE_TOO_SMALL";
  if (stake.gt(STAKE_MAX)) return "STAKE_TOO_LARGE";
  return stake;
}

function stakeMessage(code: GameFailure): string {
  if (code === "STAKE_TOO_SMALL") return `The smallest stake is $${STAKE_MIN}.`;
  if (code === "STAKE_TOO_LARGE") return `The largest stake is $${STAKE_MAX}.`;
  return "Enter a stake in dollars and cents.";
}

/* ---------------------------------------------------------------------------
 * Instant games
 * ------------------------------------------------------------------------- */

/**
 * Settle a coin flip or a dice roll in one transaction.
 *
 * The roll happens on the server, after the stake has been debited, and is
 * never read from the request. A client-supplied roll would let anyone pick
 * their own result.
 */
async function playInstant(params: {
  userId: number;
  gameType: "COIN_FLIP" | "DICE";
  stake: Prisma.Decimal;
  choice: string;
  target: Prisma.Decimal | null;
  roll: () => { won: boolean; result: string; multiplier: number };
}): Promise<PlayResult> {
  const { userId, gameType, stake, choice, target } = params;

  return prisma.$transaction(async (tx): Promise<PlayResult> => {
    // The balance condition is in the WHERE clause, so checking and debiting
    // are one atomic statement and two tabs cannot both spend the same money.
    const debited = await tx.user.updateMany({
      where: { id: userId, balanceUSD: { gte: stake } },
      data: { balanceUSD: { decrement: stake } },
    });

    if (debited.count === 0) {
      return {
        ok: false,
        code: "INSUFFICIENT_FUNDS",
        message: "That stake is more than your balance.",
      };
    }

    const { won, result, multiplier } = params.roll();
    const payout = won ? toCents(stake.mul(multiplier)) : new Prisma.Decimal(0);

    if (payout.gt(0)) {
      await tx.user.update({
        where: { id: userId },
        data: { balanceUSD: { increment: payout } },
      });
    }

    const bet = await tx.bet.create({
      data: {
        userId,
        gameType,
        betAmount: stake,
        outcome: won ? "WIN" : "LOSE",
        payout,
        choice,
        target,
        result,
        settledAt: new Date(),
      },
    });

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { balanceUSD: true },
    });

    return { ok: true, bet: toRow(bet), balanceUSD: user.balanceUSD.toNumber() };
  });
}

export async function playCoinFlip(params: {
  userId: number;
  stake: unknown;
  choice: unknown;
}): Promise<PlayResult> {
  const stake = validateStake(params.stake);
  if (typeof stake === "string") {
    return { ok: false, code: stake, message: stakeMessage(stake) };
  }

  const choice = String(params.choice ?? "").toUpperCase();
  if (choice !== "HEADS" && choice !== "TAILS") {
    return { ok: false, code: "INVALID_CHOICE", message: "Pick heads or tails." };
  }

  return playInstant({
    userId: params.userId,
    gameType: "COIN_FLIP",
    stake,
    choice,
    target: null,
    roll: () => {
      // randomInt, not Math.random: this decides who gets paid.
      const landed = randomInt(0, 2) === 0 ? "HEADS" : "TAILS";
      return { won: landed === choice, result: landed, multiplier: COIN_MULTIPLIER };
    },
  });
}

export async function playDice(params: {
  userId: number;
  stake: unknown;
  target: unknown;
}): Promise<PlayResult> {
  const stake = validateStake(params.stake);
  if (typeof stake === "string") {
    return { ok: false, code: stake, message: stakeMessage(stake) };
  }

  const target = Number(params.target);
  if (
    !Number.isInteger(target) ||
    target < DICE_MIN_TARGET ||
    target > DICE_MAX_TARGET
  ) {
    return {
      ok: false,
      code: "INVALID_TARGET",
      message: `Pick a number to beat between ${DICE_MIN_TARGET} and ${DICE_MAX_TARGET}.`,
    };
  }

  const multiplier = diceMultiplier(target);

  return playInstant({
    userId: params.userId,
    gameType: "DICE",
    stake,
    choice: "OVER",
    target: new Prisma.Decimal(target),
    roll: () => {
      const rolled = randomInt(1, 101);
      return { won: rolled > target, result: String(rolled), multiplier };
    },
  });
}

/* ---------------------------------------------------------------------------
 * Price prediction
 * ------------------------------------------------------------------------- */

/**
 * Stake on which way a coin moves over a fixed window.
 *
 * The entry price is recorded here and the bet rests until `settleAt`. It is
 * settled against a price read at that point, not against anything the
 * browser reports.
 */
export async function playPricePrediction(params: {
  userId: number;
  stake: unknown;
  coinId: unknown;
  choice: unknown;
  seconds: unknown;
}): Promise<PlayResult> {
  const stake = validateStake(params.stake);
  if (typeof stake === "string") {
    return { ok: false, code: stake, message: stakeMessage(stake) };
  }

  const choice = String(params.choice ?? "").toUpperCase();
  if (choice !== "UP" && choice !== "DOWN") {
    return { ok: false, code: "INVALID_CHOICE", message: "Pick up or down." };
  }

  const seconds = Number(params.seconds);
  if (!PREDICTION_DURATIONS.includes(seconds as PredictionDuration)) {
    return {
      ok: false,
      code: "INVALID_DURATION",
      message: "Pick one of the offered windows.",
    };
  }

  const coinId = String(params.coinId ?? "").trim().toLowerCase();
  const lookup = await lookupCoin(coinId);

  if (lookup.status === "not_found") {
    return { ok: false, code: "UNKNOWN_COIN", message: "That coin is not listed." };
  }
  if (lookup.status === "unavailable" || lookup.coin.price <= 0) {
    return {
      ok: false,
      code: "NO_PRICE",
      message: "The price feed is not responding, so there is no entry price. Try again shortly.",
    };
  }

  const coin = lookup.coin;
  const settleAt = new Date(Date.now() + seconds * 1000);

  return prisma.$transaction(async (tx): Promise<PlayResult> => {
    const open = await tx.bet.count({
      where: { userId: params.userId, gameType: "PRICE_PREDICTION", outcome: null },
    });

    if (open >= MAX_OPEN_PREDICTIONS) {
      return {
        ok: false,
        code: "TOO_MANY_OPEN",
        message: `You already have ${MAX_OPEN_PREDICTIONS} predictions running.`,
      };
    }

    const debited = await tx.user.updateMany({
      where: { id: params.userId, balanceUSD: { gte: stake } },
      data: { balanceUSD: { decrement: stake } },
    });

    if (debited.count === 0) {
      return {
        ok: false,
        code: "INSUFFICIENT_FUNDS",
        message: "That stake is more than your balance.",
      };
    }

    const bet = await tx.bet.create({
      data: {
        userId: params.userId,
        gameType: "PRICE_PREDICTION",
        betAmount: stake,
        choice,
        coinId,
        entryPrice: new Prisma.Decimal(coin.price),
        settleAt,
      },
    });

    const user = await tx.user.findUniqueOrThrow({
      where: { id: params.userId },
      select: { balanceUSD: true },
    });

    return { ok: true, bet: toRow(bet), balanceUSD: user.balanceUSD.toNumber() };
  });
}

/**
 * Settle every prediction whose window has closed.
 *
 * Idempotent by construction: the write that records the outcome is guarded
 * on the bet still being unsettled, so a second call — or two tabs loading at
 * once — cannot pay the same bet twice.
 */
export async function settleDuePredictions(userId: number): Promise<number> {
  const due = await prisma.bet.findMany({
    where: {
      userId,
      gameType: "PRICE_PREDICTION",
      outcome: null,
      settleAt: { lte: new Date() },
    },
    take: MAX_OPEN_PREDICTIONS,
  });

  if (due.length === 0) return 0;

  // One lookup per distinct coin, not per bet.
  const coinIds = [...new Set(due.map((bet) => bet.coinId).filter((id): id is string => !!id))];
  const prices = new Map<string, number>();

  await Promise.all(
    coinIds.map(async (id) => {
      const lookup = await lookupCoin(id);
      if (lookup.status === "ok" && lookup.coin.price > 0) prices.set(id, lookup.coin.price);
    }),
  );

  let settled = 0;

  for (const bet of due) {
    const price = bet.coinId ? prices.get(bet.coinId) : undefined;
    // No price means no honest settlement. The bet stays open and is tried
    // again on the next read.
    if (price === undefined) continue;

    const entry = bet.entryPrice?.toNumber() ?? 0;
    if (entry <= 0) continue;

    const outcome: OutcomeName =
      price === entry ? "PUSH" : (price > entry) === (bet.choice === "UP") ? "WIN" : "LOSE";

    const payout =
      outcome === "WIN"
        ? toCents(bet.betAmount.mul(PREDICTION_MULTIPLIER))
        : outcome === "PUSH"
          ? bet.betAmount
          : new Prisma.Decimal(0);

    const done = await prisma.$transaction(async (tx) => {
      const claimed = await tx.bet.updateMany({
        where: { id: bet.id, outcome: null },
        data: {
          outcome,
          payout,
          settlePrice: new Prisma.Decimal(price),
          settledAt: new Date(),
          result: `${price > entry ? "UP" : price < entry ? "DOWN" : "FLAT"}`,
        },
      });

      // Already settled by a concurrent read; do not pay it again.
      if (claimed.count === 0) return false;

      if (payout.gt(0)) {
        await tx.user.update({
          where: { id: userId },
          data: { balanceUSD: { increment: payout } },
        });
      }

      return true;
    });

    if (done) settled += 1;
  }

  return settled;
}

/* ---------------------------------------------------------------------------
 * Reading
 * ------------------------------------------------------------------------- */

export async function getBets(userId: number, take = 25): Promise<BetRow[]> {
  const bets = await prisma.bet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return bets.map(toRow);
}

export type GameStats = {
  played: number;
  won: number;
  lost: number;
  open: number;
  wagered: number;
  returned: number;
  net: number;
};

export async function getGameStats(userId: number): Promise<GameStats> {
  const [grouped, totals] = await Promise.all([
    prisma.bet.groupBy({
      by: ["outcome"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.bet.aggregate({
      where: { userId },
      _sum: { betAmount: true, payout: true },
    }),
  ]);

  const count = (outcome: string | null) =>
    grouped.find((row) => row.outcome === outcome)?._count._all ?? 0;

  const wagered = totals._sum.betAmount?.toNumber() ?? 0;
  const returned = totals._sum.payout?.toNumber() ?? 0;
  const open = count(null);

  return {
    played: grouped.reduce((sum, row) => sum + row._count._all, 0),
    won: count("WIN"),
    lost: count("LOSE"),
    open,
    wagered,
    returned,
    // Stakes on open bets are already out of the balance but have not
    // returned anything yet, so net is only meaningful once settled.
    net: round2(returned - wagered),
  };
}

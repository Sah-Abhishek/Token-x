import { Prisma } from "@/app/generated/prisma";
import { prisma } from "./prisma";
import { lookupCoin } from "./market";
import { parseQuantity, toCents, MAX_DECIMALS } from "./decimal";

export type TradeSide = "BUY" | "SELL";

export type TradeFailure =
  | "INVALID_AMOUNT"
  | "UNKNOWN_COIN"
  | "NO_PRICE"
  | "INSUFFICIENT_FUNDS"
  | "INSUFFICIENT_HOLDING";

export type TradeResult =
  | {
      ok: true;
      side: TradeSide;
      symbol: string;
      amount: string;
      pricePerToken: string;
      total: string;
      balanceUSD: string;
      holdingAmount: string;
    }
  | { ok: false; code: TradeFailure; message: string };

/**
 * Execute a simulated market order.
 *
 * The price is looked up here, on the server, and never taken from the
 * request: a client-supplied price would let anyone buy at a price of their
 * choosing. Balance and holding changes are guarded updates inside one
 * transaction, so two orders submitted at the same moment cannot both pass a
 * check that only one of them can afford.
 */
export async function executeTrade(params: {
  userId: number;
  coinId: string;
  side: TradeSide;
  amount: unknown;
}): Promise<TradeResult> {
  const { userId, coinId, side } = params;

  const amount = parseQuantity(params.amount);
  if (!amount) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      message: `Enter an amount greater than zero, with at most ${MAX_DECIMALS} decimal places.`,
    };
  }

  const lookup = await lookupCoin(coinId);

  if (lookup.status === "not_found") {
    return { ok: false, code: "UNKNOWN_COIN", message: "That coin is not listed." };
  }

  if (lookup.status === "unavailable") {
    return {
      ok: false,
      code: "NO_PRICE",
      message: "The price feed is not responding. Your order was not placed; try again shortly.",
    };
  }

  const coin = lookup.coin;

  if (!Number.isFinite(coin.price) || coin.price <= 0) {
    return {
      ok: false,
      code: "NO_PRICE",
      message: "No price is available for that coin right now. Try again shortly.",
    };
  }

  const symbol = coin.symbol.toUpperCase();
  const price = new Prisma.Decimal(coin.price);
  // Round the cash leg to cents; fractional cents cannot be represented in a
  // balance a person reads as money.
  const total = toCents(amount.mul(price));

  // Rounding the cash leg to cents means a small enough order costs $0.00.
  // Without this guard, repeatedly buying a dust amount of a cheap coin would
  // mint tokens for free.
  if (total.lte(0)) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      message: "That order is too small to be worth anything. Increase the amount.",
    };
  }

  return prisma.$transaction(async (tx): Promise<TradeResult> => {
    if (side === "BUY") {
      // The balance condition lives in the WHERE clause, so the check and the
      // decrement are a single atomic statement.
      const debited = await tx.user.updateMany({
        where: { id: userId, balanceUSD: { gte: total } },
        data: { balanceUSD: { decrement: total } },
      });

      if (debited.count === 0) {
        return {
          ok: false,
          code: "INSUFFICIENT_FUNDS",
          message: "That order costs more than your available balance.",
        };
      }

      await tx.holding.upsert({
        where: { userId_symbol: { userId, symbol } },
        create: { userId, symbol, amount },
        update: { amount: { increment: amount } },
      });
    } else {
      const debited = await tx.holding.updateMany({
        where: { userId, symbol, amount: { gte: amount } },
        data: { amount: { decrement: amount } },
      });

      if (debited.count === 0) {
        return {
          ok: false,
          code: "INSUFFICIENT_HOLDING",
          message: `You do not hold that much ${symbol}.`,
        };
      }

      await tx.user.update({
        where: { id: userId },
        data: { balanceUSD: { increment: total } },
      });
    }

    await tx.trade.create({
      data: { userId, symbol, amount, pricePerToken: price, total, type: side },
    });

    const [user, holding] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: userId }, select: { balanceUSD: true } }),
      tx.holding.findUnique({
        where: { userId_symbol: { userId, symbol } },
        select: { amount: true },
      }),
    ]);

    return {
      ok: true,
      side,
      symbol,
      amount: amount.toString(),
      pricePerToken: price.toString(),
      total: total.toString(),
      balanceUSD: user.balanceUSD.toString(),
      holdingAmount: (holding?.amount ?? new Prisma.Decimal(0)).toString(),
    };
  });
}

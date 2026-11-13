import { Prisma } from "@/app/generated/prisma";
import { prisma } from "./prisma";
import { lookupCoin, getMarkets } from "./market";
import { parseQuantity, parsePrice, toCents, toCentsUp, MAX_DECIMALS } from "./decimal";

export type OrderSide = "BUY" | "SELL";
export type OrderStatusName = "OPEN" | "FILLED" | "CANCELLED";

export type PlaceOrderFailure =
  | "INVALID_AMOUNT"
  | "INVALID_PRICE"
  | "UNKNOWN_COIN"
  | "NO_PRICE"
  | "INSUFFICIENT_FUNDS"
  | "INSUFFICIENT_HOLDING"
  | "TOO_MANY_ORDERS";

export type OrderRow = {
  id: string;
  coinId: string;
  symbol: string;
  side: OrderSide;
  amount: number;
  limitPrice: number;
  status: OrderStatusName;
  reservedUSD: number;
  fillPrice: number | null;
  fillTotal: number | null;
  createdAt: string;
  filledAt: string | null;
  cancelledAt: string | null;
  /** Live price when one is available, so an open order can show its distance
   *  from filling. */
  marketPrice: number | null;
};

export type PlaceOrderResult =
  | { ok: true; order: OrderRow; filledImmediately: boolean }
  | { ok: false; code: PlaceOrderFailure; message: string };

/** One account cannot rest an unbounded number of orders: every open order is
 *  re-priced on every fill run. */
const MAX_OPEN_ORDERS = 25;

/** A fill run only re-prices this many orders, oldest first, so one run has a
 *  bounded cost no matter how many accounts exist. */
const FILL_BATCH = 500;

/** Coins outside the cached top-250 need their own lookup. Capped so a run
 *  cannot turn into hundreds of upstream calls. */
const MAX_EXTRA_LOOKUPS = 8;

/**
 * The smallest order the books can represent.
 *
 * Cash rounds to cents. An order worth less than one would cost $0.00 to buy
 * and pay $0.00 to sell, which on the buy side means tokens for free: place
 * enough of them and the holding grows out of nothing. A real exchange calls
 * this a minimum notional; here it is the point below which the arithmetic
 * stops being arithmetic.
 */
const MIN_NOTIONAL = new Prisma.Decimal("0.01");

function toRow(
  order: {
    id: string;
    coinId: string;
    symbol: string;
    side: string;
    amount: Prisma.Decimal;
    limitPrice: Prisma.Decimal;
    status: string;
    reservedUSD: Prisma.Decimal;
    fillPrice: Prisma.Decimal | null;
    fillTotal: Prisma.Decimal | null;
    createdAt: Date;
    filledAt: Date | null;
    cancelledAt: Date | null;
  },
  marketPrice: number | null = null,
): OrderRow {
  return {
    id: order.id,
    coinId: order.coinId,
    symbol: order.symbol,
    side: order.side as OrderSide,
    amount: order.amount.toNumber(),
    limitPrice: order.limitPrice.toNumber(),
    status: order.status as OrderStatusName,
    reservedUSD: order.reservedUSD.toNumber(),
    fillPrice: order.fillPrice?.toNumber() ?? null,
    fillTotal: order.fillTotal?.toNumber() ?? null,
    createdAt: order.createdAt.toISOString(),
    filledAt: order.filledAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    marketPrice,
  };
}

/** A resting order's condition: a buy wants the price at or below its limit,
 *  a sell at or above. This is the only place that rule is written. */
export function isFillable(side: OrderSide, limitPrice: number, marketPrice: number): boolean {
  if (!Number.isFinite(marketPrice) || marketPrice <= 0) return false;
  return side === "BUY" ? marketPrice <= limitPrice : marketPrice >= limitPrice;
}

/* ---------------------------------------------------------------------------
 * Placing
 * ------------------------------------------------------------------------- */

/**
 * Rest a limit order.
 *
 * Funds are committed at placement, not at fill: a buy moves cash out of the
 * balance into `reservedUSD`, and a sell moves tokens out of the holding.
 * Without that, ten resting buys could each pass an affordability check that
 * only one of them could actually pay for.
 *
 * An order whose limit the market already satisfies is filled straight away,
 * which is what an exchange does with a marketable limit order, rather than
 * resting visibly unfilled next to a price that has already passed it.
 */
export async function placeLimitOrder(params: {
  userId: number;
  coinId: string;
  side: OrderSide;
  amount: unknown;
  limitPrice: unknown;
}): Promise<PlaceOrderResult> {
  const { userId, side } = params;
  const coinId = params.coinId.trim().toLowerCase();

  const amount = parseQuantity(params.amount);
  if (!amount) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      message: `Enter an amount greater than zero, with at most ${MAX_DECIMALS} decimal places.`,
    };
  }

  const limitPrice = parsePrice(params.limitPrice);
  if (!limitPrice) {
    return {
      ok: false,
      code: "INVALID_PRICE",
      message: "Enter a limit price greater than zero.",
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
  const symbol = coin.symbol.toUpperCase();

  const notional = amount.mul(limitPrice);

  if (notional.lt(MIN_NOTIONAL)) {
    return {
      ok: false,
      code: "INVALID_AMOUNT",
      message: "That order is worth less than a cent. Increase the amount.",
    };
  }

  // Reserve at the limit, which is the worst price this order can fill at.
  // Rounding up means the reservation is never a hundredth of a cent short.
  const reserve = toCentsUp(notional);

  const placed = await prisma.$transaction(async (tx): Promise<PlaceOrderResult> => {
    const open = await tx.limitOrder.count({ where: { userId, status: "OPEN" } });
    if (open >= MAX_OPEN_ORDERS) {
      return {
        ok: false,
        code: "TOO_MANY_ORDERS",
        message: `You already have ${MAX_OPEN_ORDERS} orders resting. Cancel one first.`,
      };
    }

    if (side === "BUY") {
      // The balance condition sits in the WHERE clause, so the check and the
      // debit are one atomic statement.
      const debited = await tx.user.updateMany({
        where: { id: userId, balanceUSD: { gte: reserve } },
        data: { balanceUSD: { decrement: reserve } },
      });

      if (debited.count === 0) {
        return {
          ok: false,
          code: "INSUFFICIENT_FUNDS",
          message: "That order would cost more than your available balance.",
        };
      }
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
    }

    const order = await tx.limitOrder.create({
      data: {
        userId,
        coinId,
        symbol,
        side,
        amount,
        limitPrice,
        reservedUSD: side === "BUY" ? reserve : new Prisma.Decimal(0),
      },
    });

    return { ok: true, order: toRow(order, coin.price), filledImmediately: false };
  });

  if (!placed.ok) return placed;

  // Already through its limit: fill now rather than resting behind a price
  // the market has passed.
  if (isFillable(side, limitPrice.toNumber(), coin.price)) {
    const filled = await fillOrder(placed.order.id, coin.price);
    if (filled) return { ok: true, order: filled, filledImmediately: true };
  }

  return placed;
}

/* ---------------------------------------------------------------------------
 * Filling
 * ------------------------------------------------------------------------- */

/**
 * Fill one resting order at `marketPrice`.
 *
 * The status change is a guarded `updateMany`, so an order that a concurrent
 * cancel or a second fill run has already claimed is skipped rather than paid
 * out twice. Returns null when the order was not ours to fill.
 */
export async function fillOrder(orderId: string, marketPrice: number): Promise<OrderRow | null> {
  if (!Number.isFinite(marketPrice) || marketPrice <= 0) return null;

  const price = new Prisma.Decimal(marketPrice);

  return prisma.$transaction(async (tx): Promise<OrderRow | null> => {
    const order = await tx.limitOrder.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "OPEN") return null;

    const side = order.side as OrderSide;
    if (!isFillable(side, order.limitPrice.toNumber(), marketPrice)) return null;

    // A buy never pays more than its limit even if the feed moved between the
    // check above and this line; a sell never receives less.
    const fillPrice =
      side === "BUY"
        ? Prisma.Decimal.min(price, order.limitPrice)
        : Prisma.Decimal.max(price, order.limitPrice);

    // A buy can fill far below its limit, so its total can still round to
    // nothing even though the order cleared the minimum at placement. One
    // cent is the floor; it is always covered, because the reservation was
    // rounded up from a notional of at least that much. A sell needs no
    // floor: it fills at or above its limit, so its total can only be larger
    // than the notional that was already checked.
    const raw = toCents(order.amount.mul(fillPrice));
    const total = side === "BUY" ? Prisma.Decimal.max(raw, MIN_NOTIONAL) : raw;

    const claimed = await tx.limitOrder.updateMany({
      where: { id: orderId, status: "OPEN" },
      data: {
        status: "FILLED",
        fillPrice,
        fillTotal: total,
        filledAt: new Date(),
      },
    });

    // Someone else got there first.
    if (claimed.count === 0) return null;

    if (side === "BUY") {
      // The reservation was taken at the limit. Filling below it leaves
      // change, which goes back to the balance.
      const refund = order.reservedUSD.minus(total);
      if (refund.gt(0)) {
        await tx.user.update({
          where: { id: order.userId },
          data: { balanceUSD: { increment: refund } },
        });
      }

      await tx.holding.upsert({
        where: { userId_symbol: { userId: order.userId, symbol: order.symbol } },
        create: { userId: order.userId, symbol: order.symbol, amount: order.amount },
        update: { amount: { increment: order.amount } },
      });
    } else {
      // The tokens left the holding when the order was placed, so the fill
      // only has to pay the cash in.
      await tx.user.update({
        where: { id: order.userId },
        data: { balanceUSD: { increment: total } },
      });
    }

    const trade = await tx.trade.create({
      data: {
        userId: order.userId,
        symbol: order.symbol,
        amount: order.amount,
        pricePerToken: fillPrice,
        total,
        type: side,
      },
    });

    const updated = await tx.limitOrder.update({
      where: { id: orderId },
      data: { tradeId: trade.id },
    });

    return toRow(updated, marketPrice);
  });
}

/** Live price per CoinGecko id, for the coins a batch of orders names. */
async function priceByCoinId(coinIds: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  if (coinIds.length === 0) return prices;

  const markets = await getMarkets();
  for (const coin of markets) {
    if (coin.price > 0) prices.set(coin.id, coin.price);
  }

  // Anything outside the cached top 250 needs its own call. Bounded, because
  // a run that fans out across every long-tail coin would be rate-limited
  // into failing for everybody.
  const missing = coinIds.filter((id) => !prices.has(id)).slice(0, MAX_EXTRA_LOOKUPS);

  await Promise.all(
    missing.map(async (id) => {
      const lookup = await lookupCoin(id);
      if (lookup.status === "ok" && lookup.coin.price > 0) {
        prices.set(id, lookup.coin.price);
      }
    }),
  );

  return prices;
}

export type FillRunResult = {
  checked: number;
  filled: number;
  /** Orders whose coin had no price this run. They stay open. */
  unpriced: number;
};

/**
 * Re-price resting orders and fill the ones the market has reached.
 *
 * Scoped to one user when `userId` is given, which is how the dashboard keeps
 * orders current without a scheduler: the alternative is a resting order that
 * only moves when a cron happens to run.
 */
export async function runFills(userId?: number): Promise<FillRunResult> {
  const orders = await prisma.limitOrder.findMany({
    where: { status: "OPEN", ...(userId === undefined ? {} : { userId }) },
    orderBy: { createdAt: "asc" },
    take: FILL_BATCH,
    select: { id: true, coinId: true, side: true, limitPrice: true },
  });

  if (orders.length === 0) return { checked: 0, filled: 0, unpriced: 0 };

  const prices = await priceByCoinId([...new Set(orders.map((o) => o.coinId))]);

  let filled = 0;
  let unpriced = 0;

  for (const order of orders) {
    const price = prices.get(order.coinId);

    if (price === undefined) {
      unpriced += 1;
      continue;
    }

    if (!isFillable(order.side as OrderSide, order.limitPrice.toNumber(), price)) continue;

    // Sequential on purpose: these are writes against the same balance row,
    // and running them in parallel would just make Postgres serialise them
    // while holding more connections.
    const result = await fillOrder(order.id, price);
    if (result) filled += 1;
  }

  return { checked: orders.length, filled, unpriced };
}

/* ---------------------------------------------------------------------------
 * Cancelling and reading
 * ------------------------------------------------------------------------- */

export type CancelResult =
  | { ok: true; order: OrderRow }
  | { ok: false; code: "NOT_FOUND" | "NOT_OPEN"; message: string };

export async function cancelOrder(userId: number, orderId: string): Promise<CancelResult> {
  return prisma.$transaction(async (tx): Promise<CancelResult> => {
    const order = await tx.limitOrder.findFirst({ where: { id: orderId, userId } });

    if (!order) {
      return { ok: false, code: "NOT_FOUND", message: "That order does not exist." };
    }

    if (order.status !== "OPEN") {
      return {
        ok: false,
        code: "NOT_OPEN",
        message:
          order.status === "FILLED"
            ? "That order has already filled."
            : "That order was already cancelled.",
      };
    }

    // Guarded, so an order that fills between the read above and this write
    // is not also refunded.
    const claimed = await tx.limitOrder.updateMany({
      where: { id: orderId, status: "OPEN" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    if (claimed.count === 0) {
      return { ok: false, code: "NOT_OPEN", message: "That order has already filled." };
    }

    if (order.side === "BUY") {
      if (order.reservedUSD.gt(0)) {
        await tx.user.update({
          where: { id: userId },
          data: { balanceUSD: { increment: order.reservedUSD } },
        });
      }
    } else {
      await tx.holding.upsert({
        where: { userId_symbol: { userId, symbol: order.symbol } },
        create: { userId, symbol: order.symbol, amount: order.amount },
        update: { amount: { increment: order.amount } },
      });
    }

    const updated = await tx.limitOrder.findUniqueOrThrow({ where: { id: orderId } });
    return { ok: true, order: toRow(updated) };
  });
}

/** Open orders first, then the most recent history. */
export async function getOrders(userId: number, take = 40): Promise<OrderRow[]> {
  const orders = await prisma.limitOrder.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take,
  });

  const openCoinIds = [
    ...new Set(orders.filter((o) => o.status === "OPEN").map((o) => o.coinId)),
  ];
  const prices = await priceByCoinId(openCoinIds);

  return orders.map((order) => toRow(order, prices.get(order.coinId) ?? null));
}

export async function countOpenOrders(userId: number): Promise<number> {
  return prisma.limitOrder.count({ where: { userId, status: "OPEN" } });
}

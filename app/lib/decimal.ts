import { Prisma } from "@/app/generated/prisma";

/** Token quantities are stored at 8 decimal places; anything finer is dust
 *  that would round away and make the books disagree with the trade log. */
export const MAX_DECIMALS = 8;

/** Largest value any column here is expected to hold. Above this a Decimal
 *  stops being money and starts being an overflow. */
const CEILING = new Prisma.Decimal("1e20");

export const ZERO = new Prisma.Decimal(0);

/**
 * Parse a user-supplied quantity.
 *
 * Returns null rather than throwing, because every caller turns a bad value
 * into a message for the person who typed it rather than a 500.
 */
export function parseQuantity(raw: unknown): Prisma.Decimal | null {
  if (typeof raw !== "number" && typeof raw !== "string") return null;

  let value: Prisma.Decimal;
  try {
    value = new Prisma.Decimal(raw);
  } catch {
    return null;
  }

  if (!value.isFinite() || value.lte(0)) return null;
  if (value.decimalPlaces() > MAX_DECIMALS) return null;
  if (value.gte(CEILING)) return null;

  return value;
}

/** Parse a user-supplied USD figure: same rules, but only two decimals of a
 *  dollar exist. */
export function parseMoney(raw: unknown): Prisma.Decimal | null {
  const value = parseQuantity(raw);
  if (!value) return null;
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
}

/** Parse a price. Prices of sub-cent coins need more precision than money
 *  does, so this keeps the full 8 places. */
export function parsePrice(raw: unknown): Prisma.Decimal | null {
  return parseQuantity(raw);
}

/** Round a cash amount the way a balance a person reads must be rounded. */
export function toCents(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** Round a cash amount up. Used when reserving funds: reserving a hundredth
 *  of a cent too little would let an order fill without the money behind it. */
export function toCentsUp(value: Prisma.Decimal): Prisma.Decimal {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_UP);
}

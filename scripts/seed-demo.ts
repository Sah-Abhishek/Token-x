/**
 * Demo accounts for local development.
 *
 * A leaderboard with one row in it is impossible to judge, and so is a
 * dashboard with no trade history. This fills a local database with a handful
 * of accounts that have actually traded.
 *
 *   npx tsx scripts/seed-demo.ts          # create or top up the demo accounts
 *   npx tsx scripts/seed-demo.ts clear    # remove them and everything they own
 *
 * Every row it writes carries the `demo_` externalId prefix, which is what
 * `clear` matches on, so it can never touch a real Clerk-backed account.
 * Point DATABASE_URL at a development database before running it.
 */
import { PrismaClient, Prisma } from "../app/generated/prisma";

const prisma = new PrismaClient();
const PREFIX = "demo_";

type Seed = {
  handle: string;
  name: string;
  /** symbol -> units held, bought at the price below. */
  positions: { symbol: string; amount: string; price: string }[];
};

const SEEDS: Seed[] = [
  {
    handle: "ava_trades",
    name: "Ava Lindqvist",
    positions: [
      { symbol: "BTC", amount: "0.042", price: "61200" },
      { symbol: "ETH", amount: "0.6", price: "1740" },
    ],
  },
  {
    handle: "marcus_k",
    name: "Marcus Oyelaran",
    positions: [
      { symbol: "SOL", amount: "18", price: "74.10" },
      { symbol: "BTC", amount: "0.011", price: "70400" },
    ],
  },
  {
    handle: "quietcompounder",
    name: "Rin Takahashi",
    positions: [{ symbol: "BTC", amount: "0.0605", price: "66800" }],
  },
  {
    handle: "two_week_trader",
    name: "Dani Brennan",
    positions: [
      { symbol: "DOGE", amount: "21000", price: "0.0712" },
      { symbol: "XRP", amount: "900", price: "1.09" },
    ],
  },
  {
    handle: "slow_and_boring",
    name: "Priya Raman",
    positions: [{ symbol: "ETH", amount: "0.25", price: "1905" }],
  },
];

async function clear() {
  const users = await prisma.user.findMany({
    where: { externalId: { startsWith: PREFIX } },
    select: { id: true },
  });

  const ids = users.map((user) => user.id);
  if (ids.length === 0) {
    console.log("No demo accounts to remove.");
    return;
  }

  // Children first: nothing here cascades.
  await prisma.limitOrder.deleteMany({ where: { userId: { in: ids } } });
  await prisma.bet.deleteMany({ where: { userId: { in: ids } } });
  await prisma.watchlist.deleteMany({ where: { userId: { in: ids } } });
  await prisma.trade.deleteMany({ where: { userId: { in: ids } } });
  await prisma.holding.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });

  console.log(`Removed ${ids.length} demo accounts.`);
}

async function seed() {
  for (const entry of SEEDS) {
    const externalId = `${PREFIX}${entry.handle}`;

    const user = await prisma.user.upsert({
      where: { externalId },
      create: {
        externalId,
        email: `${entry.handle}@demo.invalid`,
        username: entry.handle,
        name: entry.name,
      },
      update: {},
    });

    // Rewrite the whole position each run so repeated seeding is idempotent
    // rather than compounding.
    await prisma.trade.deleteMany({ where: { userId: user.id } });
    await prisma.holding.deleteMany({ where: { userId: user.id } });

    let spent = new Prisma.Decimal(0);

    for (const position of entry.positions) {
      const amount = new Prisma.Decimal(position.amount);
      const price = new Prisma.Decimal(position.price);
      const total = amount.mul(price).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      spent = spent.plus(total);

      await prisma.holding.create({
        data: { userId: user.id, symbol: position.symbol, amount },
      });

      await prisma.trade.create({
        data: {
          userId: user.id,
          symbol: position.symbol,
          amount,
          pricePerToken: price,
          total,
          type: "BUY",
        },
      });
    }

    // The cash left is the starting balance less what the trades cost, so the
    // books agree with the trade log the dashboard replays.
    await prisma.user.update({
      where: { id: user.id },
      data: { balanceUSD: new Prisma.Decimal(5000).minus(spent) },
    });

    console.log(`${entry.handle}: ${entry.positions.length} positions, $${spent} spent`);
  }

  console.log(`\n${SEEDS.length} demo accounts ready.`);
}

async function main() {
  const command = process.argv[2];

  if (command === "clear") await clear();
  else if (!command) await seed();
  else {
    console.error(`Unknown command "${command}". Use no argument to seed, or "clear".`);
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

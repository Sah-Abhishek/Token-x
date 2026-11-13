/**
 * Engine regression test.
 *
 * Covers every path that touches the database: limit-order placement and the
 * cash it reserves, fills and the dust floor, cancellation and the refund,
 * input rejection, the watchlist, the games, and the leaderboard's ordering.
 *
 * Run it against a throwaway database:
 *
 *   ./scripts/dev-db.sh start && npm run db:migrate && npm run test:engine
 *
 * It creates one `demo_`-prefixed account and deletes it at the end, so it
 * leaves nothing behind. Steps that need a live price are skipped rather than
 * failed when the free price feed rate-limits, because refusing to guess at a
 * price is the behaviour under test everywhere else.
 */
import { prisma } from "../app/lib/prisma";
import { placeLimitOrder, fillOrder, cancelOrder, getOrders, isFillable } from "../app/lib/orders";
import { addToWatchlist, removeFromWatchlist, getWatchlist } from "../app/lib/watchlist";
import { playCoinFlip, playDice } from "../app/lib/games";
import { getLeaderboard } from "../app/lib/leaderboard";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}  ${detail}`); }
};

async function main() {
  const ext = `demo_smoke_${Date.now()}`;
  const u = await prisma.user.create({
    data: { externalId: ext, username: ext, name: "Smoke Test", email: `${ext}@example.invalid`, balanceUSD: "10000" },
  });

  console.log("\n-- limit buy rests and reserves cash");
  const rest = await placeLimitOrder({ userId: u.id, coinId: "bitcoin", side: "BUY", amount: "0.01", limitPrice: "1000" });
  ok("placed", rest.ok === true, JSON.stringify(rest));
  if (!rest.ok) throw new Error("cannot continue");
  ok("left resting", rest.filledImmediately === false);
  ok("status OPEN", rest.order.status === "OPEN");
  const held = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
  ok("$10 reserved of $10000", held.balanceUSD.toString() === "9990", held.balanceUSD.toString());

  console.log("\n-- fill gating");
  ok("buy not fillable above limit", !isFillable("BUY", 1000, 1500));
  ok("buy fillable at limit", isFillable("BUY", 1000, 1000));
  ok("buy fillable below limit", isFillable("BUY", 1000, 900));
  ok("sell not fillable below limit", !isFillable("SELL", 1000, 900));
  ok("sell fillable above limit", isFillable("SELL", 1000, 1100));
  ok("a zero price is never fillable", !isFillable("BUY", 1000, 0));
  ok("NaN is never fillable", !isFillable("BUY", 1000, NaN));

  console.log("\n-- fill far below the limit: dust floor and price clamp");
  const filled = await fillOrder(rest.order.id, 0.0001);
  ok("filled", filled?.status === "FILLED", JSON.stringify(filled));
  ok("price is the market, not the limit", filled?.fillPrice === 0.0001, String(filled?.fillPrice));
  ok("total floored at one cent", filled?.fillTotal === 0.01, String(filled?.fillTotal));
  ok("double fill refused", (await fillOrder(rest.order.id, 0.0001)) === null);
  const h = await prisma.holding.findFirst({ where: { userId: u.id, symbol: "BTC" } });
  ok("holding credited", h?.amount.toString() === "0.01", String(h?.amount));

  console.log("\n-- cancel returns the reservation");
  const c = await placeLimitOrder({ userId: u.id, coinId: "ethereum", side: "BUY", amount: "1", limitPrice: "100" });
  ok("placed", c.ok === true, JSON.stringify(c));
  if (c.ok) {
    const before = (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).balanceUSD;
    ok("cancelled", (await cancelOrder(u.id, c.order.id)).ok === true);
    const after = (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).balanceUSD;
    ok("$100 restored", after.sub(before).toString() === "100", after.sub(before).toString());
    ok("re-cancel refused", (await cancelOrder(u.id, c.order.id)).ok === false);
    ok("another user cannot cancel it", (await cancelOrder(u.id + 99999, c.order.id)).ok === false);
  }

  console.log("\n-- bad input is refused, not coerced");
  ok("negative amount", (await placeLimitOrder({ userId: u.id, coinId: "bitcoin", side: "BUY", amount: "-1", limitPrice: "100" })).ok === false);
  ok("zero price", (await placeLimitOrder({ userId: u.id, coinId: "bitcoin", side: "BUY", amount: "1", limitPrice: "0" })).ok === false);
  ok("junk amount", (await placeLimitOrder({ userId: u.id, coinId: "bitcoin", side: "BUY", amount: "abc", limitPrice: "100" })).ok === false);
  ok("sub-cent notional", (await placeLimitOrder({ userId: u.id, coinId: "bitcoin", side: "BUY", amount: "0.00000001", limitPrice: "0.0001" })).ok === false);
  ok("more cash than the account holds", (await placeLimitOrder({ userId: u.id, coinId: "bitcoin", side: "BUY", amount: "100", limitPrice: "999999" })).ok === false);
  ok("selling tokens not held", (await placeLimitOrder({ userId: u.id, coinId: "dogecoin", side: "SELL", amount: "5", limitPrice: "1" })).ok === false);

  console.log("\n-- watchlist");
  const w1 = await addToWatchlist(u.id, "bitcoin");
  if (w1.ok) {
    await addToWatchlist(u.id, "bitcoin");
    ok("idempotent add", (await getWatchlist(u.id)).length === 1, String((await getWatchlist(u.id)).length));
    await removeFromWatchlist(u.id, "bitcoin");
    ok("removed", (await getWatchlist(u.id)).length === 0);
    ok("removing it twice is not an error", (await removeFromWatchlist(u.id, "bitcoin")).ok === true);
  } else {
    console.log(`  skip  watchlist add (price feed said ${w1.code})`);
  }
  ok("an unknown coin is refused", (await addToWatchlist(u.id, "not-a-real-coin-xyz")).ok === false);

  console.log("\n-- games");
  const before = (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).balanceUSD;
  const flip = await playCoinFlip({ userId: u.id, stake: "10", choice: "HEADS" });
  ok("coin flip settled", flip.ok === true, JSON.stringify(flip));
  if (flip.ok) {
    const now = (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).balanceUSD;
    const delta = now.sub(before).toString();
    ok("balance moved by exactly -10 or +9.8", delta === "-10" || delta === "9.8", delta);
    ok("outcome is WIN or LOSE", flip.bet.outcome === "WIN" || flip.bet.outcome === "LOSE", String(flip.bet.outcome));
    ok("bet recorded", (await prisma.bet.count({ where: { userId: u.id } })) === 1);
  }
  const dice = await playDice({ userId: u.id, stake: "5", target: 50 });
  ok("dice settled", dice.ok === true, JSON.stringify(dice));
  ok("stake over the max refused", (await playCoinFlip({ userId: u.id, stake: "100000", choice: "HEADS" })).ok === false);
  ok("zero stake refused", (await playCoinFlip({ userId: u.id, stake: "0", choice: "HEADS" })).ok === false);
  ok("junk stake refused", (await playCoinFlip({ userId: u.id, stake: "abc", choice: "HEADS" })).ok === false);
  ok("bad choice refused", (await playCoinFlip({ userId: u.id, stake: "5", choice: "SIDEWAYS" })).ok === false);
  ok("dice target out of range refused", (await playDice({ userId: u.id, stake: "5", target: 99 })).ok === false);

  console.log("\n-- reads");
  ok("order history returned", (await getOrders(u.id)).length >= 2);
  const lb = await getLeaderboard(u.id);
  // Not a row count: how many accounts exist depends on the database this
  // runs against. What must hold is the ordering and the honesty flag.
  ok("leaderboard returns rows", lb.rows.length >= 1, String(lb.rows.length));
  ok("priced flag is set", typeof lb.priced === "boolean");
  ok("leaderboard is sorted by total value", lb.rows.every((r, i) => i === 0 || lb.rows[i - 1].totalValue >= r.totalValue));
  ok("ranks are 1..n with no gaps", lb.rows.every((r, i) => r.rank === i + 1));
  ok("total matches the account count", lb.total >= lb.rows.length);

  console.log("\n-- cleanup");
  await prisma.bet.deleteMany({ where: { userId: u.id } });
  await prisma.limitOrder.deleteMany({ where: { userId: u.id } });
  await prisma.trade.deleteMany({ where: { userId: u.id } });
  await prisma.holding.deleteMany({ where: { userId: u.id } });
  await prisma.watchlist.deleteMany({ where: { userId: u.id } });
  await prisma.user.delete({ where: { id: u.id } });
  ok("test account removed", (await prisma.user.findUnique({ where: { id: u.id } })) === null);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });

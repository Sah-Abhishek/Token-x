# TokenX

A crypto paper-trading simulator: real market prices, virtual money. Browse
the market, trade at live prices with market or limit orders, follow coins,
and see where you rank.

Next.js 15 App Router · React 19 · Tailwind 4 · Clerk · Prisma + Postgres ·
CoinGecko + Binance · `lightweight-charts` / Recharts

## Getting started

```bash
cp .env.example .env.local   # then fill in the values
npm install                  # postinstall runs `prisma generate`
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres (Neon). Use the **pooled** connection string in production. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `CLERK_SECRET_KEY` | Clerk backend key |
| `WEBHOOK_SECRET` | Clerk webhook signing secret (svix) |
| `CRON_SECRET` | Optional. Shared secret for the scheduled limit-order fill runner. Unset, `/api/orders/run` refuses. |

There is no `API_URL`. The app used to fetch its own API route over HTTP using
that variable; server components now call `app/lib/market.ts` directly.

### Database

```bash
npx prisma migrate dev     # local: create/apply a migration
npm run db:migrate         # deploy: apply pending migrations (migrate deploy)
npm run db:studio          # browse the data
```

### Testing the engine

```bash
./scripts/dev-db.sh start && npm run db:migrate
npm run test:engine
```

45 assertions over every path that touches the database: the cash a limit
order reserves, fills and the one-cent floor, cancellation refunds, rejected
input, the watchlist, the games, and the leaderboard's ordering. It creates a
single `demo_`-prefixed account and deletes it on the way out.

Steps that need a live price are skipped, not failed, when the free CoinGecko
tier rate-limits. That is deliberate: refusing to act without a price is the
behaviour under test everywhere else, so a 429 is not a regression.

## Deploying to Vercel

1. Import the repo in Vercel. Framework preset: Next.js. Build command and
   install command are the defaults — `npm run build` already runs
   `prisma generate` first, and `postinstall` covers the install step.
2. Add all four environment variables above under **Settings → Environment
   Variables**, for Production (and Preview, if you use it).
3. Apply migrations against the production database once, from your machine:
   ```bash
   DATABASE_URL="<production pooled url>" npm run db:migrate
   ```
   Keep this out of the build command so preview builds can't migrate the
   production database out from under you.
4. Deploy, then point Clerk at the deployment: **Clerk dashboard → Webhooks →
   Add endpoint**, URL `https://<your-domain>/api/webhooks/user`, subscribed to
   `user.created`, `user.updated` and `user.deleted`. Copy the signing secret
   into `WEBHOOK_SECRET` and redeploy.

### Vercel blocks deploys on vulnerable dependencies

A build can go green and the deployment still fail. The log ends:

```
Build Completed in /vercel/output [1m]
Deploying outputs...
Build cache cleared after a dependency security block. Redeploy to build with a clean cache.
Vulnerable version of Next.js detected, please update immediately.
status  ● Error
```

Nothing in the app is wrong when this happens — the gate runs after the build
and refuses to publish the output. The fix is to upgrade, not to retry:

```bash
npm install next@latest eslint-config-next@latest
npm audit                     # confirm no critical advisories remain
npm run build && npm run test:engine
```

Next.js ships security releases often, and the advisories that trip this gate
have included unauthenticated RCE in the image optimizer. Keeping `next` on
the current patch of its line is maintenance, not optional. The 15.x backport
line is published under the `backport` dist-tag:
`npm view next dist-tags`.

Notes that matter for the serverless runtime:

- `prisma/schema.prisma` sets `binaryTargets = ["native", "rhel-openssl-3.0.x"]`.
  Without the second target the client cannot start on Vercel's Amazon Linux.
- `app/generated/` is gitignored. It is platform-specific build output and is
  regenerated on every install and build.
- `eslint.config.mjs` ignores `app/generated/**`. Linting the generated client
  produced thousands of errors and failed `next build` outright.
- Use the pooled Neon connection string. Serverless functions open a
  connection per instance and exhaust a direct connection limit quickly.

## Architecture

```
app/
  lib/market.ts     all upstream market data; every fetch sets next.revalidate
  lib/format.ts     the only place numbers become strings
  lib/prisma.ts     singleton client
  api/cryptos       top 250 by market cap
  api/ticker        BTC/ETH headline ticker
  api/coin/[id]     one coin
  api/webhooks/user Clerk -> Postgres sync
  lib/trade.ts      market orders
  lib/orders.ts     limit orders: reserve, rest, fill, cancel
  lib/portfolio.ts  valuation and cost basis
  lib/games.ts      coin flip, dice, price prediction
  lib/leaderboard.ts  ranking by live equity
  lib/watchlist.ts  followed coins
  lib/api.ts        the auth / 503 / JSON boilerplate every account route shares
  api/portfolio     holdings valued at live prices
  api/trade         market order execution
  api/orders        list, place, cancel; /run is the scheduled filler
  api/watchlist     follow and unfollow
  api/games         play a round, read history
  market/           market list and coin detail
  dashboard/        balance, positions, P&L, orders, trades, watchlist
  leaderboard/      every account ranked by equity
  watchlist/        followed coins, priced
  games/            the three side games
  how-it-works/     what is and is not simulated
  components/       UI
  components/landing/  the landing page's own pieces
  components/games/    the three game panels
```

## How orders fill

A market order fills immediately at a price the server looks up; the browser
never sends one.

A limit order reserves what it needs at placement. A buy moves cash out of the
balance into `LimitOrder.reservedUSD`; a sell moves tokens out of the holding.
Cancelling returns it in full, and filling below the limit returns the
difference. Without that reservation, ten resting buys could each pass an
affordability check only one of them could pay for.

Resting orders are re-priced:

- whenever that user reads `/api/orders` or opens `/dashboard`, which is what
  makes fills work with no scheduler at all, and
- by `GET /api/orders/run` for everyone, when `CRON_SECRET` is set.

**The cron schedule in `vercel.json` is `0 3 * * *`, once a day, because
that is the most the Hobby plan allows.** A more frequent expression is not
downgraded, it fails the deployment outright:

> Hobby accounts are limited to daily cron jobs. This cron expression
> (`*/5 * * * *`) would run more than once per day.

On Pro, change it to `*/5 * * * *` and nothing else needs to move. A daily
sweep is not much use on its own, which is the point of the read path above:
an order fills the moment its owner looks at it, and the schedule only exists
for accounts nobody has opened in a while.

Every balance and holding change is a guarded `updateMany` with the condition
in the `WHERE` clause, so the check and the write are one statement and two
requests cannot both spend the same money.

There is a minimum notional of one cent, and a limit buy is never charged less
than that even when it fills far below its limit. Cash rounds to cents, so
without it an order could cost `$0.00` and still deliver tokens.

Upstream calls are cached server-side (`next.revalidate` plus `Cache-Control`),
so concurrent visitors collapse into at most one CoinGecko or Binance request
per window. Nothing calls those APIs from the browser except the charts.

See [DESIGN.md](./DESIGN.md) for the design system — colour tokens, number
formatting, motion, and the rules for unbuilt UI.

## Local Postgres

`scripts/dev-db.sh` runs a private cluster under
`~/.local/share/tokenx-postgres` on port 55432. It needs no sudo and does not
touch a system-wide Postgres install.

```bash
./scripts/dev-db.sh start      # start the cluster
./scripts/dev-db.sh status     # is it up
./scripts/dev-db.sh psql       # open a shell against tokenx
./scripts/dev-db.sh stop
```

Point `DATABASE_URL` at it and apply the migrations:

```
DATABASE_URL="postgresql://<user>@127.0.0.1:55432/tokenx"
npx prisma migrate deploy
```

A leaderboard with one row in it is impossible to judge, so there are demo
accounts for local development:

```bash
npx tsx scripts/seed-demo.ts          # five accounts that have actually traded
npx tsx scripts/seed-demo.ts clear    # remove them
```

Every row it writes carries a `demo_` externalId prefix, which is what `clear`
matches on, so it cannot touch a real Clerk-backed account. Do not run it
against production.

## What it does not simulate

Listed rather than quietly omitted, because a simulator that feels realistic
while leaving these out teaches the wrong lesson:

- Spreads, slippage and order book depth. A fill uses one mid price.
- Fees and funding, which a real exchange charges on both sides.
- Partial fills. An order fills whole or not at all.
- Leverage, margin, liquidation, and anything that can take an account below
  zero.

`/how-it-works` says the same thing in the product. Destinations that do not
exist render as plain muted labels, never as links to the 404 page.

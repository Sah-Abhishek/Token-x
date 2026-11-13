# TokenX design system

Monochrome and data-first. Ink carries every primary action; hue is reserved
exclusively for market signal, so green and red always mean "up" and "down"
and never mean "button".

Tokens live in `app/globals.css` under `@theme`, which makes each one a real
Tailwind utility (`bg-surface`, `text-ink-muted`, `border-line`, `text-up`).
Use the token, not the raw grey — `bg-gray-50` and `text-gray-500` scattered
across components is what let the UI drift in the first place.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `surface` | `#ffffff` | Cards, panels, table rows |
| `surface-sunken` | `#f9fafb` | Page background behind cards |
| `surface-raised` | `#f3f4f6` | Hover, secondary buttons, read-only fields |
| `ink` | `#111827` | Headings, primary buttons |
| `ink-body` | `#374151` | Body copy |
| `ink-muted` | `#6b7280` | Labels, captions, metadata |
| `ink-inverse` | `#ffffff` | Text on ink surfaces |
| `line` | `#f3f4f6` | Card borders — deliberately faint |
| `line-strong` | `#d1d5db` | Inputs, dividers that must read |
| `up` / `up-surface` | `#16a34a` / `#f0fdf4` | Positive change only |
| `down` / `down-surface` | `#dc2626` / `#fef2f2` | Negative change only |

The app is intentionally **light only**. Every surface is set explicitly, so a
`prefers-color-scheme: dark` flip inverts the chrome and leaves the content
light — which is exactly what the old `globals.css` did. Reintroduce dark mode
only by giving every token a dark counterpart.

## Layout

One width for the whole product. `.shell` in `app/globals.css` is
`max-width: 1600px` with a 1.5rem gutter that widens to 2.5rem at `lg`. Every
section, the nav and the footer use it, which is what keeps the header from
sitting inboard of the content it sits above. Do not reintroduce a per-page
`max-w-[...] mx-auto px-6`; that disagreement is what caused the drift.

Prose does not inherit the shell's width. Headings and paragraphs carry their
own `max-w-[Nch]` so a 1600px page does not produce 200-character lines.

## Type

Geist Sans and Geist Mono, loaded in `app/layout.tsx`. `body` must resolve to
`var(--font-sans)`; it previously hardcoded Arial, which silently discarded
both loaded fonts.

Any element showing a number carries `data-numeric`, which applies
`font-variant-numeric: tabular-nums` so prices do not jitter as digits change.

## Numbers

Never format inline. `app/lib/format.ts` is the only place numbers become
strings:

- `formatUsd` — full price, widening precision for sub-dollar assets so a
  meme coin does not render as `$0.00`
- `formatCompactUsd` — `$1.39T`, `$238.16B`
- `formatPercent` — signed, two decimals
- `formatCompactNumber` — supply figures
- `signalClasses` / `signalTextClass` — the single rule for up/down colour

Raw numbers travel through the app; they are stringified only at render. The
API must not send pre-formatted strings.

## Motion

`animate-fade-in`, `animate-fade-in-up`, `animate-pulse-subtle`, `animate-rise`,
`animate-draw`, `animate-area`. These are declared as `--animate-*` theme
tokens with matching `@keyframes`. The first three were used in four components
without being defined anywhere, so they did nothing. A global
`prefers-reduced-motion` block neutralises all of it.

The landing page has exactly one orchestrated load moment: the hero heading,
paragraph and buttons `animate-rise` at 60 / 140 / 220ms. Nothing below the
fold animates on scroll, because fade-and-slide-up on every section is the
generic default.

The price tape (`.ticker-track`) is the one piece of motion that never stops.
It runs `linear`, since any easing would make a constant scroll visibly surge
and slow, pauses on hover so a row can be read, and is stopped outright under
`prefers-reduced-motion` rather than merely shortened.

## Components

- Radius `rounded-md` for controls, `rounded-lg` for cards
- Cards: `bg-surface border border-line`, shadow only on hover
- Primary button: `bg-ink text-ink-inverse hover:opacity-90`
- Secondary: `bg-surface-raised text-ink-body hover:bg-line-strong`
- Focus: one global `:focus-visible` ring in `globals.css`; do not add
  per-component rings (the old inputs used `focus:ring-blue-500`, the only
  blue in the entire product)
- Chart controls come from `ChartToolbar`, not copy-pasted per chart

### Landing page

| Component | What it is |
| --- | --- |
| `landing/TickerTape` | Full-bleed price tape. The track holds the list twice so `translateX(-50%)` loops seamlessly; the duplicate copy is `aria-hidden` and untabbable |
| `landing/HeroChart` | Live BTC area chart with crosshair and tooltip. Range is derived from `series.range`, never from separate state |
| `landing/StatsBand` | Whole-market stat tiles. A single current value gets no plot; Bitcoin dominance is a share of a whole, so it gets a meter |
| `landing/TopCoins` | The market table. `DayRange` sits between identity and price |
| `landing/DayRange` | Position-in-range meter for the 24h low/high. Draws nothing when the band is collapsed or inverted |
| `landing/Movers` | 24h gainers and losers as ranked bars. The bar is the row background, scaled to the column's own peak, and `aria-hidden` because the percentage beside it says the same thing |
| `landing/Sparkline` | 7-day shape only. No axes, no labels: the precise value is in the next cell |

### Account pages

| Component | What it is |
| --- | --- |
| `PageShell` | Nav, one page width, footer. Every full page uses it |
| `OrderPanel` | The ticket. Market / Limit, with the limit's distance from the market stated, because that is what a reader is judging |
| `OpenOrders` | Resting and settled orders. Reading it is also what re-prices them |
| `WatchButton` | Follow toggle. Optimistic, and rolls back if the server disagrees |
| `WatchlistTable` | Server-rendered rows edited in place |
| `games/GamePanel` | The frame all three games share: title, odds stated up front, controls, one result slot |
| `games/StakeField` | One stake control, so a stake behaves the same in all three |
| `games/DiceGame` | The roll is drawn on a 1..100 track against the target, so the result reads without reading the number |

## Honesty rules

This is a finance UI, so unwired controls are `disabled` with a visible
explanation rather than live-looking buttons that do nothing, and placeholder
figures are never rendered as if they were real balances. Destinations that do
not exist yet render as plain labels marked "Soon", never as links to the 404
page.

Three more that the trading and game surfaces added:

- **State the cost before the action.** The limit ticket shows the distance
  from the market and what the order reserves; each game panel states its
  multiplier, with the house edge already inside it.
- **Never report a number the client computed.** A fill message quotes the
  server's price and total, not the ones typed into the box.
- **Say what is not simulated.** `/how-it-works` lists spreads, fees, partial
  fills and leverage as absent, and the landing page links to it.

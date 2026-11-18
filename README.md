# Fin-Robo

**An AI financial analyst for Indian and global markets.**
Track NIFTY, SENSEX and global cues, explore any stock, and (coming next) ask an analyst whose answers are built from live data and news, rendered as interactive cards instead of plain chat text.

> Fin-Robo v2 is a ground-up rebuild. The original Streamlit prototype from early 2026 lives in [`legacy/`](./legacy) for reference.

## Features

**Available now (phase 1)**

- **Markets overview**: NIFTY 50, SENSEX, NIFTY Bank and NIFTY IT, plus global cues (S&P 500, Nasdaq, USD/INR, gold, Brent crude, Bitcoin) with sparklines.
- **NIFTY 50 movers**: top gainers, top losers and most active by traded value.
- **Stock pages** for any NSE, BSE or US symbol:
  - an interactive price chart covering 1D to 5Y, shown in exchange-local time
  - key stats and the 52-week range
  - computed performance: returns, volatility, max drawdown, RSI and moving-average trend
  - a company profile
- **⌘K search** across every Yahoo Finance listing, with NSE and BSE results first.
- Indian number formatting (₹, lakh and crore), NSE and NYSE open/closed status, dark mode, and a mobile layout.

**Roadmap**

| Phase | What |
|---|---|
| 2 | AI analyst with tool calling. Answers render as live components (comparison cards, charts, explainers) and stream as they're generated. A shared server key means no setup for visitors, with bring-your-own-key as a fallback. |
| 3 | News linked to price moves. Unusual moves are matched to headlines, cited in AI answers, and marked on charts. |
| 4 | Local-first watchlist and portfolio stored in localStorage, CSV import (Zerodha and Groww), and an AI portfolio review. |
| 5 | A daily AI market brief, regenerated every few hours with no database. |

## Tech stack

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components, Partial Prerendering) and React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 with design tokens in `globals.css`; Geist font |
| Charts | TradingView `lightweight-charts`, plus server-rendered SVG sparklines |
| Market data | `yahoo-finance2`, server-side only, cached with `"use cache"` |
| Search UI | `cmdk` |
| Hosting | Vercel |

### How data flows

```
Browser ──► Next.js server components ──► src/lib/market-data.ts ──► Yahoo Finance
                    │                          ("use cache" + cacheLife)
                    └── /api/search, /api/history (client-side interactions)
```

- **The overview page is prerendered and revalidated about every minute**, so visitors get static HTML and Yahoo is hit at most once a minute.
- **Stock pages use Partial Prerendering.** The shell is static, and live data streams in behind `<Suspense>` skeletons.
- **Every number shown is computed in [`src/lib/indicators.ts`](./src/lib/indicators.ts).** The AI analyst will call the same functions, so it quotes calculated values instead of guessing.

## Getting started

```bash
npm install
npm run dev            # live data from Yahoo Finance
FINROBO_MOCK=1 npm run dev   # deterministic synthetic data, no network needed
```

Open http://localhost:3000.

### Environment variables

See [`.env.example`](./.env.example). Phase 1 needs none. `FINROBO_MOCK=1` switches to offline demo data.

## Deploying

1. Import the repo into [Vercel](https://vercel.com/new). It auto-detects Next.js, so no configuration is needed.
2. Add environment variables when phase 2 lands (`GOOGLE_GENERATIVE_AI_API_KEY`, `OPENROUTER_API_KEY`).

## Disclaimer

Market data comes from Yahoo Finance through an unofficial API and may be delayed. Fin-Robo is an educational project and does not provide investment advice.

## Author

**Narendran Karthikeyan**. [GitHub](https://github.com/iamnarendran) · [LinkedIn](https://www.linkedin.com/in/narendran-karthikeyan%F0%9F%8C%B3-95862423b)

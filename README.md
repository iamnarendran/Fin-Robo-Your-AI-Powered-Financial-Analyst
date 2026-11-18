# Fin-Robo

**An AI financial analyst for Indian and global markets.**
Track NIFTY, SENSEX and global cues, explore any stock, and ask an AI analyst whose answers are built from live data and rendered as interactive cards instead of plain chat text.

> Fin-Robo v2 is a ground-up rebuild. The original Streamlit prototype from early 2026 lives in [`legacy/`](./legacy) for reference.

## Features

**AI analyst (phase 2)**

Ask anything at `/ask`, from the home page prompt box, or with "Ask Fin-Robo about X" on any stock page. The model calls tools, and each tool result renders as its own component:

| You ask | You get |
|---|---|
| "Analyse Reliance" | An analysis card: price, 1-year chart, volatility, drawdown, RSI, P/E, and computed signals |
| "Compare TCS, Infosys and HCL" | A comparison card: lines rebased to 100 on one chart, plus a metrics table |
| "How's the market today?" | A market snapshot: indices, NIFTY 50 breadth, gainers and losers, global cues |
| "What is a P/E ratio?" | An explainer card that fills in as the model writes it, with a live example stock |

- Answers stream as they're generated and end with clickable follow-up suggestions.
- The model never supplies numbers. Every figure comes from a tool running [`src/lib/indicators.ts`](./src/lib/indicators.ts), and price series go only to the UI, not back to the model.
- **No setup needed for visitors.** A shared Gemini key is rate-limited per IP. Users can add their own Gemini or OpenRouter key in **AI settings**; it stays in their browser.
- Educational framing is built into the system prompt: no buy or sell calls.

**Markets (phase 1)**

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
| 2 | ✅ AI analyst with tool calling and answers rendered as live components |
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
| AI | Vercel AI SDK v7 (`streamText`, typed tool parts, `useChat`), Gemini or OpenRouter |
| Search UI | `cmdk` |
| Hosting | Vercel |

### How data flows

```
Browser ──► Next.js server components ──► src/lib/market-data.ts ──► Yahoo Finance
                    │                          ("use cache" + cacheLife)
                    └── /api/search, /api/history (client-side interactions)
```

- **Pages are partially prerendered.** The static shell and skeletons ship immediately, and market data streams in at request time from a `"use cache"` layer. A Yahoo outage during `next build` can never fail a deploy.
- **Every number shown is computed in [`src/lib/indicators.ts`](./src/lib/indicators.ts).** The AI analyst calls the same functions, so it quotes calculated values instead of guessing.

## Getting started

```bash
npm install
cp .env.example .env.local   # add a free Gemini key
npm run dev                  # live data from Yahoo Finance
FINROBO_MOCK=1 npm run dev   # synthetic data + scripted demo AI, no network or keys needed
```

Open http://localhost:3000.

### Environment variables

See [`.env.example`](./.env.example). Only `GOOGLE_GENERATIVE_AI_API_KEY` matters for production. Without it, visitors are asked to add their own key.

## Deploying

1. Import the repo into [Vercel](https://vercel.com/new). It auto-detects Next.js, so no configuration is needed.
2. Add `GOOGLE_GENERATIVE_AI_API_KEY` (a free key from [Google AI Studio](https://aistudio.google.com/apikey)) under Settings → Environment Variables, then redeploy.

## Disclaimer

Market data comes from Yahoo Finance through an unofficial API and may be delayed. Fin-Robo is an educational project and does not provide investment advice.

## Author

**Narendran Karthikeyan**. [GitHub](https://github.com/iamnarendran) · [LinkedIn](https://www.linkedin.com/in/narendran-karthikeyan%F0%9F%8C%B3-95862423b)

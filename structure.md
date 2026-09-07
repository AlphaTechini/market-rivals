# Project Structure

Market Rivals is a SvelteKit app whose pages talk to server API routes; the routes own PostgreSQL (Drizzle), wallet sessions, and the DreamDEX SDK boundary. This file maps where related logic lives and links every folder's README.

## Top-Level Mapping

| Area                         | Location                                                                                                       | Purpose                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| DreamDEX SDK boundary        | [src/lib/dreamdex](./src/lib/dreamdex/README.md)                                                               | Shannon config, market discovery, wallet binding, live order placement |
| UI components and API client | [src/lib/market-rivals](./src/lib/market-rivals/README.md)                                                     | Reusable Svelte components, typed browser API client, presence         |
| Server-only modules          | [src/lib/server](./src/lib/server/README.md)                                                                   | Database, scoring, round lifecycle processor, Supabase helpers         |
| Wallet auth                  | [src/lib/server/auth](./src/lib/server/auth/README.md)                                                         | Signed challenge sessions bound to profiles                            |
| API routes                   | [src/routes/api](./src/routes/api/README.md)                                                                   | Auth, arenas, rounds, picks, reconciliation, leaderboard, me           |
| On-demand reconciliation     | [src/routes/api/arenas/[arenaId]/reconcile/+server.ts](./src/routes/api/arenas/[arenaId]/reconcile/+server.ts) | Signed-in arena reads reconcile lifecycle with DreamDEX                |
| Pages                        | [src/routes](./src/routes/README.md)                                                                           | Landing, dashboard, tournaments, history, leaderboard                  |
| Database migrations          | [drizzle](./drizzle/README.md)                                                                                 | Drizzle-generated PostgreSQL migrations                                |

## Logic Map

- To find live market discovery and order-book reads visit [src/lib/dreamdex/markets.ts](./src/lib/dreamdex/markets.ts).
- To find browser-signed Market IOC order submission visit [src/lib/dreamdex/trading.ts](./src/lib/dreamdex/trading.ts).
- To find pick persistence with receipt verification, confirm/change rules, and the shared hard cut visit [src/routes/api/arenas/[arenaId]/rounds/[roundNumber]/pick/+server.ts](./src/routes/api/arenas/[arenaId]/rounds/[roundNumber]/pick/+server.ts).
- To find conditional standings and match-stage narratives visit [src/lib/server/match-stage.ts](./src/lib/server/match-stage.ts).
- To find computed head-to-head rivalries visit [src/lib/server/rivalries.ts](./src/lib/server/rivalries.ts).
- To find on-demand round binding, settlement, scoring, achievements, and final ranking visit [src/lib/server/round-processor.ts](./src/lib/server/round-processor.ts).
- To find the fixed score formula visit [src/lib/server/scoring.ts](./src/lib/server/scoring.ts).
- To find arena and round schemas visit [src/lib/server/db/schema.ts](./src/lib/server/db/schema.ts).
- To find the browser API client and response types visit [src/lib/market-rivals/api.ts](./src/lib/market-rivals/api.ts).

## Setup

- The environment schema lives in [.env.example](./.env.example); real values are documented in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).
- The end-to-end test walkthrough is in [README.md](./README.md).

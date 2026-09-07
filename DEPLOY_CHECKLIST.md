# Deployment Checklist

Everything needed to take Market Rivals from a clean clone to a working end-to-end test. Follow the steps in order.

## 1. Supabase project (database, avatars, presence)

1. Create a project at [supabase.com](https://supabase.com) (any region close to you).
2. Create a Storage bucket named `avatars` and make it **public** (read). Profile avatar uploads go here.
3. Enable Realtime (used for the `Online` presence pill). Default settings are fine.
4. Apply the database migrations. The remote project used for development has already had all three migrations applied through the Supabase MCP (`0000_jittery_the_twelve`, `0001_special_rhino`, `0002_square_chronomancer`). Only run the command below against a brand-new database:

```sh
pnpm db:migrate
```

5. Collect credentials from Project Settings:
   - Database → Connection string → **Session pooler** (or Transaction pooler) URI. It looks like `postgresql://postgres.<project-ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres?sslmode=require`.
   - API → `Project URL`, `anon public` key, `service_role` key (server-only, never expose it).

## 2. Environment variables

Copy [.env.example](./.env.example) to `.env` and fill in:

| Variable                      | Where it comes from                     | Notes                            |
| ----------------------------- | --------------------------------------- | -------------------------------- |
| `DATABASE_URL`                | Supabase Session Pooler URI             | Keep `sslmode=require`           |
| `SUPABASE_URL`                | Project URL                             | Server-side storage writes       |
| `SUPABASE_SERVICE_ROLE_KEY`   | service_role key                        | Server-only                      |
| `SUPABASE_AVATARS_BUCKET`     | `avatars`                               | Bucket name from step 1          |
| `PUBLIC_SUPABASE_URL`         | Project URL                             | Same value as `SUPABASE_URL`     |
| `PUBLIC_SUPABASE_ANON_KEY`    | anon key                                | Public by design                 |
| `PUBLIC_DREAMDEX_INDEXER_URL` | Default in `.env.example` already works | Shannon indexer                  |
| `PUBLIC_DREAMDEX_WS_RPC_URL`  | Default in `.env.example` already works | Shannon websocket                |
| `DREAMDEX_RPC_URL`            | Default in `.env.example` already works | Server-side receipt verification |

The DreamDEX testnet defaults are already live endpoints; you do not need to change them.

## 3. Testnet wallets (you need at least two)

1. Install an EVM wallet (MetaMask, Rabby, etc.).
2. Add the Somnia Shannon testnet to the wallet:
   - Chain ID: `50312`
   - RPC: `https://api.infra.testnet.somnia.network`
   - Explorer: `https://shannon-explorer.somnia.network`
3. Fund each wallet with test STT:
   - Faucet: <https://testnet.somnia.network/>
   - Alternatives: Google Cloud faucet, Stakely, Thirdweb (see Somnia docs).
4. Get test **USDso** (the Event Contracts quote token) on Shannon. The main `dreamdex.io` app defaults to mainnet, so use the documented testnet paths instead:
   - Open `https://app.dreamdex.io/simple/debug` (hidden faucet page; no nav link — type the path manually). Note the app lives at `app.dreamdex.io`, not the `dreamdex.io` landing host, and it must be on the Somnia testnet (chain `50312`). The page mints test USDso (plus WETH/WBTC) to the connected wallet. Do this for **both** wallets, and confirm the USDso arrives at your actual wallet address, not a Privy smart-wallet address.
   - Fallback: mint test SOMI/WBTC/WETH from the faucet contract `0x89Ebc05dE83aB9752B95030218BB10A542b96B7C` via `requestTokens(address[] tokens, uint256[] amounts)`, then swap into USDso with Simple Swap on testnet. Testnet books can be thin, so start from the most active pair.
5. If your first order fails with an approval error, approve USDso spending for the venue once in the DreamDEX app; the SDK order flow assumes the venue is approved.

## 4. Local end-to-end test

```sh
pnpm install
cp .env.example .env   # then fill the values from step 2
pnpm db:migrate
pnpm dev
```

Then run through the flow:

1. Open `http://localhost:5173`, connect wallet 1, create a profile (name + avatar).
2. Create an arena: **Mixed** asset, 2 rounds, start time ~10 minutes from now.
3. Open the invite/lobby page, connect wallet 2, join the arena.
4. When the arena starts, each wallet places an Up or Down pick (confirm dialog, real DreamDEX order).
5. After the 15-minute window settles (a few minutes for the oracle), reopen the arena or result page. The signed-in page request reconciles the stored schedule with DreamDEX automatically. Check:
   - Round result page shows the winner, revealed picks, and round points.
   - Try the **Change pick** flow on round 2 (allowed until first pick + 3 min, capped at window close - 1 min).
   - Final page shows podium, achievements, rivalry records, and the round-by-round table.

## 5. Deploy to Vercel

1. Push the repo (already on `main` at `github.com/AlphaTechini/market-rivals`).
2. Import the repository in Vercel; the framework preset (SvelteKit + `@sveltejs/adapter-vercel`) is detected automatically. [svelte.config.js](./svelte.config.js) is already configured.
3. Add **all** environment variables from step 2 in Project Settings → Environment Variables (Production and Preview).
4. No Vercel Cron or separate worker is required. Signed-in arena reads call the built-in SvelteKit reconciliation endpoint, which catches the arena up from the database schedule and DreamDEX state.
5. Deploy, then verify:
   - The landing page loads and wallet connect works.
   - `GET https://<your-domain>/api/me` returns `{"profile":null}` (means DB + session wiring is alive).
   - After creating an arena and letting it start, confirm rounds advance without any manual action.

## 6. Playtest and record the demo

For the submission you need a 2-3 minute demo video. Recommended capture plan:

1. Recruit one friend (two wallets total is enough; three is better for the stage).
2. Record: invite link → lobby → both wallets picking in the live window → the conditional match stage → settlement → result with rivalry record → final standings with achievements.
3. Say the scoring rule out loud once: "Everyone stakes the same 10 contracts; points follow the settled return of your position."

## Troubleshooting

| Symptom                                               | Likely cause                                                                                       |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| "No live BTC/ETH Event Contract is trading right now" | No qualifying market at that moment; try again a few minutes before the next 15-minute boundary    |
| Order rejected mentioning allowance                   | Approve USDso spending for the wallet in the DreamDEX app once                                     |
| Avatar upload fails                                   | `avatars` bucket missing or not public-read                                                        |
| Rounds look stale after a browser was closed          | Open the arena, round, result, or final page while signed in; the first data request reconciles it |
| Leaderboard empty                                     | No arenas have reached COMPLETED yet; it fills after the first full tournament settles             |

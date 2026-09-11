# Market Rivals

Market Rivals is a SvelteKit application for competitive, multi-round BTC and ETH tournaments over DreamDEX Event Contracts.

## Quickstart (End To End)

The complete setup walkthrough — Supabase, environment, wallets, local test, and Vercel deploy — is in [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md). Short version:

1. Install dependencies:

```sh
pnpm install
```

2. Create your environment file from the schema and fill in the placeholders:

```sh
cp .env.example .env
```

Every variable is documented in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md). You need a Supabase project (Session Pooler `DATABASE_URL`, service-role key, avatar bucket, anon key) and the DreamDEX Shannon defaults from `.env.example`, which already point at the working testnet endpoints.

On Vercel, the Supabase integration's auto-provisioned `POSTGRES_URL`, `SUPABASE_SECRET_KEY`, and `NEXT_PUBLIC_SUPABASE_*` variables are supported directly; see [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md#vercel-supabase-integration).

3. Apply the database migration to a brand-new database (the project's remote database already has it applied through the Supabase MCP; requires the `DATABASE_URL` from step 2):

```sh
pnpm db:migrate
```

4. Start the app:

```sh
pnpm dev
```

5. To test, you need a Somnia Shannon testnet wallet:

- Install an EVM wallet (MetaMask or similar) and add the Somnia Testnet network (chain ID `50312`, RPC `https://api.infra.testnet.somnia.network`, explorer `https://shannon-explorer.somnia.network`).
- Get test STT for gas from the Somnia faucet at `https://testnet.somnia.network/`, then request test USDso for Event Contract orders through the official hackathon Telegram at `https://t.me/+XHq0F0JXMyhmMzM0`.
- Connect the wallet on the landing page, create a profile, create an arena, join with a second wallet, and make your picks during each live round.

Arena pages reconcile round lifecycle on demand. When a signed-in player opens an arena, the server reads the stored schedule and current DreamDEX market state, then applies any due transitions idempotently.

## Developing

Install dependencies with `pnpm install`, then start the development server:

```sh
pnpm dev

# start the server and open the app in a new browser tab
pnpm dev -- --open
```

## Building

Create a production build with:

```sh
pnpm build
```

You can preview the production build with `pnpm preview`.

The app uses the Vercel adapter in [svelte.config.js](./svelte.config.js).

## Configuration

Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for Session Pooler, public avatar storage, Presence, Vercel cron, and environment configuration.

To find DreamDEX SDK configuration visit [src/lib/dreamdex/config.ts](./src/lib/dreamdex/config.ts).

To find API route logic visit [src/routes/api](./src/routes/api).

The project layout is mapped in [structure.md](./structure.md).

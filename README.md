# Market Rivals

Market Rivals is a SvelteKit application for competitive, multi-round BTC and ETH tournaments over DreamDEX Event Contracts.

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

Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for Session Pooler, public avatar storage, Presence, and Vercel environment configuration.

To find DreamDEX SDK configuration visit [src/lib/dreamdex/config.ts](file:///C:/Hackathons/DreamDEX/frontend/src/lib/dreamdex/config.ts).

To find API route logic visit [src/routes/api](file:///C:/Hackathons/DreamDEX/frontend/src/routes/api).

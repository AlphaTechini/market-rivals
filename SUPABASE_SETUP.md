# Supabase Setup

This guide configures the database, public profile avatars, and online presence used by Market Rivals. The application uses the Supabase Session Pooler for PostgreSQL and a server-side upload route for avatars.

## 1. Create The Avatar Bucket

In the Supabase dashboard:

1. Open **Storage**.
2. Create a bucket named `avatars`.
3. Set the bucket to **Public**.
4. Keep file uploads routed through `/api/profile/avatar`; do not expose the service-role key in the browser.

The public bucket is intentional because profile pictures are displayed beside names on public leaderboards. The server stores only the object path in PostgreSQL and derives the public URL when returning profile data.

Official references:

- [Create Storage buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)

The current upload connection can be found in [src/lib/server/supabase.ts](file:///C:/Hackathons/DreamDEX/frontend/src/lib/server/supabase.ts).

## 2. Environment Variables

Copy `.env.example` to a local `.env` and replace only the placeholders. Never commit `.env`.

| Variable                      | Where to get it                                               | Runtime        | Purpose                                                |
| ----------------------------- | ------------------------------------------------------------- | -------------- | ------------------------------------------------------ |
| `DATABASE_URL`                | Supabase **Connect** dialog, Session Pooler, port `5432`      | Server         | Drizzle PostgreSQL connection. Keep `sslmode=require`. |
| `SUPABASE_URL`                | Supabase **Project Settings > API > Project URL**             | Server         | Server Supabase client endpoint.                       |
| `SUPABASE_SERVICE_ROLE_KEY`   | Supabase **Project Settings > API > secret/service-role key** | Server only    | Upload avatar objects. Never expose it as `PUBLIC_`.   |
| `SUPABASE_AVATARS_BUCKET`     | The bucket name created above                                 | Server         | Set to `avatars`.                                      |
| `PUBLIC_SUPABASE_URL`         | Same Supabase Project URL                                     | Browser        | Supabase Realtime Presence endpoint.                   |
| `PUBLIC_SUPABASE_ANON_KEY`    | Supabase **Project Settings > API > publishable/anon key**    | Browser        | Realtime Presence client authentication.               |
| `PUBLIC_DREAMDEX_INDEXER_URL` | DreamDEX developer documentation                              | Browser/server | Event Contract market discovery.                       |
| `PUBLIC_DREAMDEX_WS_RPC_URL`  | Somnia Shannon RPC documentation                              | Browser/server | Optional WebSocket RPC override for the DreamDEX SDK.  |

The environment schema is maintained in [.env.example](./.env.example). Supabase API keys are documented in [Understanding API keys](https://supabase.com/docs/guides/api/api-keys). Connection strings are documented in [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres).

## 3. Run The Database Migration

After `DATABASE_URL` points to the Supabase Session Pooler:

```text
pnpm db:migrate
```

The migration creates profiles, wallet challenges, sessions, arenas, participants, rounds, picks, and achievements. The generated SQL is in [drizzle/0000_jittery_the_twelve.sql](./drizzle/0000_jittery_the_twelve.sql).

## 4. Configure Vercel

Add the server variables to Vercel without the `PUBLIC_` prefix exposed to the browser:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_AVATARS_BUCKET`

Add these public variables for the browser bundle and Presence connection:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_DREAMDEX_INDEXER_URL`
- `PUBLIC_DREAMDEX_WS_RPC_URL`

Use the same values for Preview and Production only when both environments intentionally target the same Supabase project. Otherwise create separate Supabase projects or database branches. Vercel variable guidance is available in [Environment variables](https://vercel.com/docs/environment-variables).

## 5. Verify The Setup

1. Start the app with `pnpm dev`.
2. Complete profile setup with an image under 5 MB in JPG, PNG, or WebP format.
3. Confirm the avatar object appears under `avatars/profiles/{profileId}/`.
4. Confirm the browser receives an `Online` Presence status when the public Supabase variables are configured.
5. Confirm leaderboard and completed-arena requests return data after the migration has been applied.

To find avatar upload validation visit [src/routes/api/profile/avatar/+server.ts](file:///C:/Hackathons/DreamDEX/frontend/src/routes/api/profile/avatar/+server.ts).

To find Realtime Presence logic visit [src/lib/market-rivals/presence.ts](file:///C:/Hackathons/DreamDEX/frontend/src/lib/market-rivals/presence.ts).

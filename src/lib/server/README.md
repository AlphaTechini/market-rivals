# Server Modules

This directory contains SvelteKit server-only database, authentication, and integration helpers. Browser components must not import these modules.

To find wallet session lookup logic visit [auth/session.ts](./auth/session.ts).

To find PostgreSQL connection setup visit [db/index.ts](./db/index.ts).

To find deterministic round score calculation visit [scoring.ts](./scoring.ts).

To find on-demand round lifecycle, settlement, and final ranking logic visit [round-processor.ts](./round-processor.ts).

To find the shared scheduled and DreamDEX market deadline rule visit [round-timing.ts](./round-timing.ts).

The Supabase server connection can be found in [supabase.ts](file:///C:/Hackathons/DreamDEX/frontend/src/lib/server/supabase.ts).

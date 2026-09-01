# Server Modules

This directory contains SvelteKit server-only database, authentication, and integration helpers. Browser components must not import these modules.

To find wallet session lookup logic visit [auth/session.ts](./auth/session.ts).

To find PostgreSQL connection setup visit [db/index.ts](./db/index.ts).

To find deterministic round score calculation visit [scoring.ts](./scoring.ts).

The Supabase server connection can be found in [supabase.ts](file:///C:/Hackathons/DreamDEX/frontend/src/lib/server/supabase.ts).

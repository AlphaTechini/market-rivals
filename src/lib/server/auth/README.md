# Wallet Authentication

This directory binds a wallet address to a profile through a short-lived signed challenge and an HTTP-only application session. Private keys never enter the server.

To find challenge-session creation and lookup logic visit [session.ts](./session.ts).

The profile and session database connection can be found in [../db/schema.ts](file:///C:/Hackathons/DreamDEX/frontend/src/lib/server/db/schema.ts).

# Scheduled Processing

This directory contains the Vercel Pro cron endpoint that advances arena rounds without relying on browser activity. The endpoint is protected by `CRON_SECRET` and delegates lifecycle work to the server-only processor.

## Architectural Decisions

- Vercel Pro cron runs once per minute, which matches the arena timing model without adding a long-running worker.
- The processor reads settlement and fill evidence from DreamDEX, then writes each terminal round in one PostgreSQL transaction.
- Round transitions are guarded by database row locks and terminal statuses so retries do not double-score participants.
- Voided DreamDEX markets use the explicit `VOIDED` round state and do not award points.

To find cron authentication and HTTP response logic visit [+server.ts](./process-rounds/+server.ts).

To find round binding, locking, settlement, scoring, and final ranking logic visit [round-processor.ts](../../../lib/server/round-processor.ts).

The Vercel cron schedule can be found in [vercel.json](../../../../vercel.json).

The database connection used by the processor can be found in [db/index.ts](../../../lib/server/db/index.ts).

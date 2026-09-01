# Market Rivals UI

This module ports the static Silver Arena prototype into reusable Svelte components and fixture data. The visual pass intentionally keeps tournament values static while the DreamDEX SDK integration remains in [src/lib/dreamdex](file:///C:/Hackathons/DreamDEX/frontend/src/lib/dreamdex).

## Architectural Decisions

- Screens use real SvelteKit routes instead of a single stateful page, keeping tournament and invite URLs shareable.
- Components contain presentation and small browser interactions only. Tournament persistence and live DreamDEX data remain separate concerns.
- Fixture values are clearly separated in [data.ts](./data.ts) so replacing them with server data does not require rewriting the visual components.

To find shared branding and header logic visit [BrandHeader.svelte](./BrandHeader.svelte).

To find reusable tournament card logic visit [TournamentCard.svelte](./TournamentCard.svelte).

To find prototype fixture data visit [data.ts](./data.ts).

The DreamDEX system connection can be found in [src/lib/dreamdex/config.ts](file:///C:/Hackathons/DreamDEX/frontend/src/lib/dreamdex/config.ts).

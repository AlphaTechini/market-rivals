# Match Film

Animated, shareable replay cards for settled arenas. One deterministic render function drives the on-page preview and both export formats, so what users see is pixel-identical to what they share.

## Architectural Decisions

- One pure `drawFrame(ctx, data, t)` function renders any moment; preview uses `requestAnimationFrame`, exports use exact timestamps. No DOM/CSS inside the film, so frames are reproducible offline.
- MP4 via mediabunny (WebCodecs H.264, silent, `fastStart: 'in-memory'`); GIF via modern-gif (480px, 10fps, Floyd-Steinberg dithering for the silver gradients). Both libraries were chosen over Remotion (React-only + license/infra), ffmpeg.wasm (31MB + GPL core), and deprecated muxers (mp4-muxer -> mediabunny).
- Square 1080x1080 fixed template; only names, sides, prices, and outcomes vary per match.
- Avatars are CORS-fetched into ImageBitmaps before rendering to avoid canvas tainting; initials are the fallback.
- Exports run on the main thread by design: worker OffscreenCanvas cannot see document fonts, which would drift text between preview and export.

## File Map

To find the fixed animation template and all drawing logic visit [draw-frame.ts](./draw-frame.ts).

To find the data shape, timeline constants, and duration math visit [types.ts](./types.ts).

To find the small easing/phase helpers visit [easing.ts](./easing.ts) and the palette in [theme.ts](./theme.ts).

To find the MP4 export pipeline visit [export-mp4.ts](./export-mp4.ts); the GIF pipeline lives in [export-gif.ts](./export-gif.ts).

To find arena-summary-to-film-data mapping visit [build-data.ts](./build-data.ts).

The CORS-safe avatar loader can be found in [avatar-loader.ts](./avatar-loader.ts).

The preview-and-export UI component can be found in [MatchFilmCard.svelte](./MatchFilmCard.svelte).

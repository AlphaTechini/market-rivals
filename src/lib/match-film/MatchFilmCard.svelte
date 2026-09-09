<script lang="ts">
	import { onMount } from 'svelte';
	import { buildMatchFilmData } from '$lib/match-film/build-data';
	import { drawFrame } from '$lib/match-film/draw-frame';
	import { FILM_SIZE, type MatchFilmData } from '$lib/match-film/types';
	import { fetchMyProfile, type ArenaSummary, type RivalryRecord } from '$lib/market-rivals/api';

	type Props = {
		summary: ArenaSummary;
		rivalries: RivalryRecord[];
	};

	let { summary, rivalries }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let film = $state<MatchFilmData | null>(null);
	let error = $state('');
	let building = $state(true);
	let rendering = $state<'mp4' | 'gif' | null>(null);
	let progress = $state(0);
	let mp4Supported = $state(false);
	let startedAt = $state(0);
	let rafId = 0;

	$effect(() => {
		void summary.arena.id;
		void rivalries.length;
		void loadFilm();
	});

	onMount(() => {
		return () => window.cancelAnimationFrame(rafId);
	});

	async function loadFilm() {
		building = true;
		error = '';
		film = null;
		try {
			await document.fonts.ready;
			const viewer = await fetchMyProfile().catch(() => null);
			const rival =
				rivalries.find((record) => record.roundsTogether > 0 && record.wins !== record.losses) ??
				rivalries[0] ??
				null;
			film = await buildMatchFilmData(summary, viewer?.id ?? null, rival);
			// encoder libraries are heavy; load them only when needed
			const { canExportMatchFilmMp4 } = await import('$lib/match-film/export-mp4');
			mp4Supported = await canExportMatchFilmMp4().catch(() => false);
			startedAt = performance.now();
			tick();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'The match film could not be built.';
		} finally {
			building = false;
		}
	}

	function tick() {
		window.cancelAnimationFrame(rafId);
		const render = () => {
			const context = canvas?.getContext('2d');
			if (context && film) {
				const elapsed = ((performance.now() - startedAt) / 1000) % film.totalDuration;
				drawFrame(context, film, elapsed);
			}
			rafId = window.requestAnimationFrame(render);
		};
		rafId = window.requestAnimationFrame(render);
	}

	function replay() {
		startedAt = performance.now();
	}

	async function exportFilm(kind: 'mp4' | 'gif') {
		if (!film || rendering) return;
		rendering = kind;
		progress = 0;
		error = '';
		try {
			const blob =
				kind === 'mp4'
					? await (
							await import('$lib/match-film/export-mp4')
						).exportMatchFilmMp4(film, (ratio) => (progress = ratio))
					: await (
							await import('$lib/match-film/export-gif')
						).exportMatchFilmGif(film, (ratio) => (progress = ratio));
			await shareOrDownload(blob, kind);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'The export failed.';
		} finally {
			rendering = null;
		}
	}

	async function shareOrDownload(blob: Blob, kind: 'mp4' | 'gif') {
		const file = new File([blob], `market-rivals-match-film.${kind === 'mp4' ? 'mp4' : 'gif'}`, {
			type: blob.type
		});
		const nav = navigator as Navigator & {
			canShare?: (data: { files?: File[] }) => boolean;
		};
		if (nav.canShare?.({ files: [file] })) {
			try {
				await navigator.share({ files: [file], title: 'Market Rivals match film' });
				return;
			} catch {
				// user dismissed the share sheet; fall through to download
			}
		}
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = file.name;
		anchor.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
	}

	let percent = $derived(Math.round(progress * 100));
</script>

<div class="card" style="text-align: left; margin-top: 20px">
	<div class="meta">
		<strong>Match film</strong>
		<span class="pill">{film ? `${film.totalDuration.toFixed(0)}s replay` : 'building…'}</span>
	</div>

	<div class="film-frame">
		<canvas bind:this={canvas} width={FILM_SIZE} height={FILM_SIZE} aria-label="Match film preview"
		></canvas>
	</div>

	{#if building}<p class="fine" style="margin-top: 10px">
			Building the replay from verified fills…
		</p>{/if}
	{#if error}<p class="form-error" style="margin-top: 10px">{error}</p>{/if}

	<div class="actions" style="margin-top: 14px">
		<button class="btn" type="button" onclick={replay} disabled={!film || !!rendering}
			>Replay</button
		>
		{#if mp4Supported}
			<button
				class="btn primary"
				type="button"
				onclick={() => exportFilm('mp4')}
				disabled={!film || !!rendering}
			>
				{rendering === 'mp4' ? `Rendering MP4 ${percent}%` : 'Export MP4'}
			</button>
		{/if}
		<button
			class="btn"
			type="button"
			onclick={() => exportFilm('gif')}
			disabled={!film || !!rendering}
		>
			{rendering === 'gif' ? `Rendering GIF ${percent}%` : 'Export GIF'}
		</button>
	</div>
	<p class="fine" style="margin-top: 10px">
		The film replays your picks, fills, and outcomes from settled DreamDEX windows. MP4 works on
		most browsers; GIF is the universal fallback.
	</p>
</div>

<style>
	.film-frame {
		display: grid;
		place-items: center;
		margin-top: 14px;
		border: 1px solid rgb(255 255 255 / 10%);
		border-radius: 16px;
		background: #060809;
		overflow: hidden;
	}

	canvas {
		width: 100%;
		max-width: 540px;
		aspect-ratio: 1;
		display: block;
	}
</style>

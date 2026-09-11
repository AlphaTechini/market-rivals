<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import MatchFilmCard from '$lib/match-film/MatchFilmCard.svelte';
	import { fetchArenaSummary, isUuid, type ArenaSummary } from '$lib/market-rivals/api';

	// reproducible seeded arena from scripts/seed-match-film.sql; any arena id
	// can be viewed by appending ?arena=<uuid>
	const seededArenaId = '00000000-0000-4000-8000-00000000aa01';

	let summary = $state<ArenaSummary | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		const requested = page.url.searchParams.get('arena') ?? seededArenaId;
		if (!isUuid(requested)) {
			error = 'Add ?arena=<tournament-id> to preview a specific arena film.';
			loading = false;
			return;
		}
		try {
			summary = await fetchArenaSummary(requested);
		} catch (cause) {
			error =
				cause instanceof Error
					? cause.message
					: 'The seeded test arena is not present in this database.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head><title>Match Film Demo | Market Rivals</title></svelte:head>

<BrandHeader mode="minimal" actionLabel="Dashboard" actionHref="/dashboard" />

<main class="wrap">
	<section class="narrow">
		<div class="eyebrow">Demo reel · seeded data</div>
		<h1>Match film test page</h1>
		<p class="sub">
			This page renders the animated match film from the seeded test arena, with no wallet or live
			market required. Signed-out viewers see the champion's perspective.
		</p>

		{#if summary && summary.rounds.length > 0}
			<MatchFilmCard {summary} rivalries={[]} />
		{:else if loading}
			<p class="fine">Loading the seeded arena...</p>
		{:else if error}
			<p class="form-error">{error}</p>
		{:else}
			<p class="form-error">
				This arena has no settled rounds yet; the film needs at least one round.
			</p>
		{/if}
	</section>
</main>

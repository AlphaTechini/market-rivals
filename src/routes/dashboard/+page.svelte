<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import AppTabs from '$lib/market-rivals/AppTabs.svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import TournamentCard from '$lib/market-rivals/TournamentCard.svelte';
	import { fetchLiveArenas } from '$lib/market-rivals/api';
	import { liveTournaments } from '$lib/market-rivals/data';

	let tournaments = $state(liveTournaments);
	let loading = $state(true);
	let loadError = $state('');

	onMount(async () => {
		try {
			const arenas = await fetchLiveArenas();
			tournaments = arenas.map((arena) => ({
				name: arena.name,
				status: arena.status === 'LIVE' ? 'LIVE' : 'JOINING',
				players: `${arena.playerCount} / ${arena.maximumParticipants} players`,
				detail: `${arena.roundCount} rounds · ${arena.asset} · starts ${new Date(arena.startAt).toLocaleString()}`,
				avatars: [],
				cta: arena.status === 'LIVE' ? 'Watch live ->' : 'View arena ->',
				href: `/tournaments/${arena.id}/lobby`
			}));
		} catch (cause) {
			loadError = cause instanceof Error ? cause.message : 'Live tournaments could not be loaded.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head><title>Live Tournaments | Market Rivals</title></svelte:head>

<BrandHeader />
<AppTabs active="live" />

<main class="wrap">
	<section class="apphead between">
		<div>
			<div class="eyebrow">Welcome back, Alpha</div>
			<h1>Find your next arena</h1>
			<p class="sub">Join a live public tournament or create one for your circle.</p>
		</div>
		<div class="actions">
			<input class="search" type="search" placeholder="Search by name or invite code" />
			<a class="btn primary" href={resolve('/tournaments/create')}>+ Create tournament</a>
		</div>
	</section>

	{#if loading}<p class="fine">Loading live tournaments...</p>{/if}
	{#if loadError}<p class="form-error">{loadError}</p>{/if}
	<section class="grid" aria-label="Live tournaments">
		{#each tournaments as tournament (tournament.name)}
			<TournamentCard {tournament} />
		{/each}
	</section>
</main>

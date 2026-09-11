<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import AppTabs from '$lib/market-rivals/AppTabs.svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import TournamentCard from '$lib/market-rivals/TournamentCard.svelte';
	import {
		fetchLiveArenas,
		fetchMyProfile,
		type ApiProfile,
		type LiveArena
	} from '$lib/market-rivals/api';
	import type { Tournament } from '$lib/market-rivals/data';

	let arenas = $state<LiveArena[]>([]);
	let profile = $state<ApiProfile | null>(null);
	let search = $state('');
	let loading = $state(true);
	let loadError = $state('');

	onMount(async () => {
		try {
			const [loaded, me] = await Promise.all([
				fetchLiveArenas(),
				fetchMyProfile().catch(() => null)
			]);
			arenas = loaded;
			profile = me;
		} catch (cause) {
			loadError = cause instanceof Error ? cause.message : 'Live tournaments could not be loaded.';
		} finally {
			loading = false;
		}
	});

	onMount(() => {
		const interval = window.setInterval(() => {
			void fetchLiveArenas()
				.then((fresh) => (arenas = fresh))
				.catch(() => undefined);
		}, 20_000);
		return () => window.clearInterval(interval);
	});

	let filtered = $derived.by(() => {
		const needle = search.trim().toLowerCase();
		return arenas
			.filter(
				(arena) =>
					!needle ||
					arena.name.toLowerCase().includes(needle) ||
					arena.id.toLowerCase().includes(needle)
			)
			.map((arena): Tournament => ({
				name: arena.name,
				status: arena.status === 'LIVE' ? 'LIVE' : 'JOINING',
				players: `${arena.playerCount} / ${arena.maximumParticipants} players`,
				detail: `${arena.roundCount} rounds · ${arena.asset} · starts ${new Date(arena.startAt).toLocaleString()}`,
				avatars: [],
				cta: arena.status === 'LIVE' ? 'Open arena ->' : 'View arena ->',
				href: `/tournaments/${arena.id}/lobby`
			}));
	});
</script>

<svelte:head><title>Live Tournaments | Market Rivals</title></svelte:head>

<BrandHeader />
<AppTabs active="live" />

<main class="wrap">
	<section class="apphead between">
		<div>
			<div class="eyebrow">{profile ? `Welcome back, ${profile.displayName}` : 'Live arenas'}</div>
			<h1>Find your next arena</h1>
			<p class="sub">Join a live public tournament or create one for your circle.</p>
		</div>
		<div class="actions">
			<input
				class="search"
				type="search"
				placeholder="Search by name"
				bind:value={search}
				aria-label="Search tournaments"
			/>
			<a class="btn primary" href={resolve('/tournaments/create')}>+ Create tournament</a>
		</div>
	</section>

	{#if loading}<p class="fine">Loading live tournaments...</p>{/if}
	{#if loadError}<p class="form-error">{loadError}</p>{/if}
	{#if !loading && filtered.length === 0 && !loadError}
		<p class="fine">No live arenas match. Create one or check back soon.</p>
	{/if}
	<section class="grid" aria-label="Live tournaments">
		{#each filtered as tournament (tournament.name)}
			<TournamentCard {tournament} />
		{/each}
	</section>
</main>

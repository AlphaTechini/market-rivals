<script lang="ts">
	import { resolve } from '$app/paths';
	import AppTabs from '$lib/market-rivals/AppTabs.svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import TournamentCard from '$lib/market-rivals/TournamentCard.svelte';
	import { liveTournaments } from '$lib/market-rivals/data';
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

	<section class="grid" aria-label="Live tournaments">
		{#each liveTournaments as tournament (tournament.name)}
			<TournamentCard {tournament} />
		{/each}
	</section>
</main>

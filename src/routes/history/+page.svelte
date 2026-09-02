<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import AppTabs from '$lib/market-rivals/AppTabs.svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import { fetchPastArenas, type LiveArena } from '$lib/market-rivals/api';

	let pastArenas = $state<LiveArena[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			pastArenas = await fetchPastArenas();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Past tournaments could not be loaded.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head><title>Past Tournaments | Market Rivals</title></svelte:head>

<BrandHeader />
<AppTabs active="history" />

<main class="wrap">
	<section class="apphead between">
		<div>
			<div class="eyebrow">Archive</div>
			<h1>Past tournaments</h1>
			<p class="sub">Review final standings and settled competition summaries.</p>
		</div>
		<input class="search" type="search" placeholder="Search past tournaments" />
	</section>

	{#if loading}<p class="fine">Loading past tournaments...</p>{/if}
	{#if error}<p class="form-error">{error}</p>{/if}
	<section class="grid" aria-label="Past tournaments">
		{#each pastArenas as arena (arena.id)}
			<article class="card tournament">
				<div class="meta"><span class="pill">COMPLETED</span><span>{arena.asset}</span></div>
				<div class="asset">{arena.name}</div>
				<p>{arena.roundCount} rounds · completed {new Date(arena.startAt).toLocaleDateString()}</p>
				<div class="bottom">
					<span class="fine" style="margin: 0">{arena.playerCount} players</span>
					<a class="btn" href={resolve(`/history/${arena.id}`)}>View summary -></a>
				</div>
			</article>
		{/each}
	</section>
</main>

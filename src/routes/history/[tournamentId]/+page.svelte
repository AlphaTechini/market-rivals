<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import PlayerName from '$lib/market-rivals/PlayerName.svelte';
	import {
		fetchArenaSummary,
		isUuid,
		profileFromApi,
		type ArenaSummary
	} from '$lib/market-rivals/api';

	let summary = $state<ArenaSummary | null>(null);
	let loading = $state(true);
	let error = $state('');
	let tournamentId = $derived(page.params.tournamentId);
	let standings = $derived.by(() => {
		const currentSummary = summary;
		if (!currentSummary) return [];
		return currentSummary.participants.map((participant) => ({
			profile: profileFromApi(participant.profile),
			rounds: `${participant.correctRounds} / ${currentSummary.arena.roundCount}`,
			winRate: `${Math.round((participant.correctRounds / currentSummary.arena.roundCount) * 100)}%`,
			points: Number(participant.totalScore)
		}));
	});

	onMount(async () => {
		const id = tournamentId;
		if (!id || !isUuid(id)) {
			loading = false;
			return;
		}
		try {
			summary = await fetchArenaSummary(id);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Tournament summary could not be loaded.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head><title>Past Tournament Summary | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap">
	<section class="narrow">
		<div style="text-align: left">
			<a class="text-link" href={resolve('/history')}>&lt;- Past tournaments</a>
		</div>
		<div class="eyebrow" style="margin-top: 54px">
			{summary ? `${summary.arena.asset} · completed tournament` : 'Completed tournament'}
		</div>
		<h1>{summary?.arena.name ?? 'Arena summary'}</h1>
		<p class="sub">
			This compact summary reflects the final settled competition. Round-by-round history is
			intentionally omitted.
		</p>
		<div class="statgrid">
			<div class="stat">
				<small>Created by</small><strong>{summary?.host?.displayName ?? '-'}</strong>
			</div>
			<div class="stat">
				<small>Rounds played</small><strong>{summary?.arena.roundCount ?? '-'}</strong>
			</div>
			<div class="stat">
				<small>Won by</small><strong>{standings[0]?.profile.name ?? '-'}</strong>
			</div>
		</div>
		{#if loading}<p class="fine">Loading settled player data...</p>{/if}
		{#if error}<p class="form-error">{error}</p>{/if}
		<div class="table-wrap">
			<table class="table">
				<thead
					><tr><th>Player</th><th>Winning rounds</th><th>Win rate</th><th>Points</th></tr></thead
				>
				<tbody>
					{#each standings as standing (standing.profile.name)}
						<tr
							><td><PlayerName profile={standing.profile} /></td><td>{standing.rounds}</td><td
								>{standing.winRate}</td
							><td><strong>{standing.points}</strong></td></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
		<span class="pill" style="margin-top: 22px"
			>{summary ? `${summary.participants.length} PLAYERS` : '-'}</span
		>
	</section>
</main>

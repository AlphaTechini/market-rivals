<script lang="ts">
	import { onMount } from 'svelte';
	import AppTabs from '$lib/market-rivals/AppTabs.svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import PlayerName from '$lib/market-rivals/PlayerName.svelte';
	import { fetchLeaderboard, profileFromApi, type LeaderboardEntry } from '$lib/market-rivals/api';

	let assetFilter = $state<'ALL' | 'BTC' | 'ETH'>('ALL');
	let standings = $state<LeaderboardEntry[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function loadLeaderboard() {
		loading = true;
		error = '';
		try {
			standings = await fetchLeaderboard(assetFilter);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Leaderboard could not be loaded.';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadLeaderboard();
	});
</script>

<svelte:head><title>Global Leaderboard | Market Rivals</title></svelte:head>

<BrandHeader />
<AppTabs active="leaderboard" />

<main class="wrap">
	<section class="apphead">
		<div class="eyebrow">All arenas · current season</div>
		<h1>Global leaderboard</h1>
		<p class="sub">Aggregated performance across completed public tournaments.</p>
	</section>

	<section class="filter-row">
		<span class="fine" style="margin: 0">Ranked by settled points</span>
		<label>
			<span class="sr-only">Filter by asset</span>
			<select
				aria-label="Filter by asset"
				bind:value={assetFilter}
				onchange={() => void loadLeaderboard()}
			>
				<option value="ALL">All assets</option>
				<option value="BTC">BTC only</option>
				<option value="ETH">ETH only</option>
			</select>
		</label>
	</section>

	{#if loading}<p class="fine">Loading leaderboard...</p>{/if}
	{#if error}<p class="form-error">{error}</p>{/if}
	{#if standings.length}
		<section class="podium" aria-label="Top three players">
			{#each standings.slice(0, 3) as standing (standing.profile.id)}
				<div class="podium-item" class:first={standing.rank === 1}>
					<span class="medal"
						>{standing.rank === 1 ? 'Gold' : standing.rank === 2 ? 'Silver' : 'Bronze'}</span
					>
					<PlayerName profile={profileFromApi(standing.profile)} />
					<small
						>{standing.totalScore.toLocaleString()} pts · {standing.tournaments} tournaments</small
					>
				</div>
			{/each}
		</section>
	{/if}

	<section class="table-wrap">
		<table class="table">
			<thead
				><tr><th>Player</th><th>Tournaments</th><th>Correct rounds</th><th>Points</th></tr></thead
			>
			<tbody>
				{#each standings as standing (standing.profile.id)}
					<tr>
						<td><PlayerName profile={profileFromApi(standing.profile)} /></td>
						<td>{standing.tournaments}</td><td>{standing.correctRounds}</td><td
							><strong>{standing.totalScore.toLocaleString()}</strong></td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</main>

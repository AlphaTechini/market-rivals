<script lang="ts">
	import Avatar from '$lib/market-rivals/Avatar.svelte';
	import AppTabs from '$lib/market-rivals/AppTabs.svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import PlayerName from '$lib/market-rivals/PlayerName.svelte';
	import { globalStandings, profileFor } from '$lib/market-rivals/data';
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
			<select aria-label="Filter by asset">
				<option>All assets</option>
				<option>BTC only</option>
				<option>ETH only</option>
			</select>
		</label>
	</section>

	<section class="podium" aria-label="Top three players">
		<div class="podium-item">
			<span class="medal">Silver</span><Avatar name="Zoe" initials="ZO" size="small" /><strong
				>Zoe</strong
			><small>8,980 pts</small>
		</div>
		<div class="podium-item first">
			<span class="medal">Gold</span><Avatar name="Ava" initials="AV" size="small" /><strong
				>Ava</strong
			><small>10,240 pts · 14 tournaments</small>
		</div>
		<div class="podium-item">
			<span class="medal">Bronze</span><Avatar name="Alpha" initials="AL" size="small" /><strong
				>Alpha</strong
			><small>8,410 pts</small>
		</div>
	</section>

	<section class="table-wrap">
		<table class="table">
			<thead><tr><th>Player</th><th>Tournaments</th><th>Win rate</th><th>Points</th></tr></thead>
			<tbody>
				{#each globalStandings as standing (standing.player)}
					<tr>
						<td
							><PlayerName
								profile={profileFor(standing.player)}
								badge={standing.player === 'Alpha' ? 'YOU' : undefined}
							/></td
						>
						<td>{standing.tournaments}</td><td>{standing.winRate}</td><td
							><strong>{standing.points.toLocaleString()}</strong></td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</main>

<script lang="ts">
	import { resolve } from '$app/paths';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import PlayerName from '$lib/market-rivals/PlayerName.svelte';
	import { profileFor } from '$lib/market-rivals/data';

	const standings = [
		{ player: 'Ava', rounds: '8 / 10', winRate: '80%', points: 810 },
		{ player: 'Alpha', rounds: '7 / 10', winRate: '70%', points: 720 },
		{ player: 'Zoe', rounds: '6 / 10', winRate: '60%', points: 650 },
		{ player: 'Milo', rounds: '5 / 10', winRate: '50%', points: 530 },
		{ player: 'Liam', rounds: '4 / 10', winRate: '40%', points: 440 }
	];
</script>

<svelte:head><title>Past Tournament Summary | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap">
	<section class="narrow">
		<div style="text-align: left">
			<a class="text-link" href={resolve('/history')}>&lt;- Past tournaments</a>
		</div>
		<div class="eyebrow" style="margin-top: 54px">Completed August 29 · BTC/USD</div>
		<h1>Friday Night Calls</h1>
		<p class="sub">
			This compact summary reflects the final settled competition. Round-by-round history is
			intentionally omitted.
		</p>
		<div class="statgrid">
			<div class="stat"><small>Created by</small><strong>Alpha</strong></div>
			<div class="stat"><small>Rounds played</small><strong>10</strong></div>
			<div class="stat"><small>Won by</small><strong>Ava</strong></div>
		</div>
		<div class="table-wrap">
			<table class="table">
				<thead
					><tr><th>Player</th><th>Winning rounds</th><th>Win rate</th><th>Points</th></tr></thead
				>
				<tbody>
					{#each standings as standing (standing.player)}
						<tr
							><td><PlayerName profile={profileFor(standing.player)} /></td><td
								>{standing.rounds}</td
							><td>{standing.winRate}</td><td><strong>{standing.points}</strong></td></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
		<span class="pill" style="margin-top: 22px">24 PLAYERS</span>
	</section>
</main>

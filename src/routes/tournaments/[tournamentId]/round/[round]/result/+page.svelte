<script lang="ts">
	import { resolve } from '$app/paths';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import PlayerName from '$lib/market-rivals/PlayerName.svelte';
	import { profileFor, roundStandings } from '$lib/market-rivals/data';
</script>

<svelte:head><title>Round Result | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap">
	<section class="narrow">
		<div class="lobby-ring">
			<div class="arena-ring">
				<div class="ring-copy">
					<small>Settled</small><strong>UP</strong><small class="positive">+$0.54</small>
				</div>
			</div>
		</div>
		<div class="eyebrow">You won the round</div>
		<h1>Nice call. You moved to #2.</h1>
		<p class="sub">BTC settled above its opening price. Your Up position won this round.</p>
		<div class="table-wrap">
			<table class="table">
				<thead><tr><th>Rank</th><th>Player</th><th>Pick</th><th>Round</th><th>Total</th></tr></thead
				>
				<tbody>
					{#each roundStandings as standing (standing.player)}
						<tr
							><td class="rank">#{standing.rank}</td><td
								><PlayerName profile={profileFor(standing.player)} /></td
							><td>{standing.pick}</td><td class="positive">{standing.round}</td><td
								><strong>{standing.total}</strong></td
							></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="actions" style="justify-content: center; margin-top: 24px">
			<a class="btn primary" href={resolve('/tournaments/alpha-weekend/round/2/arena')}
				>Continue to round 2</a
			>
			<a class="btn ghost" href={resolve('/tournaments/alpha-weekend/final')}
				>Preview final result</a
			>
		</div>
	</section>
</main>

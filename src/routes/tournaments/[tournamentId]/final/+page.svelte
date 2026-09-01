<script lang="ts">
	import { resolve } from '$app/paths';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import { finalStandings } from '$lib/market-rivals/data';
</script>

<svelte:head><title>Final Result | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap">
	<section class="narrow">
		<div class="eyebrow">Tournament complete · 10 rounds</div>
		<h1>Alpha's Weekend Arena</h1>
		<p class="sub">Final standings are confirmed from settled DreamDEX outcomes.</p>
		<div class="podium">
			<div class="podium-item">
				<span class="medal">Silver</span><strong>Alpha</strong><small>720 pts</small>
			</div>
			<div class="podium-item first">
				<span class="medal">Gold</span><strong>Ava</strong><small>810 pts · 8 winning rounds</small>
			</div>
			<div class="podium-item">
				<span class="medal">Bronze</span><strong>Zoe</strong><small>650 pts</small>
			</div>
		</div>
		<div class="table-wrap">
			<table class="table">
				<thead
					><tr><th>Player</th><th>Winning rounds</th><th>Win rate</th><th>Points</th></tr></thead
				>
				<tbody>
					{#each finalStandings as standing (standing.player)}
						<tr
							><td>{standing.player}</td><td>{standing.rounds}</td><td>{standing.winRate}</td><td
								><strong>{standing.points}</strong></td
							></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="actions" style="justify-content: center; margin-top: 24px">
			<a class="btn primary" href={resolve('/tournaments/create')}>Run it back</a>
			<a class="btn ghost" href={resolve('/dashboard')}>Explore tournaments</a>
		</div>
	</section>
</main>

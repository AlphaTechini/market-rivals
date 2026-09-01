<script lang="ts">
	import { resolve } from '$app/paths';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
</script>

<svelte:head><title>Position Locked | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap">
	<section class="narrow">
		<div class="eyebrow">Position confirmed on DreamDEX</div>
		<h1>Waiting for settlement</h1>
		<p class="sub">Waiting for this BTC market window to settle.</p>
		<div class="lobby-ring">
			<div class="arena-ring">
				<div class="ring-copy">
					<small>Market closes in</small><strong>08:42</strong><small>BTC / USD</small>
				</div>
			</div>
		</div>
		<div class="notice">
			<p>Your position is locked: <strong>UP · 1 contract · 1 USDso maximum risk</strong></p>
		</div>
		<div class="statgrid">
			<div class="stat"><small>Opening price</small><strong>$66,801</strong></div>
			<div class="stat"><small>Current price</small><strong>$66,842</strong></div>
			<div class="stat"><small>Movement</small><strong class="positive">+0.06%</strong></div>
		</div>
		<p class="fine">Competitors' selections are revealed after trading closes.</p>
		<a class="btn primary" href={resolve('/tournaments/alpha-weekend/round/1/result')}
			>Simulate settlement</a
		>
	</section>
</main>

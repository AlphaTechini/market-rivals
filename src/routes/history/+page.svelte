<script lang="ts">
	import { resolve } from '$app/paths';
	import AppTabs from '$lib/market-rivals/AppTabs.svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
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

	<section class="grid" aria-label="Past tournaments">
		<article class="card tournament">
			<div class="meta"><span class="pill">ENDED AUG 29</span><span>BTC</span></div>
			<div class="asset">Friday Night Calls</div>
			<p>Won by Ava · 10 rounds · created by Alpha</p>
			<div class="bottom">
				<span class="fine" style="margin: 0">24 players</span><a
					class="btn"
					href={resolve('/history/friday-night-calls')}>View summary -></a
				>
			</div>
		</article>
		<article class="card tournament">
			<div class="meta"><span class="pill">ENDED AUG 26</span><span>ETH</span></div>
			<div class="asset">ETH Night Shift</div>
			<p>Won by Zoe · 8 rounds · created by Milo</p>
			<div class="bottom">
				<span class="fine" style="margin: 0">12 players</span><a
					class="btn"
					href={resolve('/history/eth-night-shift')}>View summary -></a
				>
			</div>
		</article>
		<article class="card tournament">
			<div class="meta"><span class="pill">ENDED AUG 22</span><span>BTC</span></div>
			<div class="asset">First Light Cup</div>
			<p>Won by Alpha · 20 rounds · created by Noah</p>
			<div class="bottom">
				<span class="fine" style="margin: 0">32 players</span><a
					class="btn"
					href={resolve('/history/first-light-cup')}>View summary -></a
				>
			</div>
		</article>
	</section>
</main>

<script lang="ts">
	import { resolve } from '$app/paths';
	import ArenaRing from '$lib/market-rivals/ArenaRing.svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
</script>

<svelte:head>
	<title>Market Rivals | Read the market. Beat your rivals.</title>
	<meta
		name="description"
		content="Competitive, multi-round BTC and ETH prediction tournaments powered by DreamDEX Event Contracts."
	/>
</svelte:head>

<BrandHeader mode="landing" />

<main>
	<section class="wrap hero">
		<div>
			<div class="eyebrow">Real markets. Friendly rivalries.</div>
			<h1>Call the market.<br /><span>Outplay your circle.</span></h1>
			<p class="lead">
				Turn DreamDEX BTC and ETH Event Contracts into fast social tournaments. Make real Up or Down
				positions, win rounds, climb the table, and prove who reads the market best.
			</p>
			<div class="actions" style="margin-top: 30px">
				<a class="btn primary" href={resolve('/dashboard')}>Enter the arena</a>
				<a class="btn ghost" href={resolve('/#how')}>See how it works</a>
			</div>
			<p class="fine">Non-custodial · Capped risk · On-chain settlement on Somnia</p>
		</div>
		<div class="hero-visual">
			<ArenaRing label="Round closes in" value="00:27" detail="BTC / USD · $66,842" />
		</div>
	</section>

	<section class="section" id="how">
		<div class="wrap">
			<div class="eyebrow">The format</div>
			<h2>Simple calls. Better competition.</h2>
			<p class="sub">
				No complicated charts required. Each tournament contains multiple timed DreamDEX rounds,
				giving skill and consistency more room to matter than one lucky guess.
			</p>
			<div class="grid">
				<article class="card">
					<span class="num">01</span>
					<h3>Join an arena</h3>
					<p>Enter a public competition or follow a private invite from a friend.</p>
				</article>
				<article class="card">
					<span class="num">02</span>
					<h3>Choose Up or Down</h3>
					<p>Take a real BTC or ETH Event Contract position before each timer closes.</p>
				</article>
				<article class="card">
					<span class="num">03</span>
					<h3>Climb the leaderboard</h3>
					<p>Earn points from settled outcomes and build a forecasting reputation.</p>
				</article>
			</div>
		</div>
	</section>

	<section class="section" id="why">
		<div class="wrap why">
			<div>
				<div class="eyebrow">Why compete</div>
				<h2>A market becomes more memorable when your reputation is involved.</h2>
			</div>
			<div>
				<p class="lead">
					Market Rivals adds the social layer around objective, recurring DreamDEX markets: public
					discovery, private rooms, and multi-round scoring that rewards consistency.
				</p>
				<a class="btn primary" href={resolve('/dashboard')}>Connect and compete</a>
			</div>
		</div>
	</section>
</main>

<footer class="wrap footer">
	<span>Market Rivals · Powered by DreamDEX Event Contracts</span>
	<span>Shannon testnet prototype</span>
</footer>

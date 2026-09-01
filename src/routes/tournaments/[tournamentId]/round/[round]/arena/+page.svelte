<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import PlayerList from '$lib/market-rivals/PlayerList.svelte';
	import { roundPlayers } from '$lib/market-rivals/data';

	let selectedSide: 'UP' | 'DOWN' | null = $state(null);

	function confirmPrediction() {
		if (selectedSide) void goto(resolve('/tournaments/alpha-weekend/round/1/locked'));
	}
</script>

<svelte:head><title>Round 1 | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap split">
	<section class="mainpanel">
		<div class="meta">
			<div class="eyebrow" style="margin: 0">BTC / USD · DreamDEX 15m window</div>
			<span class="pill"><i class="dot"></i> TRADING · Round 1 / 10</span>
		</div>
		<div class="market-line" style="margin-top: 34px">
			<div class="price">$66,842.17</div>
			<div class="timer">00:27</div>
		</div>
		<h1 class="question">Will BTC close at or above its opening price?</h1>

		<div class="choice" aria-label="Choose your prediction">
			<button
				class:selected={selectedSide === 'UP'}
				class="up"
				type="button"
				aria-pressed={selectedSide === 'UP'}
				onclick={() => (selectedSide = 'UP')}
			>
				<strong>^ UP</strong><span>0.54 USDso</span>
			</button>
			<button
				class:selected={selectedSide === 'DOWN'}
				class="down"
				type="button"
				aria-pressed={selectedSide === 'DOWN'}
				onclick={() => (selectedSide = 'DOWN')}
			>
				<strong>v DOWN</strong><span>0.46 USDso</span>
			</button>
		</div>

		{#if selectedSide}
			<div class="confirm">
				<p>You chose <strong>{selectedSide}</strong> · Estimated position: 1 contract</p>
				<button class="btn primary" type="button" onclick={confirmPrediction}
					>Confirm 1 USDso position</button
				>
			</div>
		{/if}

		<p class="fine">Prices and settlement are supplied by DreamDEX. Maximum loss: 1 USDso.</p>
	</section>

	<aside class="side">
		<h3>Round status</h3>
		<div class="meta" style="margin-bottom: 14px">
			<strong>3 / 6 picked</strong><span>Hidden picks</span>
		</div>
		<PlayerList players={roundPlayers} />
		<p class="fine">Other directions stay hidden until trading closes.</p>
	</aside>
</main>

<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { onDestroy, onMount } from 'svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import Countdown from '$lib/market-rivals/Countdown.svelte';
	import PlayerList from '$lib/market-rivals/PlayerList.svelte';
	import { fetchArenaSummary, isUuid, submitArenaPick } from '$lib/market-rivals/api';
	import { roundPlayers } from '$lib/market-rivals/data';
	import {
		prepareLiveBinaryTrade,
		placeMarketIocPrediction,
		type LiveBinaryTradeContext
	} from '$lib/dreamdex/trading';

	let selectedSide: 'UP' | 'DOWN' | null = $state(null);
	let trade = $state<LiveBinaryTradeContext | null>(null);
	let marketLoading = $state(true);
	let submitting = $state(false);
	let marketError = $state('');
	let orderError = $state('');
	let transactionHash = $state('');
	let arenaId = $derived(page.params.tournamentId);
	let roundNumber = $derived(Number(page.params.round ?? '1'));

	onMount(async () => {
		try {
			const id = arenaId;
			if (!id || !isUuid(id)) {
				marketError = 'Open an arena created through the live dashboard before trading.';
				return;
			}
			const summary = await fetchArenaSummary(id);
			const asset = summary.arena.asset;
			trade = await prepareLiveBinaryTrade(asset);
		} catch (cause) {
			marketError =
				cause instanceof Error ? cause.message : 'Live DreamDEX market could not be loaded.';
		} finally {
			marketLoading = false;
		}
	});

	onDestroy(() => {
		if (trade) void trade.exchange.close();
	});

	async function confirmPrediction() {
		if (!selectedSide || !trade || !arenaId || !isUuid(arenaId)) {
			orderError = 'Open a real tournament from the live dashboard before submitting a prediction.';
			return;
		}

		submitting = true;
		orderError = '';
		try {
			const placed = await placeMarketIocPrediction(trade, selectedSide);
			transactionHash = placed.transactionHash;
			await submitArenaPick({
				arenaId,
				roundNumber,
				marketId: placed.marketId,
				marketSymbol: placed.marketSymbol,
				direction: placed.direction,
				orderTransactionHash: placed.transactionHash,
				filledQuantity: placed.filledQuantity,
				averageFillPrice: placed.averageFillPrice
			});
			await goto(resolve(`/tournaments/${arenaId}/round/${roundNumber}/locked` as Pathname));
		} catch (cause) {
			orderError = cause instanceof Error ? cause.message : 'DreamDEX order submission failed.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Round 1 | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap split">
	<section class="mainpanel">
		<div class="meta">
			<div class="eyebrow" style="margin: 0">
				{trade ? `${trade.question} · DreamDEX Event Contract` : 'DreamDEX Event Contract'}
			</div>
			<span class="pill"
				><i class:offline={marketLoading || !!marketError} class="dot"></i>
				{marketLoading ? 'LOADING' : marketError ? 'UNAVAILABLE' : 'TRADING'} · Round {roundNumber}</span
			>
		</div>
		<div class="market-line" style="margin-top: 34px">
			<div class="price">
				{trade
					? `${trade.upPrice?.toFixed(4) ?? '-'} / ${trade.downPrice?.toFixed(4) ?? '-'}`
					: 'Loading'}
			</div>
			<Countdown initialSeconds={27} />
		</div>
		<h1 class="question">{trade?.question ?? 'Loading the live Up or Down market...'}</h1>

		<div class="choice" aria-label="Choose your prediction">
			<button
				class:selected={selectedSide === 'UP'}
				class="up"
				type="button"
				disabled={!trade || marketLoading}
				aria-pressed={selectedSide === 'UP'}
				onclick={() => (selectedSide = 'UP')}
			>
				<strong>^ UP</strong><span>{trade?.upPrice?.toFixed(4) ?? '-'} USDso</span>
			</button>
			<button
				class:selected={selectedSide === 'DOWN'}
				class="down"
				type="button"
				disabled={!trade || marketLoading}
				aria-pressed={selectedSide === 'DOWN'}
				onclick={() => (selectedSide = 'DOWN')}
			>
				<strong>v DOWN</strong><span>{trade?.downPrice?.toFixed(4) ?? '-'} USDso</span>
			</button>
		</div>

		{#if selectedSide}
			<div class="confirm">
				<p>
					You chose <strong>{selectedSide}</strong> · Position: {trade?.contractQuantity ?? 10} contracts
				</p>
				<button
					class="btn primary"
					type="button"
					disabled={submitting || marketLoading}
					onclick={confirmPrediction}
				>
					{submitting ? 'Waiting for receipt...' : 'Sign Market IOC order'}
				</button>
			</div>
		{/if}

		{#if marketError}<p class="form-error">{marketError}</p>{/if}
		{#if orderError}<p class="form-error">{orderError}</p>{/if}
		{#if transactionHash}<p class="notice">
				<strong>Receipt verified:</strong>
				{transactionHash}
			</p>{/if}
		<p class="fine">
			Prices and settlement are supplied by DreamDEX. The browser wallet signs the order; the server
			stores the verified receipt and fill evidence.
		</p>
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

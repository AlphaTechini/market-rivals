<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onDestroy, onMount } from 'svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import Countdown from '$lib/market-rivals/Countdown.svelte';
	import PlayerList from '$lib/market-rivals/PlayerList.svelte';
	import {
		fetchRoundDetail,
		isUuid,
		submitArenaPick,
		type RoundDetail
	} from '$lib/market-rivals/api';
	import {
		prepareLiveBinaryTrade,
		prepareRoundTrade,
		placeMarketIocPrediction,
		type LiveBinaryTradeContext
	} from '$lib/dreamdex/trading';

	let selectedSide: 'UP' | 'DOWN' | null = $state(null);
	let confirmingSide: 'UP' | 'DOWN' | null = $state(null);
	let changeMode = $state(false);
	let trade = $state<LiveBinaryTradeContext | null>(null);
	let roundDetail = $state<RoundDetail | null>(null);
	let marketLoading = $state(true);
	let submitting = $state(false);
	let marketError = $state('');
	let orderError = $state('');
	let transactionHash = $state('');
	let arenaId = $derived(page.params.tournamentId);
	let roundNumber = $derived(Number(page.params.round ?? '1'));
	let validArenaId = $derived(Boolean(arenaId && isUuid(arenaId)));

	onMount(async () => {
		try {
			const id = arenaId;
			if (!id || !isUuid(id)) {
				marketError = 'Open an arena created through the live dashboard before trading.';
				return;
			}

			const round = await fetchRoundDetail(id, roundNumber);
			roundDetail = round;

			if (round.round.status === 'LOCKED') {
				await goto(resolve(...([`/tournaments/${id}/round/${roundNumber}/locked`] as never)));
				return;
			}
			if (round.round.status === 'SETTLED' || round.round.status === 'VOIDED') {
				await goto(resolve(...([`/tournaments/${id}/round/${roundNumber}/result`] as never)));
				return;
			}

			trade = round.round.dreamDexMarketId
				? await prepareRoundTrade(round.round.dreamDexMarketId)
				: await prepareLiveBinaryTrade(round.round.asset);
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

	async function refreshRound() {
		if (!validArenaId) return;
		try {
			roundDetail = await fetchRoundDetail(arenaId!, roundNumber);
		} catch {
			// keep showing the previous round state
		}
	}

	function requestConfirm(side: 'UP' | 'DOWN') {
		selectedSide = side;
		confirmingSide = side;
	}

	async function confirmPrediction() {
		if (!confirmingSide || !trade || !validArenaId) {
			orderError = 'Open a real tournament from the live dashboard before submitting a prediction.';
			return;
		}

		submitting = true;
		orderError = '';
		try {
			const placed = await placeMarketIocPrediction(trade, confirmingSide);
			transactionHash = placed.transactionHash;
			await submitArenaPick({
				arenaId: arenaId!,
				roundNumber,
				marketId: placed.marketId,
				marketSymbol: placed.marketSymbol,
				direction: placed.direction,
				orderTransactionHash: placed.transactionHash,
				filledQuantity: placed.filledQuantity,
				averageFillPrice: placed.averageFillPrice
			});
			await refreshRound();
		} catch (cause) {
			orderError = cause instanceof Error ? cause.message : 'DreamDEX order submission failed.';
			await refreshRound();
		} finally {
			submitting = false;
			confirmingSide = null;
			changeMode = false;
		}
	}

	function projectedFor(side: 'UP' | 'DOWN'): string {
		const price = side === 'UP' ? trade?.upPrice : trade?.downPrice;
		if (price === null || price === undefined) return '-';
		const win = (1 - price) * 100;
		const lose = -price * 100;
		return `${win >= 0 ? '+' : ''}${win.toFixed(0)} if right · ${lose.toFixed(0)} if wrong`;
	}

	let myPick = $derived(roundDetail?.myPick ?? null);
	let votesClosed = $derived(
		Boolean(roundDetail && Date.now() >= new Date(roundDetail.pickDeadline).getTime())
	);
	let picksOpen = $derived.by(() => {
		if (!roundDetail || votesClosed) return false;
		if (!myPick || myPick.status !== 'CONFIRMED') return true;
		return changeMode && roundDetail.canChange;
	});
	let participants = $derived(
		roundDetail?.standings.map((standing) => ({
			name: standing.displayName,
			initials: standing.displayName.slice(0, 2).toUpperCase(),
			avatarUrl: standing.avatarUrl ?? undefined,
			status: 'Choosing'
		})) ?? []
	);
</script>

<svelte:head><title>Round {roundNumber} | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap split">
	<section class="mainpanel">
		<div class="meta">
			<div class="eyebrow" style="margin: 0">
				{trade ? `${trade.question} · DreamDEX Event Contract` : 'DreamDEX Event Contract'}
			</div>
			<span class="pill"
				><i class:offline={marketLoading || !!marketError} class="dot"></i>
				{marketLoading
					? 'LOADING'
					: marketError
						? 'UNAVAILABLE'
						: votesClosed
							? 'PICKS CLOSED'
							: 'VOTING'} · Round {roundNumber} · {roundDetail?.round.asset ?? ''}</span
			>
		</div>
		<div class="market-line" style="margin-top: 34px">
			<div class="price">
				{trade
					? `${trade.upPrice?.toFixed(4) ?? '-'} / ${trade.downPrice?.toFixed(4) ?? '-'}`
					: 'Loading'}
			</div>
			{#if roundDetail}
				<Countdown targetAt={roundDetail.pickDeadline} />
			{:else}
				<Countdown initialSeconds={30} />
			{/if}
		</div>
		<h1 class="question">{trade?.question ?? 'Loading the live Up or Down market...'}</h1>

		{#if myPick?.status === 'CONFIRMED'}
			<div class="notice">
				<p>
					Your position: <strong>{myPick.selectedSide} · {myPick.filledQuantity} contracts</strong>
					{#if myPick.averageFillPrice}
						· filled at {Number(myPick.averageFillPrice).toFixed(4)} USDso
					{/if}
					{#if myPick.changed}
						· changed from your first pick
					{/if}
				</p>
				{#if roundDetail?.canChange && !changeMode}
					<button class="btn" type="button" onclick={() => (changeMode = true)}>
						Change pick (allowed until {roundDetail.changeDeadline
							? new Date(roundDetail.changeDeadline).toLocaleTimeString()
							: '-'})
					</button>
				{:else if !roundDetail?.canChange && !changeMode}
					<p class="fine">The change window for your pick has closed.</p>
				{/if}
			</div>
		{:else if votesClosed}
			<div class="notice">
				<p>Picks are closed; less than one minute remained before the DreamDEX window.</p>
			</div>
		{/if}

		{#if picksOpen}
			<div class="choice" aria-label="Choose your prediction">
				<button
					class:selected={selectedSide === 'UP'}
					class="up"
					type="button"
					disabled={!trade || marketLoading}
					aria-pressed={selectedSide === 'UP'}
					onclick={() => requestConfirm('UP')}
				>
					<strong>^ UP</strong><span>{trade?.upPrice?.toFixed(4) ?? '-'} USDso</span>
				</button>
				<button
					class:selected={selectedSide === 'DOWN'}
					class="down"
					type="button"
					disabled={!trade || marketLoading}
					aria-pressed={selectedSide === 'DOWN'}
					onclick={() => requestConfirm('DOWN')}
				>
					<strong>v DOWN</strong><span>{trade?.downPrice?.toFixed(4) ?? '-'} USDso</span>
				</button>
			</div>
		{/if}

		{#if confirmingSide}
			<div class="confirm">
				<p>
					Confirm <strong>{confirmingSide}</strong> for {trade?.contractQuantity ?? 10} contracts?
					{changeMode ? 'This replaces your current pick.' : ''}
				</p>
				<p class="fine">{projectedFor(confirmingSide)} pts</p>
				<div class="actions">
					<button
						class="btn primary"
						type="button"
						disabled={submitting || marketLoading}
						onclick={confirmPrediction}
					>
						{submitting ? 'Waiting for receipt...' : 'Yes, sign Market IOC order'}
					</button>
					<button
						class="btn ghost"
						type="button"
						disabled={submitting}
						onclick={() => (confirmingSide = null)}
					>
						Cancel
					</button>
				</div>
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
			stores the verified receipt and fill evidence. Your final pick before the cut is the one that
			scores.
		</p>
	</section>

	<aside class="side">
		<h3>Round status</h3>
		<div class="meta" style="margin-bottom: 14px">
			<strong
				>{roundDetail
					? `${roundDetail.pickedCount} / ${roundDetail.participantCount} picked`
					: 'Loading'}</strong
			><span>Hidden picks</span>
		</div>
		{#if participants.length}
			<PlayerList players={participants} />
		{/if}
		<p class="fine">Other directions stay hidden until voting closes.</p>
	</aside>
</main>

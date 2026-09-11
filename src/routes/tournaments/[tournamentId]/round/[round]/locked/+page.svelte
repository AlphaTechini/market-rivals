<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onDestroy, onMount } from 'svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import Countdown from '$lib/market-rivals/Countdown.svelte';
	import {
		explorerTransactionUrl,
		fetchRoundDetail,
		isUuid,
		type RoundDetail
	} from '$lib/market-rivals/api';

	let roundDetail = $state<RoundDetail | null>(null);
	let loading = $state(true);
	let error = $state('');
	let now = $state(Date.now());
	let lastDeadlineCheck = 0;
	let arenaId = $derived(page.params.tournamentId);
	let roundNumber = $derived(Number(page.params.round ?? '1'));
	let settlementAt = $derived(
		roundDetail?.round.marketExpiresAt ??
			(roundDetail
				? new Date(new Date(roundDetail.round.locksAt).getTime() + 9 * 60 * 1000).toISOString()
				: null)
	);

	const pollMs = 15000;
	let pollTimer: number | undefined;

	async function checkRound() {
		const id = arenaId;
		if (!id || !isUuid(id)) return;
		try {
			const detail = await fetchRoundDetail(id, roundNumber);
			roundDetail = detail;
			if (detail.round.status === 'SETTLED' || detail.round.status === 'VOIDED') {
				if (pollTimer) window.clearInterval(pollTimer);
				await goto(resolve(...([`/tournaments/${id}/round/${roundNumber}/result`] as never)));
			}
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Round state could not be loaded.';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		const id = arenaId;
		if (!id || !isUuid(id)) {
			error = 'Open a real tournament from the live dashboard.';
			loading = false;
			return;
		}

		await checkRound();
		pollTimer = window.setInterval(() => void checkRound(), pollMs);
	});

	onMount(() => {
		const tick = window.setInterval(() => (now = Date.now()), 1_000);
		return () => window.clearInterval(tick);
	});

	$effect(() => {
		if (!settlementAt || !roundDetail) return;
		if (now < new Date(settlementAt).getTime()) return;
		if (Date.now() - lastDeadlineCheck < 5_000) return;
		lastDeadlineCheck = Date.now();
		void checkRound();
	});

	onDestroy(() => {
		if (pollTimer) window.clearInterval(pollTimer);
	});
</script>

<svelte:head><title>Position Locked | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap">
	<section class="narrow">
		<div class="eyebrow">
			{roundDetail?.myPick ? 'Position confirmed on DreamDEX' : 'Round locked'} · Round {roundNumber}
			· {roundDetail?.round.asset ?? ''}
		</div>
		<h1>Waiting for settlement</h1>
		<p class="sub">
			{roundDetail?.round.marketSymbol ?? 'This market window'} has locked. DreamDEX settles the outcome
			on-chain.
		</p>
		<div class="lobby-ring">
			<div class="arena-ring">
				<div class="ring-copy">
					<small>Window closes in</small>
					<strong>
						{#if settlementAt}<Countdown targetAt={settlementAt} />{:else}--:--{/if}
					</strong>
					<small>Somnia · DreamDEX</small>
				</div>
			</div>
		</div>

		{#if roundDetail?.myPick}
			<div class="notice">
				<p>
					Your locked position: <strong
						>{roundDetail.myPick.selectedSide} · {roundDetail.myPick.filledQuantity} contracts</strong
					>
					{#if roundDetail.myPick.averageFillPrice}
						· filled at {Number(roundDetail.myPick.averageFillPrice).toFixed(4)} USDso
					{/if}
					{#if roundDetail.myPick.changed}
						· changed from your first pick
					{/if}
				</p>
			</div>
		{:else}
			<div class="notice">
				<p>No confirmed position this round. It will count as a missed round.</p>
			</div>
		{/if}

		{#if roundDetail?.stage}
			<div class="card" style="text-align: left">
				<div class="meta"><strong>Match stage</strong></div>
				<p style="margin-top: 10px">{roundDetail.stage.headline}</p>
				<ul style="margin-top: 10px; padding-left: 18px">
					{#each roundDetail.stage.lines as line (line.kind + line.text)}
						<li>{line.text}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if roundDetail?.myPick?.orderTransactionHash}
			<button
				class="btn"
				type="button"
				onclick={() =>
					window.open(
						explorerTransactionUrl(roundDetail!.myPick!.orderTransactionHash!),
						'_blank',
						'noopener,noreferrer'
					)}
			>
				View my transaction on Somnia explorer
			</button>
		{/if}
		{#if loading}<p class="fine">Loading round state...</p>{/if}
		{#if error}<p class="form-error">{error}</p>{/if}
		<p class="fine">This page refreshes every {pollMs / 1000} seconds until DreamDEX settles.</p>
	</section>
</main>

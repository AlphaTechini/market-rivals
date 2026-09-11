<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onDestroy, onMount } from 'svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import PlayerName from '$lib/market-rivals/PlayerName.svelte';
	import {
		explorerTransactionUrl,
		fetchRoundDetail,
		fetchRivalries,
		isUuid,
		profileFromApi,
		type RoundDetail,
		type RivalryRecord
	} from '$lib/market-rivals/api';

	let roundDetail = $state<RoundDetail | null>(null);
	let tiedRival = $state<RivalryRecord | null>(null);
	let loading = $state(true);
	let error = $state('');
	let pollTimer: number | undefined;
	let arenaId = $derived(page.params.tournamentId);
	let roundNumber = $derived(Number(page.params.round ?? '1'));
	let nextRound = $derived(roundNumber + 1);

	onMount(async () => {
		const id = arenaId;
		if (!id || !isUuid(id)) {
			error = 'Open a real tournament from the live dashboard.';
			loading = false;
			return;
		}
		try {
			roundDetail = await fetchRoundDetail(id, roundNumber);
			fetchRivalries()
				.then((result) => (tiedRival = result.tiedRival))
				.catch(() => (tiedRival = null));
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Round result could not be loaded.';
		} finally {
			loading = false;
		}

		pollTimer = window.setInterval(() => {
			const currentId = arenaId;
			if (!currentId || !isUuid(currentId)) return;
			void fetchRoundDetail(currentId, roundNumber)
				.then((detail) => {
					roundDetail = detail;
					if (detail.round.status === 'SETTLED' || detail.round.status === 'VOIDED') {
						if (pollTimer) window.clearInterval(pollTimer);
					}
				})
				.catch(() => undefined);
		}, 10_000);
	});

	onDestroy(() => {
		if (pollTimer) window.clearInterval(pollTimer);
	});

	let isVoid = $derived(roundDetail?.round.status === 'VOIDED');
	let isSettled = $derived(roundDetail?.round.status === 'SETTLED');
	let winningSide = $derived(roundDetail?.round.winningSide ?? null);
	let myOutcome = $derived.by(() => {
		const pick = roundDetail?.myPick;
		if (!roundDetail || !isSettled) return null;
		if (isVoid) return 'void';
		if (!pick || pick.status !== 'CONFIRMED') return 'missed';
		return pick.selectedSide === winningSide ? 'won' : 'lost';
	});
	let headline = $derived.by(() => {
		switch (myOutcome) {
			case 'won':
				return 'Nice call. You won this round.';
			case 'lost':
				return 'Wrong side. Shake it off.';
			case 'missed':
				return 'You missed this round. -100 points.';
			case 'void':
				return 'DreamDEX voided this market. No points awarded.';
			default:
				return 'Settlement is still pending.';
		}
	});

	let resultRows = $derived.by(() => {
		if (!roundDetail) return [];
		const picksByParticipant = new Map(roundDetail.picks.map((pick) => [pick.participantId, pick]));
		return roundDetail.standings.map((standing) => ({
			profile: profileFromApi({
				id: standing.participantId,
				displayName: standing.displayName,
				walletAddress: standing.walletAddress,
				avatarUrl: standing.avatarUrl
			}),
			rank: standing.rank,
			pick: picksByParticipant.get(standing.participantId)?.selectedSide ?? '-',
			changedPick: picksByParticipant.get(standing.participantId)?.changed ?? false,
			roundScore: picksByParticipant.get(standing.participantId)?.roundScore ?? null,
			total: Number(standing.totalScore)
		}));
	});
</script>

<svelte:head><title>Round Result | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap">
	<section class="narrow">
		<div class="lobby-ring">
			<div class="arena-ring">
				<div class="ring-copy">
					<small>{isVoid ? 'Voided' : 'Settled'}</small>
					<strong>{isVoid ? 'VOID' : (winningSide ?? 'PENDING')}</strong>
					<small>Round {roundNumber} · {roundDetail?.round.asset ?? ''}</small>
				</div>
			</div>
		</div>
		<div class="eyebrow">
			{#if isVoid}
				DreamDEX voided the market
			{:else if isSettled}
				DreamDEX settlement confirmed
			{:else}
				Waiting for DreamDEX
			{/if}
		</div>
		<h1>{headline}</h1>

		{#if tiedRival}
			<div class="notice">
				<p>
					You are tied with <strong>{tiedRival.displayName}</strong> ({tiedRival.wins}-
					{tiedRival.losses}-{tiedRival.ties}). Win the next round to come out on top.
				</p>
			</div>
		{/if}

		{#if roundDetail?.stage}
			<div class="card" style="text-align: left">
				<div class="meta"><strong>Round recap</strong></div>
				<p style="margin-top: 10px">{roundDetail.stage.headline}</p>
				<ul style="margin-top: 10px; padding-left: 18px">
					{#each roundDetail.stage.lines as line (line.kind + line.text)}
						<li>{line.text}</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if isSettled && roundDetail?.round.openingPrice && roundDetail.round.closingPrice}
			<div class="statgrid">
				<div class="stat">
					<small>Opening price</small><strong
						>${Number(roundDetail.round.openingPrice).toLocaleString()}</strong
					>
				</div>
				<div class="stat">
					<small>Closing price</small><strong
						>${Number(roundDetail.round.closingPrice).toLocaleString()}</strong
					>
				</div>
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

		<div class="table-wrap">
			<table class="table">
				<thead><tr><th>Rank</th><th>Player</th><th>Pick</th><th>Round</th><th>Total</th></tr></thead
				>
				<tbody>
					{#each resultRows as row (row.profile.name)}
						<tr
							><td class="rank">#{row.rank}</td><td><PlayerName profile={row.profile} /></td><td
								>{row.pick}{row.changedPick ? ' *' : ''}</td
							><td class={row.roundScore && Number(row.roundScore) > 0 ? 'positive' : ''}
								>{row.roundScore ? Number(row.roundScore).toFixed(1) : '-'}</td
							><td><strong>{row.total.toLocaleString()}</strong></td></tr
						>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="fine">* changed pick after first confirmation; the final pick scores.</p>

		{#if loading}<p class="fine">Loading settled round data...</p>{/if}
		{#if error}<p class="form-error">{error}</p>{/if}

		<div class="actions" style="justify-content: center; margin-top: 24px">
			{#if isSettled || isVoid}
				<a
					class="btn primary"
					href={resolve(
						...([
							arenaId && isUuid(arenaId)
								? `/tournaments/${arenaId}/round/${nextRound}/arena`
								: `/tournaments/${nextRound}/arena`
						] as never)
					)}>Continue to round {nextRound}</a
				>
				<a
					class="btn ghost"
					href={resolve(
						...([
							arenaId && isUuid(arenaId) ? `/tournaments/${arenaId}/final` : '/tournaments/final'
						] as never)
					)}>View standings</a
				>
			{:else}
				<a
					class="btn primary"
					href={resolve(
						...([
							arenaId && isUuid(arenaId)
								? `/tournaments/${arenaId}/round/${roundNumber}/locked`
								: '/tournaments/round/locked'
						] as never)
					)}>Back to settlement wait</a
				>
			{/if}
		</div>
	</section>
</main>

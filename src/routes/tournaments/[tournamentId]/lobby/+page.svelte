<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { onMount } from 'svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import Countdown from '$lib/market-rivals/Countdown.svelte';
	import PlayerList from '$lib/market-rivals/PlayerList.svelte';
	import {
		fetchArenaSummary,
		fetchMyProfile,
		isUuid,
		joinArena,
		profileFromApi,
		type ArenaSummary
	} from '$lib/market-rivals/api';

	let summary = $state<ArenaSummary | null>(null);
	let loading = $state(true);
	let joining = $state(false);
	let joined = $state(false);
	let alreadyParticipant = $state(false);
	let error = $state('');
	let tournamentId = $derived(page.params.tournamentId);
	let inviteParam = $derived(page.url.searchParams.get('invite') ?? undefined);
	let validId = $derived(Boolean(tournamentId && isUuid(tournamentId)));

	onMount(async () => {
		const id = tournamentId;
		if (!id || !isUuid(id)) {
			loading = false;
			return;
		}
		try {
			const [loaded, profile] = await Promise.all([fetchArenaSummary(id), fetchMyProfile()]);
			summary = loaded;
			if (profile) {
				alreadyParticipant = summary.participants.some(
					(participant) => participant.profile.id === profile.id
				);
				joined = alreadyParticipant;
			}
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Arena could not be loaded.';
		} finally {
			loading = false;
		}
	});

	async function joinCurrentArena() {
		const id = tournamentId;
		if (!id || !isUuid(id)) {
			error = 'This arena does not have a backend id.';
			return;
		}
		joining = true;
		error = '';
		try {
			await joinArena(id, inviteParam);
			joined = true;
			summary = await fetchArenaSummary(id);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not join arena.';
		} finally {
			joining = false;
		}
	}

	let players = $derived(
		summary
			? summary.participants.map((participant) => ({
					...profileFromApi(participant.profile),
					status: 'Joined'
				}))
			: []
	);
	let arenaStartsInFuture = $derived(
		summary ? new Date(summary.arena.startAt).getTime() > Date.now() : false
	);
	let rounds = $derived(summary?.arena.roundCount ?? 0);
</script>

<svelte:head><title>Tournament Lobby | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap">
	<section class="narrow">
		<div class="eyebrow">
			Tournament lobby · {summary?.arena.asset ?? 'BTC'}/USD · {summary?.arena.accessType ??
				'PUBLIC'}
		</div>
		<h1>{summary?.arena.name ?? 'Arena lobby'}</h1>
		<p class="sub">
			{summary?.arena.description ??
				'The arena starts automatically at its scheduled time. DreamDEX binds each round to a live market window.'}
		</p>
		<div class="lobby-ring">
			<div class="arena-ring">
				<div class="ring-copy">
					{#if summary && arenaStartsInFuture}
						<small>Tournament starts at</small>
						<strong><Countdown targetAt={summary.arena.startAt} /></strong>
						<small>{new Date(summary.arena.startAt).toLocaleString()}</small>
					{:else if summary}
						<small>Tournament status</small>
						<strong>{summary.arena.status}</strong>
						<small>{summary.arena.roundCount} rounds</small>
					{:else}
						<small>Tournament starts in</small>
						<strong>--:--</strong>
						<small>{rounds} rounds</small>
					{/if}
				</div>
			</div>
		</div>
		<div class="statgrid">
			<div class="stat"><small>Asset</small><strong>{summary?.arena.asset ?? '-'}</strong></div>
			<div class="stat">
				<small>Players</small><strong
					>{summary?.participants.length ?? 0} / {summary?.arena.maximumParticipants ?? 0}</strong
				>
			</div>
			<div class="stat">
				<small>Hosted by</small><strong>{summary?.host?.displayName ?? '-'}</strong>
			</div>
		</div>
		{#if summary?.inviteCode}
			<div class="notice">
				<p>Your host invite code: <strong>{summary.inviteCode}</strong></p>
			</div>
		{/if}
		<div class="card" style="text-align: left">
			<div class="meta">
				<strong>Players</strong><span class="pill"
					><i class="dot"></i>
					{summary ? `${summary.participants.length} joined` : 'Loading'}</span
				>
			</div>
			<div style="margin-top: 14px">
				{#if players.length}
					<PlayerList {players} />
				{/if}
			</div>
		</div>
		{#if loading}<p class="fine">Loading player data...</p>{/if}
		{#if error}<p class="form-error">{error}</p>{/if}
		<div class="actions" style="justify-content: center; margin-top: 22px">
			{#if validId}
				<button
					class="btn primary"
					type="button"
					disabled={joining || joined}
					onclick={joinCurrentArena}
				>
					{joined
						? 'You are in the arena'
						: joining
							? 'Joining...'
							: alreadyParticipant
								? 'Joined'
								: 'Join arena'}
				</button>
				<a
					class="btn primary"
					href={resolve(`/tournaments/${tournamentId}/round/1/arena` as Pathname)}
					>{summary?.arena.status === 'LIVE' ? 'Open round 1' : 'Preview round 1'}</a
				>
			{:else}
				<a class="btn primary" href={resolve('/dashboard')}>Browse live arenas</a>
			{/if}
		</div>
	</section>
</main>

<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import Countdown from '$lib/market-rivals/Countdown.svelte';
	import PlayerList from '$lib/market-rivals/PlayerList.svelte';
	import {
		fetchArenaSummary,
		isUuid,
		joinArena,
		profileFromApi,
		type ArenaSummary
	} from '$lib/market-rivals/api';
	import { lobbyPlayers } from '$lib/market-rivals/data';

	let summary = $state<ArenaSummary | null>(null);
	let loading = $state(true);
	let joining = $state(false);
	let joined = $state(false);
	let error = $state('');
	let tournamentId = $derived(page.params.tournamentId);
	let players = $derived(
		summary
			? summary.participants.map((participant) => ({
					...profileFromApi(participant.profile),
					status: 'Joined'
				}))
			: lobbyPlayers
	);

	onMount(async () => {
		const id = tournamentId;
		if (!id || !isUuid(id)) {
			loading = false;
			return;
		}
		try {
			summary = await fetchArenaSummary(id);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Arena could not be loaded.';
		} finally {
			loading = false;
		}
	});

	async function joinCurrentArena() {
		const id = tournamentId;
		if (!id || !isUuid(id)) {
			error = 'This demo arena does not have a backend id yet.';
			return;
		}
		joining = true;
		error = '';
		try {
			await joinArena(id);
			joined = true;
			summary = await fetchArenaSummary(id);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Could not join arena.';
		} finally {
			joining = false;
		}
	}
</script>

<svelte:head><title>Tournament Lobby | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap">
	<section class="narrow">
		<div class="eyebrow">Tournament lobby · {summary?.arena.asset ?? 'BTC'}/USD</div>
		<h1>{summary?.arena.name ?? "Alpha's Weekend Arena"}</h1>
		<p class="sub">The host starts the arena when everyone is ready.</p>
		<div class="lobby-ring">
			<div class="arena-ring">
				<div class="ring-copy">
					<small>Tournament starts in</small><strong><Countdown initialSeconds={258} /></strong
					><small>{summary?.arena.roundCount ?? 10} ROUNDS · 1 USDso EACH</small>
				</div>
			</div>
		</div>
		<div class="statgrid">
			<div class="stat"><small>Asset</small><strong>{summary?.arena.asset ?? 'BTC'}</strong></div>
			<div class="stat">
				<small>Players</small><strong
					>{summary?.participants.length ?? 6} / {summary?.arena.maximumParticipants ?? 16}</strong
				>
			</div>
			<div class="stat"><small>Visibility</small><strong>Public</strong></div>
		</div>
		<div class="card" style="text-align: left">
			<div class="meta">
				<strong>Players</strong><span class="pill"><i class="dot"></i> 6 ready</span>
			</div>
			<div style="margin-top: 14px"><PlayerList {players} /></div>
		</div>
		{#if loading}<p class="fine">Loading player data...</p>{/if}
		{#if error}<p class="form-error">{error}</p>{/if}
		<div class="actions" style="justify-content: center; margin-top: 22px">
			<button
				class="btn primary"
				type="button"
				disabled={joining || joined}
				onclick={joinCurrentArena}
				>{joined ? 'Joined arena' : joining ? 'Joining...' : 'Join arena'}</button
			>
			<a class="btn primary" href={resolve('/tournaments/alpha-weekend/round/1/arena')}
				>Start demo tournament</a
			>
			<a class="btn" href={resolve('/tournaments/alpha-weekend/created')}>Share invite</a>
		</div>
	</section>
</main>

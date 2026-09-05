<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { onMount } from 'svelte';
	import ArenaRing from '$lib/market-rivals/ArenaRing.svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import ShareActions from '$lib/market-rivals/ShareActions.svelte';
	import { fetchArenaSummary, isUuid, type ArenaSummary } from '$lib/market-rivals/api';

	let summary = $state<ArenaSummary | null>(null);
	let loading = $state(true);
	let error = $state('');
	let tournamentId = $derived(page.params.tournamentId);

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
</script>

<svelte:head><title>Arena Created | Market Rivals</title></svelte:head>

<BrandHeader mode="minimal" actionLabel="Done" />

<main class="wrap">
	<section class="narrow">
		<div class="lobby-ring">
			<ArenaRing
				label="Arena created"
				value={summary?.arena.status === 'CANCELLED' ? 'CANCELLED' : 'READY'}
				detail={summary ? `${summary.arena.asset} / USD` : 'BTC / USD'}
			/>
		</div>
		<div class="eyebrow">Arena created</div>
		<h1>{summary?.arena.name ?? 'Your arena'}</h1>
		<p class="sub">
			{#if summary?.arena.accessType === 'PRIVATE'}
				Your private tournament is ready. Only wallets with the invite link below can join.
			{:else}
				Your tournament is ready. Invite your circle now or wait for public players to discover it.
			{/if}
		</p>
		<ShareActions
			arenaId={tournamentId}
			inviteCode={summary?.inviteCode ?? null}
			arenaName={summary?.arena.name ?? 'Market Rivals'}
		/>
		<div class="actions" style="justify-content: center">
			<a
				class="btn primary"
				href={resolve(
					(tournamentId && isUuid(tournamentId)
						? `/tournaments/${tournamentId}/lobby`
						: '/dashboard') as Pathname
				)}>Open tournament lobby</a
			>
			<a class="btn ghost" href={resolve('/dashboard')}>Back to tournaments</a>
		</div>
		{#if loading}<p class="fine">Loading arena...</p>{/if}
		{#if error}<p class="form-error">{error}</p>{/if}
	</section>
</main>

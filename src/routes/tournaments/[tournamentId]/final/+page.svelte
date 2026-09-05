<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import Avatar from '$lib/market-rivals/Avatar.svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import PlayerName from '$lib/market-rivals/PlayerName.svelte';
	import ShareResultsModal from '$lib/market-rivals/ShareResultsModal.svelte';
	import {
		fetchArenaSummary,
		fetchRivalries,
		isUuid,
		profileFromApi,
		type ArenaSummary,
		type RivalryRecord
	} from '$lib/market-rivals/api';

	let summary = $state<ArenaSummary | null>(null);
	let rivalries = $state<RivalryRecord[]>([]);
	let loading = $state(true);
	let error = $state('');
	let shareOpen = $state(false);
	let tournamentId = $derived(page.params.tournamentId);
	let isComplete = $derived(summary?.arena.status === 'COMPLETED');

	onMount(async () => {
		const id = tournamentId;
		if (!id || !isUuid(id)) {
			loading = false;
			return;
		}
		try {
			summary = await fetchArenaSummary(id);
			fetchRivalries()
				.then((result) => (rivalries = result.rivalries))
				.catch(() => (rivalries = []));
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Tournament could not be loaded.';
		} finally {
			loading = false;
		}
	});

	let podiumPlayers = $derived(
		summary
			? summary.participants
					.filter((participant) => participant.finalRank !== null)
					.sort((a, b) => (a.finalRank ?? 99) - (b.finalRank ?? 99))
					.slice(0, 3)
			: []
	);
	let rankedPlayers = $derived(
		summary
			? [...summary.participants].sort(
					(a, b) => (a.finalRank ?? 99) - (b.finalRank ?? 99) || b.rank - a.rank
				)
			: []
	);
	let championTitle = $derived(
		summary
			? summary.achievements.find(
					(achievement) => achievement.participantId === (podiumPlayers[0]?.participantId ?? '')
				)
			: null
	);
	let shareUrl = $derived(`${page.url.origin}/tournaments/${tournamentId ?? ''}/final`);
	let shareText = $derived(
		summary
			? `${championTitle ? `${podiumPlayers[0]?.profile.displayName} won "${summary.arena.name}"` : 'Final standings are in'} on Market Rivals. ${podiumPlayers[0]?.profile.displayName ?? 'Someone'} finished with ${Number(podiumPlayers[0]?.totalScore ?? 0).toLocaleString()} pts. Can you beat that?`
			: 'I finished an on-chain Market Rivals tournament. Can you beat my score?'
	);
	const medals = ['Gold', 'Silver', 'Bronze'];
	function pickLabel(
		participants: Array<{ participantId: string; profile: { displayName: string } }>,
		pick: {
			participantId: string;
			selectedSide: string;
			roundScore: string | null;
			changed: boolean;
			status: string;
		}
	): string {
		if (pick.status !== 'CONFIRMED') return '';
		const name =
			participants.find((p) => p.participantId === pick.participantId)?.profile.displayName ??
			'player';
		const score = pick.roundScore ? Number(pick.roundScore).toFixed(1) : '-';
		return `${name} ${pick.selectedSide} (${score})${pick.changed ? ' *' : ''}`;
	}
</script>

<svelte:head><title>Final Result | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap">
	<section class="narrow">
		<div class="eyebrow">
			{#if summary}
				{summary.arena.asset} · {isComplete
					? 'tournament complete'
					: `tournament ${summary.arena.status.toLowerCase()}`} · {summary.arena.roundCount} rounds
			{:else}
				Tournament standings
			{/if}
		</div>
		<h1>{summary?.arena.name ?? 'Arena standings'}</h1>
		<p class="sub">
			{isComplete
				? 'Final standings are confirmed from settled DreamDEX outcomes.'
				: 'Standings update automatically as DreamDEX settles each round.'}
		</p>

		{#if podiumPlayers.length}
			<div class="podium">
				{#each podiumPlayers as player, index (player.participantId)}
					<div class="podium-item" class:first={player.finalRank === 1}>
						<span class="medal">{medals[index]}</span>
						<Avatar
							name={player.profile.displayName}
							initials={player.profile.displayName.slice(0, 2).toUpperCase()}
							avatarUrl={player.profile.avatarUrl ?? undefined}
							size="small"
						/>
						<strong>{player.profile.displayName}</strong>
						<small
							>{Number(player.totalScore).toLocaleString()} pts · {player.correctRounds} winning rounds</small
						>
					</div>
				{/each}
			</div>
		{/if}

		<div class="table-wrap">
			<table class="table">
				<thead
					><tr><th>Player</th><th>Winning rounds</th><th>Missed</th><th>Points</th><th>Rank</th></tr
					></thead
				>
				<tbody>
					{#each rankedPlayers as player (player.participantId)}
						<tr
							><td><PlayerName profile={profileFromApi(player.profile)} /></td><td
								>{player.correctRounds} / {summary?.arena.roundCount ?? '-'}</td
							><td>{player.missedRounds}</td><td
								><strong>{Number(player.totalScore).toLocaleString()}</strong></td
							><td>{player.finalRank ? `#${player.finalRank}` : 'pending'}</td></tr
						>
					{/each}
				</tbody>
			</table>
		</div>

		{#if summary?.achievements.length}
			<div class="card" style="text-align: left; margin-top: 20px">
				<div class="meta"><strong>Achievements</strong></div>
				<ul style="margin-top: 12px; padding-left: 18px">
					{#each summary.achievements as achievement (achievement.type + achievement.participantId)}
						<li>
							<strong>{achievement.title}</strong>
							{#if summary}
								-
								{summary.participants.find((p) => p.participantId === achievement.participantId)
									?.profile.displayName ?? 'rival'}
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if rivalries.length}
			<div class="card" style="text-align: left; margin-top: 20px">
				<div class="meta"><strong>Your rivalries</strong></div>
				<ul style="margin-top: 12px; padding-left: 18px">
					{#each rivalries as record (record.profileId)}
						<li>
							{record.displayName}: {record.wins}-{record.losses}-{record.ties}
							over {record.roundsTogether} shared rounds
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if summary?.rounds.length}
			<div class="card" style="text-align: left; margin-top: 20px">
				<div class="meta"><strong>Round by round</strong></div>
				<div class="table-wrap" style="margin-top: 12px">
					<table class="table">
						<thead
							><tr><th>Round</th><th>Asset</th><th>Winner</th><th>Picks and points</th></tr></thead
						>
						<tbody>
							{#each summary.rounds as round (round.roundNumber)}
								<tr
									><td>{round.roundNumber}</td><td>{round.asset}</td><td
										>{round.status === 'VOIDED' ? 'VOID' : (round.winningSide ?? 'pending')}</td
									>
									<td>
										{round.picks
											.filter((pick) => pick.status === 'CONFIRMED' && summary)
											.map((pick) => pickLabel(summary!.participants, pick))
											.join(', ')}
									</td></tr
								>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="fine" style="margin-top: 10px">* changed pick after first confirmation.</p>
			</div>
		{/if}

		{#if loading}<p class="fine">Loading final standings...</p>{/if}
		{#if error}<p class="form-error">{error}</p>{/if}

		<div class="actions" style="justify-content: center; margin-top: 24px">
			<a class="btn primary" href={resolve('/tournaments/create')}>Run it back</a>
			<a class="btn ghost" href={resolve('/dashboard')}>Explore tournaments</a>
			<button class="btn" type="button" onclick={() => (shareOpen = true)}>Share results</button>
		</div>
	</section>
</main>

<ShareResultsModal
	open={shareOpen}
	onClose={() => (shareOpen = false)}
	resultUrl={shareUrl}
	resultText={shareText}
/>

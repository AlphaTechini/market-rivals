<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import { createArena } from '$lib/market-rivals/api';
	import { defaultStartTime } from '$lib/market-rivals/dates';
	import type { Pathname } from '$app/types';

	type AssetChoice = 'BTC' | 'ETH' | 'MIX';

	const windowMinutes = 15;
	const phaseMinutes = 6;
	const phaseGapMinutes = 1;

	let tournamentName = $state('Friday Market Match');
	let asset = $state<AssetChoice>('MIX');
	let visibility = $state('Public - listed for everyone');
	let rounds = $state(2);
	let players = $state(16);
	let starts = $state(defaultStartTime());
	let entry = $state(1);
	let description = $state('Two live DreamDEX windows. One leaderboard. Bring your best calls.');
	let validationError = $state('');
	let submitting = $state(false);

	function phaseStart(index: number, from = new Date(starts)): Date {
		if (asset !== 'MIX') {
			return new Date(from.getTime() + index * windowMinutes * 60 * 1000);
		}
		const wave = Math.floor(index / 2);
		const offset = index % 2 === 0 ? 0 : phaseMinutes + phaseGapMinutes;
		return new Date(from.getTime() + (wave * windowMinutes + offset) * 60 * 1000);
	}

	function roundAssetLabel(index: number): string {
		if (asset === 'MIX') return index % 2 === 0 ? 'BTC' : 'ETH';
		return asset;
	}

	let schedulePreview = $derived.by(() => {
		try {
			return Array.from({ length: rounds }, (_, index) => {
				const opens = phaseStart(index);
				const locks = new Date(opens.getTime() + phaseMinutes * 60 * 1000);
				return {
					round: index + 1,
					asset: roundAssetLabel(index),
					opens: opens.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
					locks: locks.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
				};
			});
		} catch {
			return [];
		}
	});

	let sessionEnd = $derived.by(() => {
		if (rounds === 0) return '';
		try {
			const last = phaseStart(rounds - 1);
			const end = new Date(last.getTime() + 15 * 60 * 1000);
			const minutes = Math.round((end.getTime() - new Date(starts).getTime()) / 60000);
			return `~${minutes} min session`;
		} catch {
			return '';
		}
	});

	async function createTournament(event: SubmitEvent) {
		event.preventDefault();
		if (!Number.isInteger(rounds) || rounds < 1 || rounds > 4) {
			validationError = 'Rounds must be a whole number between 1 and 4.';
			return;
		}
		if (!Number.isInteger(players) || players < 2 || players > 100) {
			validationError = 'Maximum players must be a whole number between 2 and 100.';
			return;
		}
		if (entry < 1) {
			validationError = 'Entry fee must be at least 1 USDso per round.';
			return;
		}
		validationError = '';
		submitting = true;
		try {
			const arena = await createArena({
				name: tournamentName.trim(),
				asset,
				accessType: visibility.startsWith('Private') ? 'PRIVATE' : 'PUBLIC',
				roundCount: rounds,
				maximumParticipants: players,
				roundIntervalMinutes: windowMinutes,
				entryFee: entry,
				startAt: new Date(starts).toISOString(),
				description: description.trim()
			});
			await goto(resolve(`/tournaments/${arena.id}/created` as Pathname));
		} catch (cause) {
			validationError = cause instanceof Error ? cause.message : 'Tournament could not be created.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Create Tournament | Market Rivals</title></svelte:head>

<BrandHeader mode="minimal" />

<main class="wrap">
	<section class="form">
		<div class="center">
			<div class="eyebrow">Host a match night</div>
			<h1>Create your tournament</h1>
			<p class="sub" style="margin-inline: auto">
				Rounds ride real DreamDEX 15-minute windows. Mixed matches run BTC and ETH in the same
				window, so a two-round match settles in about 15 minutes.
			</p>
		</div>

		<form class="card" onsubmit={createTournament}>
			<div class="field">
				<label for="tournament-name">Tournament name</label>
				<input id="tournament-name" bind:value={tournamentName} />
			</div>
			<div class="two">
				<div class="field">
					<label for="asset">Asset rotation</label>
					<select id="asset" bind:value={asset}>
						<option value="MIX">Mixed - BTC and ETH alternate</option>
						<option value="BTC">BTC only</option>
						<option value="ETH">ETH only</option>
					</select>
				</div>
				<div class="field">
					<label for="visibility">Visibility</label>
					<select id="visibility" bind:value={visibility}>
						<option>Public - listed for everyone</option>
						<option>Private - invite link only</option>
					</select>
				</div>
			</div>
			<div class="two">
				<div class="field">
					<label for="rounds">Rounds (1-4)</label>
					<input id="rounds" type="number" min="1" max="4" step="1" bind:value={rounds} required />
				</div>
				<div class="field">
					<label for="players">Maximum players</label>
					<input
						id="players"
						type="number"
						min="2"
						max="100"
						step="1"
						bind:value={players}
						required
					/>
				</div>
			</div>
			<div class="two">
				<div class="field">
					<label for="starts">Starts</label>
					<input id="starts" type="datetime-local" bind:value={starts} required />
				</div>
				<div class="field">
					<label for="entry">Entry fee per round (USDso)</label>
					<input id="entry" type="number" min="1" step="0.01" bind:value={entry} required />
				</div>
			</div>
			<div class="field">
				<label for="description">Short description</label>
				<textarea id="description" rows="3" bind:value={description}></textarea>
			</div>

			<div class="card" style="margin-bottom: 16px">
				<div class="meta">
					<strong>Schedule</strong>
					<span class="pill">{sessionEnd || 'pick a start time'}</span>
				</div>
				<div class="table-wrap" style="margin-top: 12px">
					<table class="table">
						<thead
							><tr><th>Round</th><th>Asset</th><th>Voting opens</th><th>Vote phase ends</th></tr
							></thead
						>
						<tbody>
							{#each schedulePreview as row (row.round)}
								<tr
									><td>{row.round}</td><td>{row.asset}</td><td>{row.opens}</td><td>{row.locks}</td
									></tr
								>
							{/each}
						</tbody>
					</table>
				</div>
				<p class="fine" style="margin-top: 10px">
					Picks stay open until 1 minute before the DreamDEX window closes; the phases above are the
					guided rhythm for everyone who arrives on time.
				</p>
			</div>

			<p class="fine">
				Every player uses the same 10-contract stake per round. Scoring follows the settled return
				of your verified DreamDEX positions, not an off-chain price guess.
			</p>
			{#if validationError}<p class="form-error">{validationError}</p>{/if}
			<button class="btn primary full" type="submit" disabled={submitting}
				>{submitting ? 'Creating...' : 'Create tournament'}</button
			>
		</form>
	</section>
</main>

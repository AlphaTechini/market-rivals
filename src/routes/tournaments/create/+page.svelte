<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';

	let tournamentName = $state("Alpha's Weekend Arena");
	let asset = $state('BTC / USD');
	let visibility = $state('Public - listed for everyone');
	let roundInterval = $state(15);
	let rounds = $state(10);
	let players = $state(16);
	let starts = $state('2026-09-02T18:00');
	let entry = $state(1);
	let description = $state('Ten rounds. One leaderboard. Bring your best BTC calls.');
	let validationError = $state('');

	function createTournament(event: SubmitEvent) {
		event.preventDefault();
		if (!Number.isInteger(rounds) || rounds < 1) {
			validationError = 'Number of rounds must be a whole number greater than zero.';
			return;
		}
		if (!Number.isInteger(players) || players < 2 || players > 100) {
			validationError = 'Maximum players must be a whole number between 2 and 100.';
			return;
		}
		if (!Number.isInteger(roundInterval) || roundInterval < 3 || roundInterval > 20) {
			validationError = 'Round interval must be a whole number between 3 and 20 minutes.';
			return;
		}
		if (entry < 1) {
			validationError = 'Entry fee must be at least 1 USDso per round.';
			return;
		}
		validationError = '';
		void goto(resolve('/tournaments/alpha-weekend/created'));
	}
</script>

<svelte:head><title>Create Tournament | Market Rivals</title></svelte:head>

<BrandHeader mode="minimal" />

<main class="wrap">
	<section class="form">
		<div class="center">
			<div class="eyebrow">Host an arena</div>
			<h1>Create your tournament</h1>
			<p class="sub" style="margin-inline: auto">
				Set the format now. DreamDEX supplies the underlying market windows and settlement.
			</p>
		</div>

		<form class="card" onsubmit={createTournament}>
			<div class="field">
				<label for="tournament-name">Tournament name</label>
				<input id="tournament-name" bind:value={tournamentName} />
			</div>
			<div class="two">
				<div class="field">
					<label for="asset">Asset</label>
					<select id="asset" bind:value={asset}>
						<option>BTC / USD</option>
						<option>ETH / USD</option>
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
					<label for="rounds">Number of rounds</label>
					<input id="rounds" type="number" min="1" step="1" bind:value={rounds} required />
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
					<label for="interval">Minutes between rounds</label>
					<input
						id="interval"
						type="number"
						min="3"
						max="20"
						step="1"
						bind:value={roundInterval}
						required
					/>
				</div>
				<div class="field">
					<label for="starts">Starts</label>
					<input id="starts" type="datetime-local" bind:value={starts} required />
				</div>
			</div>
			<div class="field">
				<label for="entry">Entry fee per round (USDso)</label>
				<input id="entry" type="number" min="1" step="0.01" bind:value={entry} required />
			</div>
			<div class="field">
				<label for="description">Short description</label>
				<textarea id="description" rows="3" bind:value={description}></textarea>
			</div>
			<p class="fine">
				Every player uses the same 10-contract stake per round. Scoring is based on settled DreamDEX
				positions, not an off-chain price guess.
			</p>
			{#if validationError}<p class="form-error">{validationError}</p>{/if}
			<button class="btn primary full" type="submit">Create tournament</button>
		</form>
	</section>
</main>

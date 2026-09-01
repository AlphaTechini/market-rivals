<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';

	let tournamentName = $state("Alpha's Weekend Arena");
	let asset = $state('BTC / USD');
	let visibility = $state('Public - listed for everyone');
	let rounds = $state('10 rounds');
	let players = $state('16 players');
	let starts = $state('2026-09-02T18:00');
	let entry = $state('1 USDso');
	let description = $state('Ten rounds. One leaderboard. Bring your best BTC calls.');

	function createTournament(event: SubmitEvent) {
		event.preventDefault();
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
					<select id="rounds" bind:value={rounds}>
						<option>5 rounds</option>
						<option>10 rounds</option>
						<option>20 rounds</option>
					</select>
				</div>
				<div class="field">
					<label for="players">Maximum players</label>
					<select id="players" bind:value={players}>
						<option>8 players</option>
						<option>16 players</option>
						<option>32 players</option>
					</select>
				</div>
			</div>
			<div class="two">
				<div class="field">
					<label for="starts">Starts</label>
					<input id="starts" type="datetime-local" bind:value={starts} />
				</div>
				<div class="field">
					<label for="entry">Entry per round</label>
					<select id="entry" bind:value={entry}>
						<option>1 USDso</option>
						<option>2 USDso</option>
						<option>5 USDso</option>
					</select>
				</div>
			</div>
			<div class="field">
				<label for="description">Short description</label>
				<textarea id="description" rows="3" bind:value={description}></textarea>
			</div>
			<p class="fine">
				Prototype rule: every player uses the same configured stake per round. Scoring is based on
				settled DreamDEX positions, not an off-chain price guess.
			</p>
			<button class="btn primary full" type="submit">Create tournament</button>
		</form>
	</section>
</main>

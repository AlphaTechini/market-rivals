<script lang="ts">
	import { resolve } from '$app/paths';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import Countdown from '$lib/market-rivals/Countdown.svelte';
	import PlayerList from '$lib/market-rivals/PlayerList.svelte';
	import { lobbyPlayers } from '$lib/market-rivals/data';
</script>

<svelte:head><title>Tournament Lobby | Market Rivals</title></svelte:head>

<BrandHeader />

<main class="wrap">
	<section class="narrow">
		<div class="eyebrow">Tournament lobby · BTC/USD</div>
		<h1>Alpha's Weekend Arena</h1>
		<p class="sub">The host starts the arena when everyone is ready.</p>
		<div class="lobby-ring">
			<div class="arena-ring">
				<div class="ring-copy">
					<small>Tournament starts in</small><strong><Countdown initialSeconds={258} /></strong
					><small>10 ROUNDS · 1 USDso EACH</small>
				</div>
			</div>
		</div>
		<div class="statgrid">
			<div class="stat"><small>Asset</small><strong>BTC</strong></div>
			<div class="stat"><small>Players</small><strong>6 / 16</strong></div>
			<div class="stat"><small>Visibility</small><strong>Public</strong></div>
		</div>
		<div class="card" style="text-align: left">
			<div class="meta">
				<strong>Players</strong><span class="pill"><i class="dot"></i> 6 ready</span>
			</div>
			<div style="margin-top: 14px"><PlayerList players={lobbyPlayers} /></div>
		</div>
		<div class="actions" style="justify-content: center; margin-top: 22px">
			<a class="btn primary" href={resolve('/tournaments/alpha-weekend/round/1/arena')}
				>Start demo tournament</a
			>
			<a class="btn" href={resolve('/tournaments/alpha-weekend/created')}>Share invite</a>
		</div>
	</section>
</main>

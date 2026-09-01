<script lang="ts">
	import { resolve } from '$app/paths';
	import ArenaRing from '$lib/market-rivals/ArenaRing.svelte';
	import BrandHeader from '$lib/market-rivals/BrandHeader.svelte';
	import ShareActions from '$lib/market-rivals/ShareActions.svelte';
</script>

<svelte:head><title>Arena Created | Market Rivals</title></svelte:head>

<BrandHeader mode="minimal" actionLabel="Done" />

<main class="wrap">
	<section class="narrow">
		<div class="lobby-ring">
			<ArenaRing label="Arena created" value="READY" detail="BTC / USD" />
		</div>
		<div class="eyebrow">Arena created</div>
		<h1>Alpha's Weekend Arena</h1>
		<p class="sub">
			Your tournament is ready. Invite your circle now or wait for public players to discover it.
		</p>
		<ShareActions />
		<div class="actions" style="justify-content: center">
			<a class="btn primary" href={resolve('/tournaments/alpha-weekend/lobby')}
				>Open tournament lobby</a
			>
			<a class="btn ghost" href={resolve('/dashboard')}>Back to tournaments</a>
		</div>
	</section>
</main>

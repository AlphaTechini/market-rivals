<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';

	type Props = {
		mode?: 'landing' | 'app' | 'minimal';
		actionLabel?: string;
		actionHref?: Pathname;
	};

	let { mode = 'app', actionLabel = 'Close', actionHref = '/dashboard' }: Props = $props();
</script>

<header class="wrap topbar">
	<a class="brand" href={resolve(mode === 'landing' ? '/' : '/dashboard')}>
		<span class="brandmark"></span>
		MARKET RIVALS
	</a>

	{#if mode === 'landing'}
		<nav>
			<a href={resolve('/#how')}>How it works</a>
			<a href={resolve('/#why')}>Why compete</a>
			<a class="btn primary" href={resolve('/dashboard')}>Connect wallet</a>
		</nav>
	{:else if mode === 'minimal'}
		<a class="btn" href={resolve(actionHref)}>{actionLabel}</a>
	{:else}
		<div class="actions">
			<span class="pill"><i class="dot"></i> Somnia Testnet</span>
			<button class="btn" type="button">0x71...9C2</button>
		</div>
	{/if}
</header>

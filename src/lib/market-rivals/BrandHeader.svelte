<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { onMount } from 'svelte';
	import PresenceStatus from './PresenceStatus.svelte';
	import { fetchMyProfile, type ApiProfile } from './api';

	type Props = {
		mode?: 'landing' | 'app' | 'minimal';
		actionLabel?: string;
		actionHref?: Pathname;
		onConnect?: () => void;
	};

	let {
		mode = 'app',
		actionLabel = 'Close',
		actionHref = '/dashboard',
		onConnect
	}: Props = $props();

	let profile = $state<ApiProfile | null>(null);

	onMount(async () => {
		try {
			profile = await fetchMyProfile();
		} catch {
			profile = null;
		}
	});

	let shortWallet = $derived(
		profile ? `${profile.walletAddress.slice(0, 4)}...${profile.walletAddress.slice(-4)}` : ''
	);
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
			{#if onConnect}
				<button class="btn primary" type="button" onclick={onConnect}>
					{profile ? shortWallet : 'Connect wallet'}
				</button>
			{:else}
				<a class="btn primary" href={resolve(profile ? '/dashboard' : '/')}>
					{profile ? shortWallet : 'Connect wallet'}
				</a>
			{/if}
		</nav>
	{:else if mode === 'minimal'}
		<a class="btn" href={resolve(actionHref)}>{actionLabel}</a>
	{:else}
		<div class="actions">
			<PresenceStatus />
			<span class="pill"><i class="dot"></i> Somnia Testnet</span>
			{#if profile}
				<span class="pill" title={profile.walletAddress}>{profile.displayName}</span>
			{:else}
				<a class="btn" href={resolve('/')}>Connect</a>
			{/if}
		</div>
	{/if}
</header>

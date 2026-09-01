<script lang="ts">
	import { onMount } from 'svelte';
	import { subscribeToPresence } from './presence';

	let online = $state(false);

	onMount(() => {
		try {
			return subscribeToPresence('market-rivals-guest', (value) => (online = value));
		} catch {
			online = false;
		}
	});
</script>

<span class="pill"><i class:offline={!online} class="dot"></i> {online ? 'Online' : 'Offline'}</span
>

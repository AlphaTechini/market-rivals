<script lang="ts">
	import { onMount } from 'svelte';
	import { subscribeToPresence } from './presence';

	let online = $state(false);

	onMount(() => {
		let disposed = false;
		let unsubscribe: (() => void) | undefined;
		void subscribeToPresence('market-rivals-guest', (value) => (online = value))
			.then((cleanup) => {
				if (disposed) cleanup();
				else unsubscribe = cleanup;
			})
			.catch(() => (online = false));

		return () => {
			disposed = true;
			unsubscribe?.();
		};
	});
</script>

<span class="pill"><i class:offline={!online} class="dot"></i> {online ? 'Online' : 'Offline'}</span
>

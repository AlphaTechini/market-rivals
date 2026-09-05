<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		initialSeconds?: number;
		targetAt?: string | number | Date;
	};

	let { initialSeconds = 0, targetAt }: Props = $props();

	function secondsUntil(target: string | number | Date): number {
		const time = new Date(target).getTime();
		if (Number.isNaN(time)) return 0;
		return Math.max(Math.floor((time - Date.now()) / 1000), 0);
	}

	// svelte-ignore state_referenced_locally
	// fallback mode intentionally captures the initial tick count
	let remaining = $state(initialSeconds);

	$effect.pre(() => {
		if (targetAt) remaining = secondsUntil(targetAt);
	});

	onMount(() => {
		const interval = window.setInterval(() => {
			if (targetAt) {
				remaining = secondsUntil(targetAt);
				return;
			}
			remaining = Math.max(remaining - 1, 0);
		}, 1000);

		return () => window.clearInterval(interval);
	});

	const formattedTime = $derived.by(() => {
		const hours = Math.floor(remaining / 3600)
			.toString()
			.padStart(2, '0');
		const minutes = (Math.floor(remaining / 60) % 60).toString().padStart(2, '0');
		const seconds = (remaining % 60).toString().padStart(2, '0');
		return hours === '00' ? `${minutes}:${seconds}` : `${hours}:${minutes}:${seconds}`;
	});
</script>

<time class="timer" datetime={`PT${remaining}S`}>{formattedTime}</time>

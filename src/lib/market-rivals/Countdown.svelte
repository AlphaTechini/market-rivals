<script lang="ts">
	import { onMount } from 'svelte';

	type Props = {
		initialSeconds: number;
	};

	let { initialSeconds }: Props = $props();
	let remaining = $derived(initialSeconds);

	onMount(() => {
		const interval = window.setInterval(() => {
			remaining = Math.max(remaining - 1, 0);
		}, 1000);

		return () => window.clearInterval(interval);
	});

	function formattedTime() {
		const minutes = Math.floor(remaining / 60)
			.toString()
			.padStart(2, '0');
		const seconds = (remaining % 60).toString().padStart(2, '0');
		return `${minutes}:${seconds}`;
	}
</script>

<time class="timer" datetime={`PT${remaining}S`}>{formattedTime()}</time>

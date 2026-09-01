<script lang="ts">
	import { resolve } from '$app/paths';

	type Props = {
		active: 'live' | 'history' | 'leaderboard';
	};

	let { active }: Props = $props();
</script>

<nav class="tabs">
	<div class="wrap">
		<a class:active={active === 'live'} class="tab" href={resolve('/dashboard')}>Live tournaments</a
		>
		<a class:active={active === 'history'} class="tab" href={resolve('/history')}
			>Past tournaments</a
		>
		<a class:active={active === 'leaderboard'} class="tab" href={resolve('/leaderboard')}
			>Leaderboard</a
		>
	</div>
</nav>

<script lang="ts">
	import PlayerName from './PlayerName.svelte';
	import type { Player } from './data';

	let { players }: { players: Player[] } = $props();
</script>

<div class="player-list">
	{#each players as player (player.name)}
		<div class="player">
			<PlayerName profile={player} />
			<span class:ready={player.status?.includes('Ready')} class="status-text">{player.status}</span
			>
		</div>
	{/each}
</div>

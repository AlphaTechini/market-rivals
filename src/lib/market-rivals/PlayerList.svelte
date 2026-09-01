<script lang="ts">
	import type { Player } from './data';

	let { players }: { players: Player[] } = $props();
</script>

<div class="player-list">
	{#each players as player (player.name)}
		<div class="player">
			<div class="player-name">
				<i class="avatar">{player.initials}</i>
				<strong>{player.name}</strong>
			</div>
			<span class:ready={player.status?.includes('Ready')} class="status-text">{player.status}</span
			>
		</div>
	{/each}
</div>

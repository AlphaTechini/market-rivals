<script lang="ts">
	import Avatar from './Avatar.svelte';
	import type { Player } from './data';

	let { profile, badge }: { profile: Player; badge?: string } = $props();
</script>

<span class="player-name">
	<Avatar
		name={profile.name}
		initials={profile.initials}
		avatarUrl={profile.avatarUrl}
		size="small"
	/>
	<strong>{profile.name}</strong>
	{#if badge}<span class="pill">{badge}</span>{/if}
</span>

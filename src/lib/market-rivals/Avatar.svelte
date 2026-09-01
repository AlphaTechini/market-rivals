<script lang="ts">
	type Props = {
		name: string;
		initials: string;
		avatarUrl?: string;
		size?: 'small' | 'medium' | 'large';
	};

	let { name, initials, avatarUrl, size = 'medium' }: Props = $props();
</script>

{#if avatarUrl}
	<img class="profile-avatar {size}" src={avatarUrl} alt={`${name} profile`} />
{:else}
	<span class="profile-avatar {size}" aria-label={`${name} profile`}>{initials}</span>
{/if}

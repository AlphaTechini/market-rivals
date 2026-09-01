<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Tournament } from './data';

	let { tournament }: { tournament: Tournament } = $props();
</script>

<article class="card tournament">
	<div class="meta">
		<span class="pill"><i class="dot"></i> {tournament.status}</span>
		<span>{tournament.players}</span>
	</div>
	<div class="asset">{tournament.name}</div>
	<p>{tournament.detail}</p>
	<div class="bottom">
		<div class="avatars" aria-label="Tournament players">
			{#each tournament.avatars as avatar (avatar)}
				<i class="avatar">{avatar}</i>
			{/each}
		</div>
		<a class="btn" href={resolve(tournament.href)}>{tournament.cta}</a>
	</div>
</article>

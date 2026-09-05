<script lang="ts">
	type Props = {
		arenaId?: string;
		inviteCode?: string | null;
		arenaName?: string;
	};

	let { arenaId, inviteCode = null, arenaName = 'My arena' }: Props = $props();

	let copied = $state(false);
	let inviteUrl = $derived.by(() => {
		if (!arenaId) return '';
		const path = `/tournaments/${arenaId}/lobby${inviteCode ? `?invite=${inviteCode}` : ''}`;
		return `${window.location.origin}${path}`;
	});

	async function copyInvite() {
		if (!inviteUrl) return;
		try {
			await navigator.clipboard.writeText(inviteUrl);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			copied = false;
		}
	}

	function shareTo(kind: 'whatsapp' | 'telegram' | 'email' | 'sms') {
		if (!inviteUrl) return;
		const url = encodeURIComponent(inviteUrl);
		const text = encodeURIComponent(`Join my ${arenaName} Market Rivals tournament`);
		const links = {
			whatsapp: `https://wa.me/?text=${text}%20${url}`,
			telegram: `https://t.me/share/url?url=${url}&text=${text}`,
			email: `mailto:?subject=${encodeURIComponent('Join my Market Rivals tournament')}&body=${url}`,
			sms: `sms:?body=${text}%20${url}`
		};

		window.open(links[kind], '_blank', 'noopener,noreferrer');
	}
</script>

<div class="linkbox">
	<input aria-label="Invite link" readonly value={inviteUrl} />
	<button class="btn" type="button" onclick={copyInvite} disabled={!inviteUrl}
		>{copied ? 'Copied' : 'Copy link'}</button
	>
</div>
<div class="share">
	<button class="btn" type="button" disabled={!inviteUrl} onclick={() => shareTo('whatsapp')}
		>WhatsApp</button
	>
	<button class="btn" type="button" disabled={!inviteUrl} onclick={() => shareTo('telegram')}
		>Telegram</button
	>
	<button class="btn" type="button" disabled={!inviteUrl} onclick={() => shareTo('email')}
		>Email</button
	>
	<button class="btn" type="button" disabled={!inviteUrl} onclick={() => shareTo('sms')}
		>Text message</button
	>
</div>

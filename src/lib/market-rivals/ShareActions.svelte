<script lang="ts">
	let copied = $state(false);
	const inviteUrl = 'https://marketrivals.xyz/join/AX7K2';

	async function copyInvite() {
		try {
			await navigator.clipboard.writeText(inviteUrl);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			copied = false;
		}
	}

	function shareTo(kind: 'whatsapp' | 'telegram' | 'email' | 'sms') {
		const url = encodeURIComponent(inviteUrl);
		const text = encodeURIComponent('Join my BTC Market Rivals tournament');
		const links = {
			whatsapp: `https://wa.me/?text=${text}%20${url}`,
			telegram: `https://t.me/share/url?url=${url}&text=${text}`,
			email: `mailto:?subject=${text}&body=${url}`,
			sms: `sms:?body=${text}%20${url}`
		};

		window.open(links[kind], '_blank', 'noopener,noreferrer');
	}
</script>

<div class="linkbox">
	<input aria-label="Invite link" readonly value={inviteUrl} />
	<button class="btn" type="button" onclick={copyInvite}>{copied ? 'Copied' : 'Copy link'}</button>
</div>
<div class="share">
	<button class="btn" type="button" onclick={() => shareTo('whatsapp')}>WhatsApp</button>
	<button class="btn" type="button" onclick={() => shareTo('telegram')}>Telegram</button>
	<button class="btn" type="button" onclick={() => shareTo('email')}>Email</button>
	<button class="btn" type="button" onclick={() => shareTo('sms')}>Text message</button>
</div>

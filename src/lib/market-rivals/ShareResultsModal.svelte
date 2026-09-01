<script lang="ts">
	type Props = {
		open: boolean;
		onClose: () => void;
	};

	let { open, onClose }: Props = $props();
	const resultUrl = 'https://marketrivals.xyz/tournaments/alpha-weekend/final';
	const resultText = 'I finished an on-chain Market Rivals tournament. Can you beat my score?';

	function shareTo(kind: 'whatsapp' | 'telegram' | 'gmail' | 'x' | 'linkedin') {
		const url = encodeURIComponent(resultUrl);
		const text = encodeURIComponent(resultText);
		const links = {
			whatsapp: `https://wa.me/?text=${text}%20${url}`,
			telegram: `https://t.me/share/url?url=${url}&text=${text}`,
			gmail: `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('My Market Rivals result')}&body=${text}%20${url}`,
			x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
			linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
		};

		window.open(links[kind], '_blank', 'noopener,noreferrer');
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) onClose();
	}
</script>

{#if open}
	<div class="modal-backdrop" role="presentation" onclick={handleBackdropClick}>
		<dialog open class="modal share-modal" aria-labelledby="share-title">
			<div class="modal-header">
				<div>
					<div class="eyebrow">Tell your rivals</div>
					<h2 id="share-title">Share your result</h2>
				</div>
				<button class="modal-close" type="button" aria-label="Close" onclick={onClose}>×</button>
			</div>
			<p class="sub">Invite your circle to challenge the final standings.</p>
			<div class="share-options">
				<button class="share-option" type="button" onclick={() => shareTo('whatsapp')}
					><strong>WhatsApp</strong><span>Send to a chat</span></button
				>
				<button class="share-option" type="button" onclick={() => shareTo('telegram')}
					><strong>Telegram</strong><span>Share with a group</span></button
				>
				<button class="share-option" type="button" onclick={() => shareTo('gmail')}
					><strong>Gmail</strong><span>Compose an email</span></button
				>
				<button class="share-option" type="button" onclick={() => shareTo('x')}
					><strong>X</strong><span>Post to your profile</span></button
				>
				<button class="share-option" type="button" onclick={() => shareTo('linkedin')}
					><strong>LinkedIn</strong><span>Share with your network</span></button
				>
			</div>
		</dialog>
	</div>
{/if}

<script lang="ts">
	import {
		discoverWalletProviders,
		preferredWallet,
		rememberWallet,
		type WalletProviderOption
	} from '$lib/dreamdex/wallet-provider';

	export type ProfileDraft = {
		displayName: string;
		avatarFile: File;
		avatarUrl: string;
	};

	type Props = {
		open: boolean;
		onClose: () => void;
		onComplete: (profile: ProfileDraft) => void;
	};

	let { open, onClose, onComplete }: Props = $props();
	let step = $state<'profile' | 'wallet'>('profile');
	let displayName = $state('');
	let avatarFile = $state<File | null>(null);
	let avatarUrl = $state('');
	let error = $state('');
	let connecting = $state(false);
	let wallets = $state<WalletProviderOption[]>([]);
	let selectedWallet = $state<WalletProviderOption | null>(null);
	let loadingWallets = $state(false);
	let showWalletPicker = $state(true);

	function reset() {
		step = 'profile';
		displayName = '';
		avatarFile = null;
		avatarUrl = '';
		error = '';
		connecting = false;
		wallets = [];
		selectedWallet = null;
		loadingWallets = false;
		showWalletPicker = true;
	}

	function close() {
		reset();
		onClose();
	}

	function selectAvatar(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			error = 'Choose an image file for your profile picture.';
			return;
		}

		avatarFile = file;
		avatarUrl = URL.createObjectURL(file);
		error = '';
	}

	async function continueToWallet(event: SubmitEvent) {
		event.preventDefault();
		if (!displayName.trim() || !avatarFile) {
			error = 'Enter your name and attach a profile picture to continue.';
			return;
		}

		error = '';
		step = 'wallet';
		loadingWallets = true;
		try {
			wallets = await discoverWalletProviders();
			selectedWallet = preferredWallet(wallets);
			showWalletPicker = !selectedWallet;
			if (!wallets.length) error = 'Install an EVM wallet extension to continue.';
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Wallet discovery failed.';
		} finally {
			loadingWallets = false;
		}
	}

	function chooseWallet(wallet: WalletProviderOption) {
		rememberWallet(wallet);
		selectedWallet = wallet;
		showWalletPicker = false;
		error = '';
	}

	async function connectWallet() {
		if (!avatarFile || !displayName.trim()) return;
		connecting = true;
		error = '';
		try {
			await onComplete({ displayName: displayName.trim(), avatarFile, avatarUrl });
			reset();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Wallet connection failed.';
			connecting = false;
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) close();
	}
</script>

{#if open}
	<div class="modal-backdrop" role="presentation" onclick={handleBackdropClick}>
		<dialog open class="modal" aria-labelledby="profile-title">
			<div class="modal-header">
				<div>
					<div class="eyebrow">Before you enter</div>
					<h2 id="profile-title">Set up your profile</h2>
				</div>
				<button class="modal-close" type="button" aria-label="Close" onclick={close}>×</button>
			</div>

			{#if step === 'profile'}
				<form onsubmit={continueToWallet}>
					<div class="profile-upload">
						{#if avatarUrl}
							<img class="profile-avatar large" src={avatarUrl} alt="Profile preview" />
						{:else}
							<span class="profile-avatar large">?</span>
						{/if}
						<label class="btn" for="profile-picture">Attach picture</label>
						<input
							id="profile-picture"
							class="file-input"
							type="file"
							accept="image/*"
							onchange={selectAvatar}
						/>
					</div>
					<div class="field">
						<label for="display-name">Your name</label>
						<input
							id="display-name"
							autocomplete="name"
							bind:value={displayName}
							placeholder="How rivals will see you"
						/>
					</div>
					{#if error}<p class="form-error">{error}</p>{/if}
					<button class="btn primary full" type="submit">Continue to wallet</button>
				</form>
			{:else}
				<div class="wallet-step">
					<div class="profile-summary">
						<img class="profile-avatar medium" src={avatarUrl} alt="Profile preview" />
						<div><strong>{displayName}</strong><span class="status-text">Profile ready</span></div>
					</div>
					<p class="sub">
						Connect your wallet to sign DreamDEX testnet positions. Your private key never leaves
						your wallet.
					</p>
					{#if loadingWallets}
						<p class="fine">Finding installed wallets...</p>
					{:else if showWalletPicker}
						<div class="wallet-picker" aria-label="Choose a wallet">
							<p class="fine">Choose the wallet you want Market Rivals to use.</p>
							{#each wallets as wallet (wallet.id)}
								<button class="btn full" type="button" onclick={() => chooseWallet(wallet)}>
									{wallet.name}
								</button>
							{/each}
						</div>
					{:else if selectedWallet}
						<div class="notice">
							<p>Using <strong>{selectedWallet.name}</strong> for this session.</p>
							<button class="btn ghost" type="button" onclick={() => (showWalletPicker = true)}>
								Change wallet
							</button>
						</div>
					{/if}
					{#if error}<p class="form-error">{error}</p>{/if}
					<button
						class="btn primary full"
						type="button"
						disabled={connecting || loadingWallets || showWalletPicker || !selectedWallet}
						onclick={connectWallet}
					>
						{connecting ? 'Connecting...' : 'Connect wallet'}
					</button>
					<button class="btn ghost full" type="button" onclick={() => (step = 'profile')}
						>Back to profile</button
					>
				</div>
			{/if}
		</dialog>
	</div>
{/if}

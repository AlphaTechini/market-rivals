<script lang="ts">
	import {
		discoverWalletProviders,
		preferredWallet,
		rememberWallet,
		type WalletProviderOption
	} from '$lib/dreamdex/wallet-provider';
	import { beginWalletAuth, completeWalletSignIn } from './api';

	export type ProfileDraft = {
		displayName: string;
		avatarFile: File;
		avatarUrl: string;
	};

	type Props = {
		open: boolean;
		onClose: () => void;
		onComplete: (profile: ProfileDraft) => void;
		onSignedIn: () => void;
	};

	let { open, onClose, onComplete, onSignedIn }: Props = $props();
	let step = $state<'wallet' | 'profile'>('wallet');
	let displayName = $state('');
	let avatarFile = $state<File | null>(null);
	let avatarUrl = $state('');
	let error = $state('');
	let connecting = $state(false);
	let wallets = $state<WalletProviderOption[]>([]);
	let selectedWallet = $state<WalletProviderOption | null>(null);
	let loadingWallets = $state(false);
	let showWalletPicker = $state(true);

	$effect(() => {
		if (!open || step !== 'wallet' || wallets.length || loadingWallets) return;
		loadingWallets = true;
		void discoverWalletProviders()
			.then((found) => {
				wallets = found;
				selectedWallet = preferredWallet(found);
				showWalletPicker = !selectedWallet;
				if (!found.length) error = 'Install an EVM wallet extension to continue.';
			})
			.catch((cause) => {
				error = cause instanceof Error ? cause.message : 'Wallet discovery failed.';
			})
			.finally(() => (loadingWallets = false));
	});

	function reset() {
		step = 'wallet';
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

	function chooseWallet(wallet: WalletProviderOption) {
		rememberWallet(wallet);
		selectedWallet = wallet;
		showWalletPicker = false;
		error = '';
	}

	async function signIn() {
		connecting = true;
		error = '';
		try {
			const auth = await beginWalletAuth();
			if (auth.hasAccount) {
				await completeWalletSignIn(auth.account, auth.message);
				reset();
				onSignedIn();
			} else {
				connecting = false;
				step = 'profile';
			}
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Wallet sign-in failed.';
			connecting = false;
		}
	}

	async function createAccount(event: SubmitEvent) {
		event.preventDefault();
		if (!displayName.trim() || !avatarFile) {
			error = 'Enter your name and attach a profile picture to continue.';
			return;
		}

		connecting = true;
		error = '';
		try {
			await onComplete({
				displayName: displayName.trim(),
				avatarFile,
				avatarUrl
			});
			reset();
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Account creation failed.';
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
					<div class="eyebrow">{step === 'profile' ? 'New wallet' : 'Welcome back'}</div>
					<h2 id="profile-title">{step === 'profile' ? 'Set up your profile' : 'Sign in'}</h2>
				</div>
				<button class="modal-close" type="button" aria-label="Close" onclick={close}>×</button>
			</div>

			{#if step === 'wallet'}
				<div class="wallet-step">
					<p class="sub">
						Connect your wallet to sign back in with your existing account. New wallets set up a
						profile after connecting.
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
						onclick={signIn}
					>
						{connecting ? 'Signing in...' : 'Sign In'}
					</button>
				</div>
			{:else}
				<form onsubmit={createAccount}>
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
					<button class="btn primary full" type="submit" disabled={connecting}
						>{connecting ? 'Creating account...' : 'Create account'}</button
					>
					<button class="btn ghost full" type="button" onclick={() => (step = 'wallet')}
						>Back to wallet</button
					>
				</form>
			{/if}
		</dialog>
	</div>
{/if}

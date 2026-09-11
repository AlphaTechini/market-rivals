export type EthereumProvider = {
	request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type ProviderDetail = {
	info: { uuid: string; name: string; icon: string; rdns: string };
	provider: EthereumProvider;
};

export type WalletProviderOption = {
	id: string;
	name: string;
	isLegacy: boolean;
};

const preferredWalletKey = 'market-rivals.preferred-wallet-rdns';
const legacyProviderId = 'legacy-window-ethereum';
const providers = new Map<string, ProviderDetail>();
let discoveryStarted = false;

function browserEthereum(): EthereumProvider | undefined {
	return (globalThis as typeof globalThis & { ethereum?: EthereumProvider }).ethereum;
}

function startDiscovery(): void {
	if (discoveryStarted || typeof window === 'undefined') return;
	discoveryStarted = true;
	window.addEventListener('eip6963:announceProvider', (event) => {
		const detail = (event as CustomEvent<ProviderDetail>).detail;
		if (!detail?.info?.uuid || !detail.info.name || !detail.info.rdns || !detail.provider?.request)
			return;
		providers.delete(legacyProviderId);
		providers.set(detail.info.uuid, detail);
	});
}

function options(): WalletProviderOption[] {
	return [...providers.entries()].map(([id, detail]) => ({
		id,
		name: detail.info.name,
		isLegacy: id === legacyProviderId
	}));
}

export async function discoverWalletProviders(): Promise<WalletProviderOption[]> {
	if (typeof window === 'undefined') return [];
	startDiscovery();
	window.dispatchEvent(new Event('eip6963:requestProvider'));
	await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
	if (!providers.size) {
		const provider = browserEthereum();
		if (provider) {
			providers.set(legacyProviderId, {
				info: { uuid: legacyProviderId, name: 'Browser wallet', icon: '', rdns: legacyProviderId },
				provider
			});
		}
	}
	return options();
}

export function preferredWallet(options: WalletProviderOption[]): WalletProviderOption | null {
	if (typeof window === 'undefined') return null;
	const preferredRdns = window.localStorage.getItem(preferredWalletKey);
	if (!preferredRdns) return null;
	return options.find((option) => providers.get(option.id)?.info.rdns === preferredRdns) ?? null;
}

export function rememberWallet(option: WalletProviderOption): void {
	const detail = providers.get(option.id);
	if (!detail) throw new Error('The selected wallet is no longer available.');
	window.localStorage.setItem(preferredWalletKey, detail.info.rdns);
}

export async function selectedWalletProvider(): Promise<EthereumProvider> {
	const available = await discoverWalletProviders();
	const preferred = preferredWallet(available);
	if (!preferred) throw new Error('Choose a wallet before continuing.');
	const provider = providers.get(preferred.id)?.provider;
	if (!provider) throw new Error('The selected wallet is no longer available.');
	return provider;
}

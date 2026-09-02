import { createWalletClient, custom, type Account, type Address } from 'viem';
import type { SomniaMarkets } from '@somnia-chain/markets-sdk';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';
import type { WalletClient } from 'viem';
import { createDreamdexExchange } from './config';

export type ConnectedWallet = {
	walletClient: WalletClient;
	account: Account | Address;
};

export function bindDreamdexWallet(exchange: SomniaMarkets, wallet: ConnectedWallet): void {
	exchange.setSigner({
		walletClient: wallet.walletClient,
		account: wallet.account
	});
}

export function unbindDreamdexWallet(exchange: SomniaMarkets): void {
	exchange.setSigner({});
}

type EthereumProvider = {
	request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

export async function createBrowserDreamdexExchange(): Promise<{
	exchange: SomniaMarkets;
	account: Address;
}> {
	const provider = (globalThis as typeof globalThis & { ethereum?: EthereumProvider }).ethereum;
	if (!provider) throw new Error('Install an EVM wallet to place a prediction.');

	const walletClient = createWalletClient({ chain: somniaShannon, transport: custom(provider) });
	const [account] = await walletClient.requestAddresses();
	if (!account) throw new Error('No wallet account was selected.');
	const chainId = await walletClient.getChainId();
	if (chainId !== somniaShannon.id)
		throw new Error('Switch your wallet to Somnia Shannon testnet.');

	const exchange = createDreamdexExchange();
	bindDreamdexWallet(exchange, { walletClient, account });
	return { exchange, account };
}

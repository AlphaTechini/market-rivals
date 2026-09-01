import type { SomniaMarkets } from '@somnia-chain/markets-sdk';
import type { Account, Address, WalletClient } from 'viem';

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

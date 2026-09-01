import { env } from '$env/dynamic/public';
import {
	SOMNIA_TESTNET_ADDRESSES,
	SomniaMarkets,
	type SomniaMarketsConfig
} from '@somnia-chain/markets-sdk';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';

const defaultWsRpcUrl = somniaShannon.rpcUrls.default.webSocket[0];

function requiredPublicEnv(name: keyof typeof env): string {
	const value = env[name]?.trim();

	if (!value) {
		throw new Error(`${name} is not set`);
	}

	return value;
}

export function dreamdexConfig(): SomniaMarketsConfig {
	return {
		indexerUrl: requiredPublicEnv('PUBLIC_DREAMDEX_INDEXER_URL'),
		chain: somniaShannon,
		wsRpcUrl: env.PUBLIC_DREAMDEX_WS_RPC_URL?.trim() || defaultWsRpcUrl,
		addresses: SOMNIA_TESTNET_ADDRESSES
	};
}

export function createDreamdexExchange(): SomniaMarkets {
	return new SomniaMarkets(dreamdexConfig());
}

import type {
	BinaryMarket,
	BinaryOrderBook,
	MarketOnchain,
	SomniaMarkets
} from '@somnia-chain/markets-sdk';

export type TradableBinaryMarket = {
	market: BinaryMarket;
	onchain: MarketOnchain;
};

export type DiscoverMarketsOptions = {
	asset?: 'BTC' | 'ETH';
	limit?: number;
};

export async function discoverTradableBinaryMarkets(
	exchange: SomniaMarkets,
	options: DiscoverMarketsOptions = {}
): Promise<TradableBinaryMarket[]> {
	const markets = await exchange.client.listLiveBinaryMarkets({
		asset: options.asset,
		status: 'Trading',
		orderBy: 'closingSoon',
		limit: options.limit ?? 20
	});

	const now = BigInt(Math.floor(Date.now() / 1000));
	const checkedMarkets = await Promise.all(
		markets.map(async (market) => {
			const onchain = await exchange.client.getMarketOnchain(market.marketId);

			if (onchain.status !== 1 || onchain.expiry <= now) {
				return null;
			}

			return { market, onchain };
		})
	);

	return checkedMarkets.filter((market): market is TradableBinaryMarket => market !== null);
}

export async function readBinaryOrderBook(
	exchange: SomniaMarkets,
	market: TradableBinaryMarket,
	depth = 5
): Promise<BinaryOrderBook> {
	return exchange.client.getBinaryOrderBook(market.market.poolAddress, {
		depth,
		decimals: market.onchain.decimals
	});
}

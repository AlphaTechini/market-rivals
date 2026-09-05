import { formatUnits, isHash, type Address, type Hash, type Hex } from 'viem';
import type {
	BinaryMarket,
	MarketOnchain,
	SomniaMarkets,
	UnifiedMarket
} from '@somnia-chain/markets-sdk';
import { discoverTradableBinaryMarkets } from './markets';
import { createBrowserDreamdexExchange } from './wallet';

export type PredictionSide = 'UP' | 'DOWN';

export type LiveBinaryTradeContext = {
	exchange: SomniaMarkets;
	account: Address;
	marketId: Hex;
	marketAddress: Address;
	poolAddress: Address;
	question: string;
	expiry: number;
	upSymbol: string;
	downSymbol: string;
	upPrice: number | null;
	downPrice: number | null;
	contractQuantity: number;
	decimals: number;
};

export type PlacedPrediction = {
	transactionHash: Hash;
	marketId: string;
	marketSymbol: string;
	direction: PredictionSide;
	filledQuantity: string;
	averageFillPrice: string | null;
	orderStatus: string;
};

function unifiedMarketFor(
	markets: Record<string, UnifiedMarket>,
	marketId: string
): UnifiedMarket | undefined {
	return Object.values(markets).find((market) => {
		if (market.type !== 'binary') return false;
		const info = market.info as BinaryMarket;
		return info.marketId.toLowerCase() === marketId.toLowerCase();
	});
}

function bestAsk(book: { asks: [number, number][] }): number | null {
	return book.asks[0]?.[0] ?? null;
}

async function tradeContextForMarket(
	exchange: SomniaMarkets,
	account: Address,
	marketId: Hex,
	onchain: MarketOnchain,
	question: string
): Promise<LiveBinaryTradeContext> {
	const markets = await exchange.loadMarkets();
	const unified = unifiedMarketFor(markets, marketId);
	const outcomes = unified?.outcomes;
	if (!unified || unified.type !== 'binary' || !outcomes || outcomes.length < 2) {
		throw new Error('The live market has no usable Up/Down outcome symbols.');
	}

	const up = outcomes[0];
	const down = outcomes[1];
	const [upBook, downBook] = await Promise.all([
		exchange.fetchOrderBook(up.symbol, 5),
		exchange.fetchOrderBook(down.symbol, 5)
	]);

	return {
		exchange,
		account,
		marketId,
		marketAddress: onchain.marketAddress,
		poolAddress: onchain.pool,
		question,
		expiry: Number(onchain.expiry),
		upSymbol: up.symbol,
		downSymbol: down.symbol,
		upPrice: bestAsk(upBook),
		downPrice: bestAsk(downBook),
		contractQuantity: 10,
		decimals: onchain.decimals
	};
}

export async function prepareLiveBinaryTrade(
	asset: 'BTC' | 'ETH'
): Promise<LiveBinaryTradeContext> {
	const { exchange, account } = await createBrowserDreamdexExchange();
	const [candidate] = await discoverTradableBinaryMarkets(exchange, { asset, limit: 10 });
	if (!candidate) throw new Error(`No live ${asset} Up/Down Event Contract is trading right now.`);

	return tradeContextForMarket(
		exchange,
		account,
		candidate.market.marketId,
		candidate.onchain,
		candidate.market.question
	);
}

export async function prepareRoundTrade(marketId: string): Promise<LiveBinaryTradeContext> {
	if (!/^0x[0-9a-f]{64}$/i.test(marketId)) {
		throw new Error('The round is not bound to a valid DreamDEX market yet.');
	}
	const { exchange, account } = await createBrowserDreamdexExchange();
	const onchain = await exchange.client.getMarketOnchain(marketId as Hex);
	if (onchain.status !== 1) {
		throw new Error('This round is no longer trading on DreamDEX.');
	}
	const market = await exchange.client.getBinaryMarket(marketId as Hex);

	return tradeContextForMarket(
		exchange,
		account,
		marketId as Hex,
		onchain,
		market?.question ?? 'Live Up/Down market'
	);
}

export async function placeMarketIocPrediction(
	context: LiveBinaryTradeContext,
	direction: PredictionSide,
	slippage = 0.02
): Promise<PlacedPrediction> {
	const onchain = await context.exchange.client.getMarketOnchain(context.marketId);
	const now = BigInt(Math.floor(Date.now() / 1000));
	if (onchain.status !== 1 || onchain.expiry <= now) {
		throw new Error('This Event Contract stopped trading before the order was submitted.');
	}

	const marketSymbol = direction === 'UP' ? context.upSymbol : context.downSymbol;
	const order = await context.exchange.createOrder(
		marketSymbol,
		'market',
		'buy',
		context.contractQuantity,
		undefined,
		{ slippage }
	);
	if (!order.txHash || !isHash(order.txHash))
		throw new Error('DreamDEX returned no valid transaction hash for the order.');

	const info = order.info as {
		fills?: Array<{ quantityFilled: bigint; fillPrice: bigint }>;
	};
	const fills = info.fills ?? [];
	const filledRaw = fills.reduce((total, fill) => total + fill.quantityFilled, 0n);
	const weightedPriceRaw = fills.reduce(
		(total, fill) => total + fill.fillPrice * fill.quantityFilled,
		0n
	);
	const averageYesPriceRaw = filledRaw > 0n ? weightedPriceRaw / filledRaw : null;
	const averageOutcomePriceRaw =
		averageYesPriceRaw === null
			? null
			: direction === 'UP'
				? averageYesPriceRaw
				: 10n ** BigInt(context.decimals) - averageYesPriceRaw;

	return {
		transactionHash: order.txHash,
		marketId: context.marketId,
		marketSymbol,
		direction,
		filledQuantity: formatUnits(filledRaw, context.decimals),
		averageFillPrice:
			averageOutcomePriceRaw === null
				? null
				: formatUnits(averageOutcomePriceRaw, context.decimals),
		orderStatus: order.status
	};
}

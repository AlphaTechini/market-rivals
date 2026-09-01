const priceScale = 1_000_000_000_000_000_000n;

export type RoundScoreInput = {
	selectedSide: 'UP' | 'DOWN';
	winningSide: 'UP' | 'DOWN';
	averageFillPrice: string;
	filledQuantity: string;
};

export type RoundScoreResult = {
	settlementValue: '0' | '1';
	correct: boolean;
	roundScore: string;
	actualTestnetPnl: string;
};

function parseScaledDecimal(value: string): bigint {
	if (!/^\d+(\.\d+)?$/.test(value)) throw new Error('Decimal value must be non-negative.');

	const [whole, fraction = ''] = value.split('.');
	if (fraction.length > 18) throw new Error('Decimal value exceeds 18 places.');
	return BigInt(whole) * priceScale + BigInt(fraction.padEnd(18, '0') || '0');
}

function formatScaledDecimal(value: bigint, scale: bigint, decimalPlaces: number): string {
	const negative = value < 0n;
	const absolute = negative ? -value : value;
	const whole = absolute / scale;
	const fraction = ((absolute % scale) * 10n ** BigInt(decimalPlaces)) / scale;
	const fractionText = fraction.toString().padStart(decimalPlaces, '0').replace(/0+$/, '');
	return `${negative ? '-' : ''}${whole}${fractionText ? `.${fractionText}` : ''}`;
}

export function calculateRoundScore(input: RoundScoreInput): RoundScoreResult {
	const filledQuantity = BigInt(input.filledQuantity);
	if (filledQuantity <= 0n) throw new Error('A scored round requires a positive filled quantity.');

	const averageFillPrice = parseScaledDecimal(input.averageFillPrice);
	if (averageFillPrice > priceScale) throw new Error('Average fill price must be between 0 and 1.');

	const correct = input.selectedSide === input.winningSide;
	const settlementValue = correct ? '1' : '0';
	const settlement = correct ? priceScale : 0n;
	const difference = settlement - averageFillPrice;

	return {
		settlementValue,
		correct,
		roundScore: formatScaledDecimal(difference * 100n, priceScale, 8),
		actualTestnetPnl: formatScaledDecimal(filledQuantity * difference, priceScale, 18)
	};
}

export function missedRoundScore(): RoundScoreResult {
	return {
		settlementValue: '0',
		correct: false,
		roundScore: '-100',
		actualTestnetPnl: '0'
	};
}

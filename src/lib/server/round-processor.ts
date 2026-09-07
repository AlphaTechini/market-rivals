import { and, asc, eq, inArray, isNull, lte, not, sql } from 'drizzle-orm';
import { formatUnits } from 'viem';
import type {
	BinaryMarket,
	FillRow,
	MarketOnchain,
	SomniaMarkets
} from '@somnia-chain/markets-sdk';
import { createDreamdexExchange } from '$lib/dreamdex/config';
import { getDb } from '$lib/server/db';
import { calculateRoundScore, missedRoundScore, type RoundScoreResult } from '$lib/server/scoring';
import {
	arenaPicks,
	arenaParticipants,
	arenaRounds,
	arenas,
	achievements
} from '$lib/server/db/schema';

const terminalRoundStatuses = ['SETTLED', 'VOIDED', 'MISSED'] as const;
const processorBatchSize = 8;

type ProcessorResult = {
	arenasStarted: number;
	roundsBound: number;
	roundsLocked: number;
	roundsSettled: number;
	roundsVoided: number;
	scoresApplied: number;
	missedApplied: number;
};

type FillAggregate = {
	quantity: bigint;
	averageOutcomePrice: string;
	actualCost: string;
};

type FinalRankParticipant = typeof arenaParticipants.$inferSelect & {
	finalRoundScore: string | null;
	finalSubmittedAt: Date | null;
};

function parseRawInteger(value: string, label: string): bigint {
	if (!/^\d+$/.test(value)) throw new Error(`${label} must be a non-negative integer.`);
	return BigInt(value);
}

function compareDecimalStrings(left: string, right: string): number {
	const normalize = (value: string) => {
		const negative = value.startsWith('-');
		const unsigned = negative ? value.slice(1) : value;
		const [whole, fraction = ''] = unsigned.split('.');
		const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0';
		const normalizedFraction = fraction.replace(/0+$/, '');
		return {
			negative,
			whole: normalizedWhole,
			fraction: normalizedFraction
		};
	};

	const a = normalize(left);
	const b = normalize(right);
	if (a.negative !== b.negative) return a.negative ? -1 : 1;

	const magnitude =
		a.whole.length !== b.whole.length
			? a.whole.length - b.whole.length
			: a.whole.localeCompare(b.whole) ||
				a.fraction
					.padEnd(Math.max(a.fraction.length, b.fraction.length), '0')
					.localeCompare(b.fraction.padEnd(Math.max(a.fraction.length, b.fraction.length), '0'));

	return a.negative ? -magnitude : magnitude;
}

function compareNullableDecimalDescending(left: string | null, right: string | null): number {
	if (left === null && right === null) return 0;
	if (left === null) return 1;
	if (right === null) return -1;
	return compareDecimalStrings(right, left);
}

function compareNullableDateAscending(left: Date | null, right: Date | null): number {
	if (!left && !right) return 0;
	if (!left) return 1;
	if (!right) return -1;
	return left.getTime() - right.getTime();
}

function selectWinningSide(winningOutcome: number): 'UP' | 'DOWN' {
	if (winningOutcome === 0) return 'UP';
	if (winningOutcome === 1) return 'DOWN';
	throw new Error(`DreamDEX returned an unsupported winning outcome: ${winningOutcome}`);
}

function aggregatePickFills(
	pick: typeof arenaPicks.$inferSelect,
	fills: FillRow[],
	decimals: number,
	selectedSide: 'UP' | 'DOWN',
	marketId: string
): FillAggregate | null {
	if (!pick.orderTransactionHash) return null;

	const expectedTakerSide = selectedSide === 'UP' ? 'BUY_YES' : 'BUY_NO';
	const matchingFills = fills.filter((fill) => {
		if (fill.txHash.toLowerCase() !== pick.orderTransactionHash?.toLowerCase()) return false;
		if (fill.market.toLowerCase() !== marketId.toLowerCase()) return false;
		const takerSide = fill.takerOrder?.side ?? fill.takerSide;
		if (takerSide && takerSide !== expectedTakerSide) return false;
		if (fill.taker && fill.taker.toLowerCase() !== pick.walletAddress.toLowerCase()) return false;
		return true;
	});

	if (matchingFills.length === 0) return null;

	let quantity = 0n;
	let weightedPrice = 0n;
	for (const fill of matchingFills) {
		const fillQuantity = parseRawInteger(fill.quantity, 'Fill quantity');
		const fillPrice = parseRawInteger(fill.fillPrice, 'Fill price');
		if (fillQuantity <= 0n) continue;
		quantity += fillQuantity;
		weightedPrice += fillQuantity * fillPrice;
	}
	if (quantity <= 0n) return null;

	const scale = 10n ** BigInt(decimals);
	const averageYesPrice = weightedPrice / (quantity || 1n);
	if (averageYesPrice > scale) return null;
	const averageOutcomePrice = selectedSide === 'UP' ? averageYesPrice : scale - averageYesPrice;
	const actualCostRaw = (quantity * averageOutcomePrice) / (scale || 1n);

	return {
		quantity,
		averageOutcomePrice: formatUnits(averageOutcomePrice, decimals),
		actualCost: formatUnits(actualCostRaw, decimals)
	};
}

async function liveMarketsFor(exchange: SomniaMarkets, asset: 'BTC' | 'ETH', now: Date) {
	const nowSeconds = Math.floor(now.getTime() / 1000);
	const markets = await exchange.client.listLiveBinaryMarkets({
		asset,
		status: 'Trading',
		orderBy: 'closingSoon',
		limit: 20,
		nowSec: nowSeconds
	});

	const checked = await Promise.all(
		markets.map(async (market) => {
			const onchain = await exchange.client.getMarketOnchain(market.marketId);
			if (
				onchain.status !== 1 ||
				onchain.expiry <= BigInt(nowSeconds) ||
				BigInt(market.tradingStart) > BigInt(nowSeconds)
			) {
				return null;
			}
			return { market, onchain };
		})
	);

	return checked.filter(
		(value): value is { market: BinaryMarket; onchain: MarketOnchain } => value !== null
	);
}

async function bindScheduledRounds(
	exchange: SomniaMarkets,
	arenaId: string,
	now: Date,
	result: ProcessorResult
): Promise<void> {
	const db = getDb();
	const dueRounds = await db
		.select({ round: arenaRounds, arena: arenas })
		.from(arenaRounds)
		.innerJoin(arenas, eq(arenaRounds.arenaId, arenas.id))
		.where(
			and(
				eq(arenaRounds.arenaId, arenaId),
				eq(arenas.status, 'LIVE'),
				eq(arenaRounds.status, 'SCHEDULED'),
				lte(arenaRounds.opensAt, now)
			)
		)
		.orderBy(asc(arenaRounds.opensAt))
		.limit(processorBatchSize);

	const marketsByAsset = new Map<'BTC' | 'ETH', Awaited<ReturnType<typeof liveMarketsFor>>>();
	for (const asset of ['BTC', 'ETH'] as const) {
		marketsByAsset.set(asset, await liveMarketsFor(exchange, asset, now));
	}

	const assignedByArena = new Map<string, Set<string>>();
	for (const { round } of dueRounds) {
		let assigned = assignedByArena.get(round.arenaId);
		if (!assigned) {
			const existing = await db
				.select({ marketId: arenaRounds.dreamDexMarketId })
				.from(arenaRounds)
				.where(eq(arenaRounds.arenaId, round.arenaId));
			assigned = new Set(
				existing
					.map(({ marketId }) => marketId?.toLowerCase())
					.filter((marketId): marketId is string => Boolean(marketId))
			);
			assignedByArena.set(round.arenaId, assigned);
		}

		const roundAsset = round.asset === 'BTC' ? 'BTC' : 'ETH';
		const opensAtSeconds = BigInt(Math.floor(round.opensAt.getTime() / 1000));
		const phaseFloor = opensAtSeconds + 8n * 60n;
		const candidates = (marketsByAsset.get(roundAsset) ?? [])
			.filter(({ market }) => !assigned.has(market.marketId.toLowerCase()))
			.sort((a, b) => {
				// prefer windows that outlive the voting phase; otherwise soonest expiry
				const aCovers = BigInt(a.market.expiry) >= phaseFloor ? 0 : 1;
				const bCovers = BigInt(b.market.expiry) >= phaseFloor ? 0 : 1;
				return aCovers - bCovers;
			});
		const candidate = candidates[0];
		if (!candidate) {
			// no market materialised within 20 minutes of the phase start; void so
			// the arena can still complete without scoring an impossible round
			if (now.getTime() > round.opensAt.getTime() + 20 * 60 * 1000) {
				await voidRound(round.id, now, result);
			}
			continue;
		}

		const bound = await db.transaction(async (tx) => {
			const [current] = await tx
				.select()
				.from(arenaRounds)
				.where(eq(arenaRounds.id, round.id))
				.for('update');
			if (!current || current.status !== 'SCHEDULED' || current.dreamDexMarketId) return false;

			await tx
				.update(arenaRounds)
				.set({
					dreamDexMarketId: candidate.market.marketId,
					marketSymbol: candidate.market.question,
					marketExpiresAt: new Date(Number(candidate.onchain.expiry) * 1000),
					status: 'TRADING'
				})
				.where(eq(arenaRounds.id, current.id));
			return true;
		});

		if (bound) {
			assigned.add(candidate.market.marketId.toLowerCase());
			result.roundsBound += 1;
		}
	}
}

async function lockExpiredRound(
	roundId: string,
	now: Date,
	hardCutMs: number,
	result: ProcessorResult
): Promise<void> {
	const db = getDb();
	const locked = await db.transaction(async (tx) => {
		const [round] = await tx
			.select()
			.from(arenaRounds)
			.where(eq(arenaRounds.id, roundId))
			.for('update');
		if (!round || round.status !== 'TRADING' || now.getTime() < hardCutMs) return false;
		await tx.update(arenaRounds).set({ status: 'LOCKED' }).where(eq(arenaRounds.id, round.id));
		return true;
	});
	if (locked) result.roundsLocked += 1;
}

async function finishArenaIfComplete(
	tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0],
	arenaId: string,
	now: Date
): Promise<void> {
	const unfinished = await tx
		.select({ id: arenaRounds.id })
		.from(arenaRounds)
		.where(
			and(eq(arenaRounds.arenaId, arenaId), not(inArray(arenaRounds.status, terminalRoundStatuses)))
		)
		.limit(1);
	if (unfinished.length > 0) return;

	const [arena] = await tx.select().from(arenas).where(eq(arenas.id, arenaId)).limit(1);
	if (!arena || arena.status !== 'LIVE') return;

	const participants = await tx
		.select()
		.from(arenaParticipants)
		.where(eq(arenaParticipants.arenaId, arenaId));
	const [finalRound] = await tx
		.select()
		.from(arenaRounds)
		.where(and(eq(arenaRounds.arenaId, arenaId), eq(arenaRounds.roundNumber, arena.roundCount)))
		.limit(1);
	const finalPicks = finalRound
		? await tx.select().from(arenaPicks).where(eq(arenaPicks.roundId, finalRound.id))
		: [];
	const finalPickByParticipant = new Map(finalPicks.map((pick) => [pick.participantId, pick]));

	const ranked: FinalRankParticipant[] = participants.map((participant) => {
		const finalPick = finalPickByParticipant.get(participant.id);
		return {
			...participant,
			finalRoundScore: finalPick?.roundScore ?? null,
			finalSubmittedAt: finalPick?.status === 'CONFIRMED' ? finalPick.submittedAt : null
		};
	});

	ranked.sort(
		(a, b) =>
			compareDecimalStrings(b.totalScore, a.totalScore) ||
			b.correctRounds - a.correctRounds ||
			compareDecimalStrings(b.totalTestnetPnl, a.totalTestnetPnl) ||
			compareNullableDecimalDescending(a.finalRoundScore, b.finalRoundScore) ||
			compareNullableDateAscending(a.finalSubmittedAt, b.finalSubmittedAt) ||
			compareNullableDateAscending(a.joinedAt, b.joinedAt) ||
			a.id.localeCompare(b.id)
	);

	for (const [index, participant] of ranked.entries()) {
		await tx
			.update(arenaParticipants)
			.set({ finalRank: index + 1 })
			.where(eq(arenaParticipants.id, participant.id));
	}

	const awards = ranked
		.filter((participant, index) => index === 0 || participant.correctRounds === arena.roundCount)
		.map((participant, index) =>
			index === 0 && ranked[0].id === participant.id
				? {
						participantId: participant.id,
						arenaId,
						type: 'WINNER',
						title: 'Arena Champion',
						metadata: { rank: 1, totalScore: participant.totalScore }
					}
				: {
						participantId: participant.id,
						arenaId,
						type: 'CLEAN_SWEEP',
						title: 'Clean Sweep',
						metadata: { correctRounds: participant.correctRounds }
					}
		);
	if (awards.length > 0) {
		await tx.insert(achievements).values(awards).onConflictDoNothing();
	}
	await tx
		.update(arenas)
		.set({ status: 'COMPLETED', completedAt: now })
		.where(and(eq(arenas.id, arenaId), eq(arenas.status, 'LIVE')));
}

async function settleRound(
	exchange: SomniaMarkets,
	roundId: string,
	onchain: MarketOnchain,
	now: Date,
	result: ProcessorResult
): Promise<void> {
	const db = getDb();
	const [round] = await db.select().from(arenaRounds).where(eq(arenaRounds.id, roundId)).limit(1);
	if (!round || !round.dreamDexMarketId) return;

	const resolution = await exchange.client.getMarketResolution(round.dreamDexMarketId);
	const winningSide = selectWinningSide(onchain.winningOutcome);
	const picks = await db.select().from(arenaPicks).where(eq(arenaPicks.roundId, round.id));
	const confirmedPicks = picks.filter(
		(pick) => pick.status === 'CONFIRMED' && pick.roundScore === null
	);
	const fills =
		confirmedPicks.length > 0
			? await exchange.client.getFills(onchain.pool, {
					limit: 500,
					since: Math.floor(round.opensAt.getTime() / 1000),
					until: Math.floor(now.getTime() / 1000)
				})
			: [];
	const scoreByPick = new Map<
		string,
		{
			score: RoundScoreResult;
			actualCost: string;
			filledQuantity: string;
			averageFillPrice: string;
		}
	>();
	for (const pick of confirmedPicks) {
		const aggregate = aggregatePickFills(
			pick,
			fills,
			onchain.decimals,
			pick.selectedSide,
			round.dreamDexMarketId
		);
		if (!aggregate) return;
		const score = calculateRoundScore({
			selectedSide: pick.selectedSide,
			winningSide,
			averageFillPrice: aggregate.averageOutcomePrice,
			filledQuantity: formatUnits(aggregate.quantity, onchain.decimals)
		});
		scoreByPick.set(pick.id, {
			score,
			actualCost: aggregate.actualCost,
			filledQuantity: formatUnits(aggregate.quantity, onchain.decimals),
			averageFillPrice: aggregate.averageOutcomePrice
		});
	}

	const settled = await db.transaction(async (tx) => {
		const [current] = await tx
			.select()
			.from(arenaRounds)
			.where(eq(arenaRounds.id, round.id))
			.for('update');
		if (!current || (current.status !== 'LOCKED' && current.status !== 'TRADING')) return false;

		const currentPicks = await tx
			.select()
			.from(arenaPicks)
			.where(eq(arenaPicks.roundId, current.id));
		const currentParticipants = await tx
			.select()
			.from(arenaParticipants)
			.where(eq(arenaParticipants.arenaId, current.arenaId));
		const pickByParticipant = new Map(currentPicks.map((pick) => [pick.participantId, pick]));
		let scoresApplied = 0;
		let missedApplied = 0;

		for (const participant of currentParticipants) {
			const pick = pickByParticipant.get(participant.id);
			if (pick?.status === 'CONFIRMED') {
				if (pick.roundScore !== null) continue;
				const scored = scoreByPick.get(pick.id);
				if (!scored) throw new Error('Authoritative fill evidence disappeared before settlement.');
				await tx
					.update(arenaPicks)
					.set({
						averageFillPrice: scored.averageFillPrice,
						filledQuantity: scored.filledQuantity,
						actualCost: scored.actualCost,
						settlementValue: scored.score.settlementValue,
						roundScore: scored.score.roundScore,
						actualTestnetPnl: scored.score.actualTestnetPnl
					})
					.where(and(eq(arenaPicks.id, pick.id), isNull(arenaPicks.roundScore)));
				await tx
					.update(arenaParticipants)
					.set({
						totalScore: sql`${arenaParticipants.totalScore} + cast(${scored.score.roundScore} as numeric)`,
						correctRounds: sql`${arenaParticipants.correctRounds} + ${scored.score.correct ? 1 : 0}`,
						totalTestnetPnl: sql`${arenaParticipants.totalTestnetPnl} + cast(${scored.score.actualTestnetPnl} as numeric)`
					})
					.where(eq(arenaParticipants.id, participant.id));
				scoresApplied += 1;
				continue;
			}

			const missed = missedRoundScore();
			if (pick) {
				if (pick.roundScore !== null) continue;
				await tx
					.update(arenaPicks)
					.set({
						status: 'MISSED',
						settlementValue: missed.settlementValue,
						roundScore: missed.roundScore,
						actualTestnetPnl: missed.actualTestnetPnl
					})
					.where(and(eq(arenaPicks.id, pick.id), isNull(arenaPicks.roundScore)));
			}
			await tx
				.update(arenaParticipants)
				.set({
					totalScore: sql`${arenaParticipants.totalScore} + cast(${missed.roundScore} as numeric)`,
					missedRounds: sql`${arenaParticipants.missedRounds} + 1`
				})
				.where(eq(arenaParticipants.id, participant.id));
			missedApplied += 1;
		}

		await tx
			.update(arenaRounds)
			.set({
				status: 'SETTLED',
				settlesAt: now,
				winningSide,
				openingPrice: resolution.openingAnswer?.numericValue ?? null,
				closingPrice: resolution.closingAnswer?.numericValue ?? null
			})
			.where(eq(arenaRounds.id, current.id));
		await finishArenaIfComplete(tx, current.arenaId, now);
		result.scoresApplied += scoresApplied;
		result.missedApplied += missedApplied;
		return true;
	});

	if (settled) result.roundsSettled += 1;
}

async function voidRound(roundId: string, now: Date, result: ProcessorResult): Promise<void> {
	const db = getDb();
	const voided = await db.transaction(async (tx) => {
		const [round] = await tx
			.select()
			.from(arenaRounds)
			.where(eq(arenaRounds.id, roundId))
			.for('update');
		if (
			!round ||
			(round.status !== 'SCHEDULED' && round.status !== 'LOCKED' && round.status !== 'TRADING')
		) {
			return false;
		}
		await tx
			.update(arenaRounds)
			.set({ status: 'VOIDED', settlesAt: now, winningSide: null })
			.where(eq(arenaRounds.id, round.id));
		await finishArenaIfComplete(tx, round.arenaId, now);
		return true;
	});
	if (voided) result.roundsVoided += 1;
}

async function processActiveRounds(
	exchange: SomniaMarkets,
	arenaId: string,
	now: Date,
	result: ProcessorResult
): Promise<void> {
	const db = getDb();
	const activeRounds = await db
		.select({ round: arenaRounds })
		.from(arenaRounds)
		.innerJoin(arenas, eq(arenaRounds.arenaId, arenas.id))
		.where(
			and(
				eq(arenaRounds.arenaId, arenaId),
				eq(arenas.status, 'LIVE'),
				not(inArray(arenaRounds.status, terminalRoundStatuses)),
				inArray(arenaRounds.status, ['TRADING', 'LOCKED'])
			)
		)
		.orderBy(asc(arenaRounds.locksAt))
		.limit(processorBatchSize);

	for (const { round } of activeRounds) {
		if (!round.dreamDexMarketId) continue;
		const onchain = await exchange.client.getMarketOnchain(round.dreamDexMarketId as `0x${string}`);
		if (onchain.isVoided || onchain.status === 5) {
			await voidRound(round.id, now, result);
			continue;
		}
		const hardCutMs = Number(onchain.expiry) * 1000 - 60_000;
		if (!onchain.isResolved && onchain.status < 2 && now.getTime() < hardCutMs) continue;
		if (!onchain.isResolved) {
			await lockExpiredRound(round.id, now, hardCutMs, result);
			continue;
		}
		await settleRound(exchange, round.id, onchain, now, result);
	}
}

export async function reconcileArena(arenaId: string, now = new Date()): Promise<ProcessorResult> {
	const db = getDb();
	const started = await db
		.update(arenas)
		.set({ status: 'LIVE' })
		.where(and(eq(arenas.id, arenaId), eq(arenas.status, 'JOINING'), lte(arenas.startAt, now)))
		.returning({ id: arenas.id });
	const result: ProcessorResult = {
		arenasStarted: started.length,
		roundsBound: 0,
		roundsLocked: 0,
		roundsSettled: 0,
		roundsVoided: 0,
		scoresApplied: 0,
		missedApplied: 0
	};

	const [arena] = await db
		.select({ status: arenas.status })
		.from(arenas)
		.where(eq(arenas.id, arenaId));
	if (!arena || arena.status !== 'LIVE') return result;

	const exchange = createDreamdexExchange();
	try {
		await bindScheduledRounds(exchange, arenaId, now, result);
		await processActiveRounds(exchange, arenaId, now, result);
		return result;
	} finally {
		await exchange.close();
	}
}

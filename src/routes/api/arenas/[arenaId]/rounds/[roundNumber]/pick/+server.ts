import { env } from '$env/dynamic/private';
import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { createPublicClient, http, isHash, type Hex } from 'viem';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';
import { getSessionProfile } from '$lib/server/auth/session';
import { getDb } from '$lib/server/db';
import { arenaPicks, arenaParticipants, arenaRounds } from '$lib/server/db/schema';
import { isUuid, readJson, stringField } from '$lib/server/http';
import { roundPickDeadline } from '$lib/server/round-timing';
import { createDreamdexExchange } from '$lib/dreamdex/config';

const decimalPattern = /^\d+(\.\d{1,18})?$/;
const rpcUrl = env.DREAMDEX_RPC_URL?.trim() || somniaShannon.rpcUrls.default.http[0];
const publicClient = createPublicClient({ chain: somniaShannon, transport: http(rpcUrl) });

const changeWindowMs = 3 * 60 * 1000;

function isDirection(value: string | null): value is 'UP' | 'DOWN' {
	return value === 'UP' || value === 'DOWN';
}

export async function POST(event) {
	const profile = await getSessionProfile(event);
	if (!profile) return json({ error: 'Authentication required.' }, { status: 401 });
	if (!isUuid(event.params.arenaId)) return json({ error: 'Invalid arena id.' }, { status: 400 });

	const roundNumber = Number(event.params.roundNumber);
	if (!Number.isSafeInteger(roundNumber) || roundNumber < 1) {
		return json({ error: 'Invalid round number.' }, { status: 400 });
	}

	const body = await readJson(event.request);
	const marketId = stringField(body, 'marketId');
	const marketSymbol = stringField(body, 'marketSymbol');
	const direction = stringField(body, 'direction');
	const transactionHash = stringField(body, 'orderTransactionHash');
	const filledQuantity = stringField(body, 'filledQuantity');
	const averageFillPrice = stringField(body, 'averageFillPrice');

	if (
		!marketId ||
		!/^0x[0-9a-f]{64}$/i.test(marketId) ||
		!marketSymbol ||
		!isDirection(direction)
	) {
		return json(
			{ error: 'Market id, outcome symbol, and direction are required.' },
			{ status: 400 }
		);
	}
	if (
		!transactionHash ||
		!isHash(transactionHash) ||
		!filledQuantity ||
		!decimalPattern.test(filledQuantity)
	) {
		return json(
			{ error: 'A valid transaction hash and filled quantity are required.' },
			{ status: 400 }
		);
	}
	if (averageFillPrice !== null && !decimalPattern.test(averageFillPrice)) {
		return json({ error: 'Average fill price must be a decimal value.' }, { status: 400 });
	}
	if (Number(filledQuantity) < 0 || (averageFillPrice !== null && Number(averageFillPrice) > 1)) {
		return json({ error: 'Fill values are outside the allowed range.' }, { status: 400 });
	}

	const db = getDb();
	const [round] = await db
		.select()
		.from(arenaRounds)
		.where(
			and(eq(arenaRounds.arenaId, event.params.arenaId), eq(arenaRounds.roundNumber, roundNumber))
		)
		.limit(1);
	if (!round) return json({ error: 'Round not found.' }, { status: 404 });

	const now = new Date();
	const marketCutMs = roundPickDeadline(round.locksAt, round.marketExpiresAt).getTime();
	if (now.getTime() >= marketCutMs) {
		return json({ error: 'Picks are closed for this round.' }, { status: 409 });
	}

	const [participant] = await db
		.select()
		.from(arenaParticipants)
		.where(
			and(
				eq(arenaParticipants.arenaId, event.params.arenaId),
				eq(arenaParticipants.profileId, profile.id)
			)
		)
		.limit(1);
	if (!participant)
		return json({ error: 'Join the arena before submitting a prediction.' }, { status: 403 });

	const exchange = createDreamdexExchange();
	const onchain = await exchange.client.getMarketOnchain(marketId as Hex);
	const [transaction, receipt] = await Promise.all([
		publicClient.getTransaction({ hash: transactionHash }),
		publicClient.getTransactionReceipt({ hash: transactionHash })
	]);

	if (receipt.status !== 'success')
		return json({ error: 'The DreamDEX transaction reverted.' }, { status: 400 });
	if (transaction.from.toLowerCase() !== profile.walletAddress.toLowerCase()) {
		return json(
			{ error: 'The transaction sender does not match the signed profile.' },
			{ status: 403 }
		);
	}
	if (!transaction.to || transaction.to.toLowerCase() !== onchain.pool.toLowerCase()) {
		return json(
			{ error: 'The transaction target does not match the Event Contract pool.' },
			{ status: 400 }
		);
	}

	const status = Number(filledQuantity) > 0 ? 'CONFIRMED' : 'MISSED';
	let result: { pick: { id: string; status: string }; changed: boolean };
	try {
		result = await db.transaction(async (tx) => {
			const [freshRound] = await tx
				.select()
				.from(arenaRounds)
				.where(eq(arenaRounds.id, round.id))
				.limit(1);
			if (!freshRound) throw new Error('Round disappeared before pick persistence.');
			if (
				freshRound.dreamDexMarketId &&
				freshRound.dreamDexMarketId.toLowerCase() !== marketId.toLowerCase()
			) {
				throw new Error('This round is bound to a different DreamDEX market.');
			}
			if (!freshRound.dreamDexMarketId) {
				await tx
					.update(arenaRounds)
					.set({
						dreamDexMarketId: marketId,
						marketSymbol,
						marketExpiresAt: new Date(Number(onchain.expiry) * 1000),
						status: 'TRADING'
					})
					.where(eq(arenaRounds.id, round.id));
			}

			const [existingPick] = await tx
				.select()
				.from(arenaPicks)
				.where(and(eq(arenaPicks.roundId, round.id), eq(arenaPicks.participantId, participant.id)))
				.limit(1);

			if (existingPick) {
				if (existingPick.status === 'CONFIRMED' && existingPick.roundScore !== null) {
					throw new Error('This round is already settled; the pick cannot change.');
				}
				const firstAt = existingPick.initialSubmittedAt ?? existingPick.submittedAt ?? now;
				const changeDeadlineMs = Math.min(
					firstAt.getTime() + changeWindowMs,
					roundPickDeadline(freshRound.locksAt, freshRound.marketExpiresAt).getTime()
				);
				if (now.getTime() > changeDeadlineMs) {
					throw new Error('The change window for this pick has closed.');
				}
				if (existingPick.selectedSide === direction) {
					throw new Error('The new pick matches the current side.');
				}

				const [changed] = await tx
					.update(arenaPicks)
					.set({
						selectedSide: direction,
						orderTransactionHash: transactionHash,
						averageFillPrice,
						filledQuantity,
						submittedAt: now,
						verifiedAt: now,
						status,
						changedAt: now
					})
					.where(eq(arenaPicks.id, existingPick.id))
					.returning({ id: arenaPicks.id, status: arenaPicks.status });
				return { pick: changed, changed: true };
			}

			const [pick] = await tx
				.insert(arenaPicks)
				.values({
					arenaId: event.params.arenaId,
					roundId: round.id,
					participantId: participant.id,
					walletAddress: profile.walletAddress,
					selectedSide: direction,
					initialSide: direction,
					initialSubmittedAt: now,
					initialTransactionHash: transactionHash,
					orderTransactionHash: transactionHash,
					averageFillPrice,
					filledQuantity,
					submittedAt: now,
					verifiedAt: now,
					status
				})
				.onConflictDoNothing()
				.returning({ id: arenaPicks.id, status: arenaPicks.status });
			if (!pick) throw new Error('A prediction already exists for this round.');
			return { pick, changed: false };
		});
	} catch (cause) {
		return json(
			{ error: cause instanceof Error ? cause.message : 'The pick was rejected.' },
			{ status: 409 }
		);
	}
	return json(
		{
			pickId: result.pick.id,
			status: result.pick.status,
			changed: result.changed,
			transactionHash
		},
		{ status: result.changed ? 200 : 201 }
	);
}

import { and, desc, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { getSessionProfile } from '$lib/server/auth/session';
import { getDb } from '$lib/server/db';
import { isUuid } from '$lib/server/http';
import { arenaPicks, arenaParticipants, arenaRounds, profiles } from '$lib/server/db/schema';
import { getAvatarPublicUrl } from '$lib/server/supabase';
import { buildRoundStage } from '$lib/server/match-stage';

const revealedStatuses = new Set(['LOCKED', 'SETTLED', 'VOIDED']);
const changeWindowMs = 3 * 60 * 1000;
const marketCutBufferMs = 60 * 1000;

export async function GET(event) {
	if (!isUuid(event.params.arenaId)) return json({ error: 'Invalid arena id.' }, { status: 400 });

	const roundNumber = Number(event.params.roundNumber);
	if (!Number.isSafeInteger(roundNumber) || roundNumber < 1) {
		return json({ error: 'Invalid round number.' }, { status: 400 });
	}

	const db = getDb();
	const [row] = await db
		.select({ round: arenaRounds })
		.from(arenaRounds)
		.where(
			and(eq(arenaRounds.arenaId, event.params.arenaId), eq(arenaRounds.roundNumber, roundNumber))
		)
		.limit(1);
	if (!row) return json({ error: 'Round not found.' }, { status: 404 });
	const { round } = row;

	const pickRows = await db
		.select({ pick: arenaPicks, profile: profiles })
		.from(arenaPicks)
		.innerJoin(arenaParticipants, eq(arenaPicks.participantId, arenaParticipants.id))
		.innerJoin(profiles, eq(arenaParticipants.profileId, profiles.id))
		.where(eq(arenaPicks.roundId, round.id))
		.orderBy(desc(arenaPicks.submittedAt));

	const standings = await db
		.select({ participant: arenaParticipants, profile: profiles })
		.from(arenaParticipants)
		.innerJoin(profiles, eq(arenaParticipants.profileId, profiles.id))
		.where(eq(arenaParticipants.arenaId, event.params.arenaId))
		.orderBy(desc(arenaParticipants.totalScore), desc(arenaParticipants.joinedAt));

	const sessionProfile = await getSessionProfile(event);
	const [myParticipant] = sessionProfile
		? await db
				.select()
				.from(arenaParticipants)
				.where(
					and(
						eq(arenaParticipants.arenaId, event.params.arenaId),
						eq(arenaParticipants.profileId, sessionProfile.id)
					)
				)
				.limit(1)
		: [];
	const myPickRow = myParticipant
		? (pickRows.find(({ pick }) => pick.participantId === myParticipant.id) ?? null)
		: null;
	const myPick = myPickRow?.pick ?? null;

	const confirmedPicks = pickRows.filter(({ pick }) => pick.status === 'CONFIRMED');
	const revealed = revealedStatuses.has(round.status);

	const marketCutMs = round.marketExpiresAt
		? round.marketExpiresAt.getTime() - marketCutBufferMs
		: round.locksAt.getTime();
	const now = Date.now();

	let canChange = false;
	let changeDeadline: string | null = null;
	if (myPick && myPick.status === 'CONFIRMED' && myPick.roundScore === null) {
		const firstAt = myPick.initialSubmittedAt ?? myPick.submittedAt;
		if (firstAt) {
			changeDeadline = new Date(
				Math.min(firstAt.getTime() + changeWindowMs, marketCutMs)
			).toISOString();
			canChange = now <= new Date(changeDeadline).getTime();
		}
	}

	const picks = revealed
		? pickRows
				.filter(({ pick }) => pick.status !== 'PENDING')
				.map(({ pick, profile }) => ({
					participantId: pick.participantId,
					displayName: profile.displayName,
					avatarUrl: getAvatarPublicUrl(profile.avatarPath),
					walletAddress: profile.walletAddress,
					selectedSide: pick.selectedSide,
					initialSide: pick.initialSide,
					changed: pick.changedAt !== null,
					status: pick.status,
					averageFillPrice: pick.averageFillPrice,
					filledQuantity: pick.filledQuantity,
					roundScore: pick.roundScore
				}))
		: [];

	const stage = buildRoundStage({
		roundStatus: round.status,
		winningSide: round.winningSide,
		asset: round.asset === 'BTC' ? 'BTC' : 'ETH',
		picks: picks.map((pick) => ({
			participantId: pick.participantId,
			displayName: pick.displayName,
			selectedSide: pick.selectedSide,
			status: pick.status,
			averageFillPrice: pick.averageFillPrice,
			roundScore: pick.roundScore
		})),
		standings: standings.map(({ participant, profile }) => ({
			participantId: participant.id,
			displayName: profile.displayName,
			totalScore: participant.totalScore
		})),
		viewerParticipantId: myParticipant?.id ?? null
	});

	return json({
		round: {
			roundNumber: round.roundNumber,
			asset: round.asset,
			status: round.status,
			marketSymbol: round.marketSymbol,
			dreamDexMarketId: round.dreamDexMarketId,
			opensAt: round.opensAt,
			locksAt: round.locksAt,
			marketExpiresAt: round.marketExpiresAt,
			settlesAt: round.settlesAt,
			winningSide: round.winningSide,
			openingPrice: round.openingPrice,
			closingPrice: round.closingPrice
		},
		pickDeadline: new Date(marketCutMs).toISOString(),
		votePhaseEnd: round.locksAt.toISOString(),
		pickedCount: confirmedPicks.length,
		participantCount: standings.length,
		stage,
		myPick: myPick
			? {
					selectedSide: myPick.selectedSide,
					status: myPick.status,
					averageFillPrice: myPick.averageFillPrice,
					filledQuantity: myPick.filledQuantity,
					roundScore: myPick.roundScore,
					settlementValue: myPick.settlementValue,
					orderTransactionHash: myPick.orderTransactionHash,
					changed: myPick.changedAt !== null,
					submittedAt: myPick.submittedAt
				}
			: null,
		canChange,
		changeDeadline,
		picks,
		standings: standings.map(({ participant, profile }, index) => ({
			participantId: participant.id,
			displayName: profile.displayName,
			avatarUrl: getAvatarPublicUrl(profile.avatarPath),
			walletAddress: profile.walletAddress,
			totalScore: participant.totalScore,
			correctRounds: participant.correctRounds,
			missedRounds: participant.missedRounds,
			finalRank: participant.finalRank,
			rank: participant.finalRank ?? index + 1
		}))
	});
}

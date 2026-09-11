import { asc, desc, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { getSessionProfile } from '$lib/server/auth/session';
import { getDb } from '$lib/server/db';
import { isUuid } from '$lib/server/http';
import {
	achievements,
	arenas,
	arenaParticipants,
	arenaPicks,
	arenaRounds,
	profiles
} from '$lib/server/db/schema';
import { getAvatarPublicUrl } from '$lib/server/supabase';

export async function GET(event) {
	if (!isUuid(event.params.arenaId)) return json({ error: 'Invalid arena id.' }, { status: 400 });

	const db = getDb();
	const [arena] = await db
		.select()
		.from(arenas)
		.where(eq(arenas.id, event.params.arenaId))
		.limit(1);
	if (!arena) return json({ error: 'Arena not found.' }, { status: 404 });

	const participants = await db
		.select({ participant: arenaParticipants, profile: profiles })
		.from(arenaParticipants)
		.innerJoin(profiles, eq(arenaParticipants.profileId, profiles.id))
		.where(eq(arenaParticipants.arenaId, arena.id))
		.orderBy(desc(arenaParticipants.totalScore), desc(arenaParticipants.joinedAt));

	const arenaAchievements = await db
		.select()
		.from(achievements)
		.where(eq(achievements.arenaId, arena.id));

	const [host] = await db
		.select()
		.from(profiles)
		.where(eq(profiles.id, arena.hostProfileId))
		.limit(1);

	const roundRows = await db
		.select({ round: arenaRounds, pick: arenaPicks })
		.from(arenaRounds)
		.leftJoin(arenaPicks, eq(arenaPicks.roundId, arenaRounds.id))
		.where(eq(arenaRounds.arenaId, arena.id))
		.orderBy(asc(arenaRounds.roundNumber));

	type RoundResult = {
		roundNumber: number;
		asset: string;
		status: string;
		winningSide: string | null;
		opensAt: Date;
		locksAt: Date;
		marketExpiresAt: Date | null;
		picks: Array<{
			participantId: string;
			selectedSide: 'UP' | 'DOWN';
			status: string;
			roundScore: string | null;
			averageFillPrice: string | null;
			filledQuantity: string | null;
			changed: boolean;
		}>;
	};
	const rounds: RoundResult[] = [];
	for (const { round, pick } of roundRows) {
		let entry = rounds.find((item) => item.roundNumber === round.roundNumber);
		if (!entry) {
			entry = {
				roundNumber: round.roundNumber,
				asset: round.asset,
				status: round.status,
				winningSide: round.winningSide,
				opensAt: round.opensAt,
				locksAt: round.locksAt,
				marketExpiresAt: round.marketExpiresAt,
				picks: []
			};
			rounds.push(entry);
		}
		if (pick) {
			entry.picks.push({
				participantId: pick.participantId,
				selectedSide: pick.selectedSide,
				status: pick.status,
				roundScore: pick.roundScore,
				averageFillPrice: pick.averageFillPrice,
				filledQuantity: pick.filledQuantity,
				changed: pick.changedAt !== null
			});
		}
	}

	const sessionProfile = await getSessionProfile(event);
	const isHost = sessionProfile?.id === arena.hostProfileId;
	const { inviteCode, ...arenaPublic } = arena;

	return json({
		arena: arenaPublic,
		inviteCode: isHost ? inviteCode : null,
		host: host
			? {
					id: host.id,
					displayName: host.displayName,
					walletAddress: host.walletAddress,
					avatarUrl: getAvatarPublicUrl(host.avatarPath)
				}
			: null,
		participants: participants.map(({ participant, profile }, index) => ({
			participantId: participant.id,
			...participant,
			rank: participant.finalRank ?? index + 1,
			profile: {
				id: profile.id,
				displayName: profile.displayName,
				walletAddress: profile.walletAddress,
				avatarUrl: getAvatarPublicUrl(profile.avatarPath)
			}
		})),
		achievements: arenaAchievements.map((achievement) => ({
			participantId: achievement.participantId,
			type: achievement.type,
			title: achievement.title,
			awardedAt: achievement.awardedAt
		})),
		rounds
	});
}

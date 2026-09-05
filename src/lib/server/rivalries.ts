import { eq, inArray } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { arenaPicks, arenaParticipants, profiles } from '$lib/server/db/schema';
import { getAvatarPublicUrl } from '$lib/server/supabase';

export type RivalryRecord = {
	profileId: string;
	displayName: string;
	avatarUrl: string | null;
	roundsTogether: number;
	wins: number;
	losses: number;
	ties: number;
};

// Head-to-head records are views over verified picks: two players "meet" in a
// round only when both hold confirmed picks with scores in the same arena.
export async function getRivalries(viewerProfileId: string): Promise<RivalryRecord[]> {
	const db = getDb();

	const myArenaIds = (
		await db
			.select({ arenaId: arenaParticipants.arenaId })
			.from(arenaParticipants)
			.where(eq(arenaParticipants.profileId, viewerProfileId))
	).map((row) => row.arenaId);
	if (myArenaIds.length === 0) return [];

	const others = await db
		.select({ profileId: arenaParticipants.profileId, profile: profiles })
		.from(arenaParticipants)
		.innerJoin(profiles, eq(arenaParticipants.profileId, profiles.id))
		.where(inArray(arenaParticipants.arenaId, myArenaIds));

	const picks = await db
		.select({ pick: arenaPicks, profileId: arenaParticipants.profileId })
		.from(arenaPicks)
		.innerJoin(arenaParticipants, eq(arenaPicks.participantId, arenaParticipants.id))
		.where(inArray(arenaPicks.arenaId, myArenaIds));

	const scored = picks.filter(
		({ pick }) => pick.status === 'CONFIRMED' && pick.roundScore !== null
	);
	const byRound = new Map<string, Map<string, number>>();
	for (const { pick, profileId } of scored) {
		const roundMap = byRound.get(pick.roundId) ?? new Map<string, number>();
		roundMap.set(profileId, Number(pick.roundScore));
		byRound.set(pick.roundId, roundMap);
	}

	const records = new Map<string, RivalryRecord>();
	for (const { profileId, profile } of others) {
		if (profileId === viewerProfileId) continue;
		records.set(profileId, {
			profileId,
			displayName: profile.displayName,
			avatarUrl: getAvatarPublicUrl(profile.avatarPath),
			roundsTogether: 0,
			wins: 0,
			losses: 0,
			ties: 0
		});
	}

	for (const roundMap of byRound.values()) {
		const viewerScore = roundMap.get(viewerProfileId);
		if (viewerScore === undefined) continue;
		for (const [opponentProfileId, opponentScore] of roundMap) {
			if (opponentProfileId === viewerProfileId) continue;
			const record = records.get(opponentProfileId);
			if (!record) continue;
			record.roundsTogether += 1;
			if (viewerScore > opponentScore) record.wins += 1;
			else if (viewerScore < opponentScore) record.losses += 1;
			else record.ties += 1;
		}
	}

	return [...records.values()]
		.filter((record) => record.roundsTogether > 0)
		.sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.roundsTogether - a.roundsTogether);
}

export function findTiedRival(records: RivalryRecord[]): RivalryRecord | null {
	return records.find((record) => record.ties > 0 && record.wins === record.losses) ?? null;
}

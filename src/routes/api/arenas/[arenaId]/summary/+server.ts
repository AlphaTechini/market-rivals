import { desc, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { isUuid } from '$lib/server/http';
import { arenas, arenaParticipants, profiles } from '$lib/server/db/schema';
import { getAvatarPublicUrl } from '$lib/server/supabase';

export async function GET({ params }) {
	if (!isUuid(params.arenaId)) return json({ error: 'Invalid arena id.' }, { status: 400 });

	const [arena] = await getDb().select().from(arenas).where(eq(arenas.id, params.arenaId)).limit(1);
	if (!arena) return json({ error: 'Arena not found.' }, { status: 404 });

	const participants = await getDb()
		.select({ participant: arenaParticipants, profile: profiles })
		.from(arenaParticipants)
		.innerJoin(profiles, eq(arenaParticipants.profileId, profiles.id))
		.where(eq(arenaParticipants.arenaId, arena.id))
		.orderBy(desc(arenaParticipants.totalScore), desc(arenaParticipants.joinedAt));

	return json({
		arena,
		participants: participants.map(({ participant, profile }, index) => ({
			...participant,
			rank: participant.finalRank ?? index + 1,
			profile: {
				id: profile.id,
				displayName: profile.displayName,
				walletAddress: profile.walletAddress,
				avatarUrl: getAvatarPublicUrl(profile.avatarPath)
			}
		}))
	});
}

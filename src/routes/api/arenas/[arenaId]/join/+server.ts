import { count, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { getSessionProfile } from '$lib/server/auth/session';
import { getDb } from '$lib/server/db';
import { arenas, arenaParticipants } from '$lib/server/db/schema';
import { isUuid, readJson, stringField } from '$lib/server/http';

export async function POST(event) {
	const profile = await getSessionProfile(event);
	if (!profile) return json({ error: 'Authentication required.' }, { status: 401 });
	if (!isUuid(event.params.arenaId)) return json({ error: 'Invalid arena id.' }, { status: 400 });

	const [arena] = await getDb()
		.select()
		.from(arenas)
		.where(eq(arenas.id, event.params.arenaId))
		.limit(1);
	if (!arena) return json({ error: 'Arena not found.' }, { status: 404 });
	if (arena.status !== 'JOINING')
		return json({ error: 'This arena is no longer accepting players.' }, { status: 409 });

	const body = await readJson(event.request);
	if (arena.accessType === 'PRIVATE' && stringField(body, 'inviteCode') !== arena.inviteCode) {
		return json({ error: 'A valid invite code is required.' }, { status: 403 });
	}

	const [{ playerCount }] = await getDb()
		.select({ playerCount: count(arenaParticipants.id) })
		.from(arenaParticipants)
		.where(eq(arenaParticipants.arenaId, arena.id));
	if (Number(playerCount) >= arena.maximumParticipants)
		return json({ error: 'This arena is full.' }, { status: 409 });

	const [joined] = await getDb()
		.insert(arenaParticipants)
		.values({ arenaId: arena.id, profileId: profile.id, walletAddress: profile.walletAddress })
		.onConflictDoNothing()
		.returning();
	if (!joined) return json({ error: 'This wallet already joined the arena.' }, { status: 409 });

	return json({ participantId: joined.id, arenaId: joined.arenaId }, { status: 201 });
}

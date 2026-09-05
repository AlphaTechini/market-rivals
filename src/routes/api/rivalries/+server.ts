import { json } from '@sveltejs/kit';
import { getSessionProfile } from '$lib/server/auth/session';
import { findTiedRival, getRivalries } from '$lib/server/rivalries';

export async function GET(event) {
	const profile = await getSessionProfile(event);
	if (!profile) return json({ error: 'Authentication required.' }, { status: 401 });

	const records = await getRivalries(profile.id);
	return json({ rivalries: records, tiedRival: findTiedRival(records) });
}

import { json } from '@sveltejs/kit';
import { getSessionProfile } from '$lib/server/auth/session';
import { isUuid } from '$lib/server/http';
import { reconcileArena } from '$lib/server/round-processor';

export async function POST(event) {
	if (!isUuid(event.params.arenaId)) return json({ error: 'Invalid arena id.' }, { status: 400 });
	if (!(await getSessionProfile(event))) {
		return json({ error: 'Authentication required.' }, { status: 401 });
	}

	try {
		return json(await reconcileArena(event.params.arenaId));
	} catch (error) {
		console.error('Arena reconciliation failed.', error);
		return json({ error: 'Arena could not be reconciled.' }, { status: 500 });
	}
}

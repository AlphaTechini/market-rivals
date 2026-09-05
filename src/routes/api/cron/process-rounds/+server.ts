import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { processArenaRounds } from '$lib/server/round-processor';

export async function GET({ request }) {
	const secret = env.CRON_SECRET?.trim();
	if (!secret) return json({ error: 'Cron processor is not configured.' }, { status: 503 });
	if (request.headers.get('authorization') !== `Bearer ${secret}`) {
		return json({ error: 'Unauthorized.' }, { status: 401 });
	}

	try {
		return json(await processArenaRounds());
	} catch (error) {
		console.error('Round processor failed.', error);
		return json({ error: 'Round processor failed.' }, { status: 500 });
	}
}

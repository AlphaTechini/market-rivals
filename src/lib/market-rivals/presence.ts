import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
	if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) {
		throw new Error('Supabase public environment is not configured.');
	}
	client ??= createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);
	return client;
}

export function subscribeToPresence(
	presenceKey: string,
	online: (value: boolean) => void
): () => void {
	const channel: RealtimeChannel = getClient().channel('market-rivals-presence', {
		config: { presence: { key: presenceKey } }
	});
	channel.on('presence', { event: 'sync' }, () => online(true));
	channel.subscribe(async (status) => {
		if (status !== 'SUBSCRIBED') {
			online(false);
			return;
		}
		await channel.track({ online: true, connectedAt: new Date().toISOString() });
		online(true);
	});

	return () => {
		void channel.untrack();
		void getClient().removeChannel(channel);
	};
}

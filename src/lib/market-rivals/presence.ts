import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient> | null = null;

async function getClient(): Promise<SupabaseClient> {
	if (client) return client;
	clientPromise ??= fetch('/api/public-config')
		.then(async (response) => {
			if (!response.ok) throw new Error('Supabase public environment is not configured.');
			return (await response.json()) as { supabaseUrl: string; supabaseKey: string };
		})
		.then(({ supabaseUrl, supabaseKey }) => {
			client = createClient(supabaseUrl, supabaseKey);
			return client;
		});
	return clientPromise;
}

export async function subscribeToPresence(
	presenceKey: string,
	online: (value: boolean) => void
): Promise<() => void> {
	const supabase = await getClient();
	const channel: RealtimeChannel = supabase.channel('market-rivals-presence', {
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
		void supabase.removeChannel(channel);
	};
}

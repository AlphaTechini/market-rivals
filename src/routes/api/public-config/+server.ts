import { json } from '@sveltejs/kit';
import { getSupabasePublishableKey, getSupabaseUrl } from '$lib/server/supabase';

export function GET() {
	const supabaseUrl = getSupabaseUrl();
	const supabaseKey = getSupabasePublishableKey();
	if (!supabaseUrl || !supabaseKey) {
		return json({ error: 'Supabase public configuration is unavailable.' }, { status: 503 });
	}

	return json({ supabaseUrl, supabaseKey });
}

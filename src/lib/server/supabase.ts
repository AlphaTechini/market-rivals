import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export function getSupabaseUrl(): string | null {
	return (
		publicEnv.PUBLIC_SUPABASE_URL ||
		privateEnv.SUPABASE_URL ||
		privateEnv.NEXT_PUBLIC_SUPABASE_URL ||
		null
	);
}

export function getSupabasePublishableKey(): string | null {
	return (
		publicEnv.PUBLIC_SUPABASE_ANON_KEY ||
		privateEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
		privateEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
		privateEnv.SUPABASE_PUBLISHABLE_KEY ||
		privateEnv.SUPABASE_ANON_KEY ||
		null
	);
}

export function getSupabaseAdmin() {
	const url = getSupabaseUrl();
	const secretKey = privateEnv.SUPABASE_SERVICE_ROLE_KEY || privateEnv.SUPABASE_SECRET_KEY;
	if (!url || !secretKey) {
		throw new Error('Supabase URL and service-role or secret key are required');
	}

	return createClient(url, secretKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export function getAvatarPublicUrl(path: string | null): string | null {
	const url = getSupabaseUrl();
	if (!path || !url) return null;
	const bucket = privateEnv.SUPABASE_AVATARS_BUCKET || 'avatars';
	return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

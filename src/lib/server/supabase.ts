import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

export function getSupabaseAdmin() {
	if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
		throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
	}

	return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}

export function getAvatarPublicUrl(path: string | null): string | null {
	if (!path || !env.SUPABASE_URL) return null;
	const bucket = env.SUPABASE_AVATARS_BUCKET || 'avatars';
	return `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

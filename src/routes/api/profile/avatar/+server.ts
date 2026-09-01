import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getSessionProfile } from '$lib/server/auth/session';
import { getDb } from '$lib/server/db';
import { profiles } from '$lib/server/db/schema';
import { getSupabaseAdmin, getAvatarPublicUrl } from '$lib/server/supabase';

const maxAvatarBytes = 5 * 1024 * 1024;
const extensions: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};

export async function POST(event) {
	const profile = await getSessionProfile(event);
	if (!profile) return json({ error: 'Authentication required.' }, { status: 401 });

	const form = await event.request.formData();
	const file = form.get('avatar');
	if (!(file instanceof File) || file.size === 0) {
		return json({ error: 'An avatar image is required.' }, { status: 400 });
	}
	if (!extensions[file.type] || file.size > maxAvatarBytes) {
		return json({ error: 'Avatar must be a JPG, PNG, or WebP image under 5 MB.' }, { status: 400 });
	}

	const bucket = env.SUPABASE_AVATARS_BUCKET || 'avatars';
	const path = `profiles/${profile.id}/${randomUUID()}.${extensions[file.type]}`;
	const { error } = await getSupabaseAdmin().storage.from(bucket).upload(path, file, {
		contentType: file.type,
		cacheControl: '3600',
		upsert: false
	});

	if (error) return json({ error: 'Avatar upload failed.' }, { status: 502 });

	await getDb()
		.update(profiles)
		.set({ avatarPath: path, updatedAt: new Date() })
		.where(eq(profiles.id, profile.id));
	return json({ avatarPath: path, avatarUrl: getAvatarPublicUrl(path) });
}

import { json } from '@sveltejs/kit';
import { getSessionProfile } from '$lib/server/auth/session';
import { getAvatarPublicUrl } from '$lib/server/supabase';

export async function GET(event) {
	const profile = await getSessionProfile(event);
	if (!profile) return json({ profile: null });

	return json({
		profile: {
			id: profile.id,
			displayName: profile.displayName,
			walletAddress: profile.walletAddress,
			avatarUrl: getAvatarPublicUrl(profile.avatarPath)
		}
	});
}

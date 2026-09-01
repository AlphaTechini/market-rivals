import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getAddress, isAddress, isHex, verifyMessage } from 'viem';
import { readJson, stringField } from '$lib/server/http';
import { getDb } from '$lib/server/db';
import { profiles, walletChallenges } from '$lib/server/db/schema';
import { createSessionToken, saveSession } from '$lib/server/auth/session';

export async function POST(event) {
	const body = await readJson(event.request);
	const walletAddress = stringField(body, 'walletAddress');
	const message = stringField(body, 'message');
	const signature = stringField(body, 'signature');
	const displayName = stringField(body, 'displayName');

	if (!walletAddress || !isAddress(walletAddress) || !message || !signature || !isHex(signature)) {
		return json(
			{ error: 'Wallet address, challenge message, and signature are required.' },
			{ status: 400 }
		);
	}
	if (!displayName || displayName.length < 2 || displayName.length > 40) {
		return json({ error: 'Display name must be between 2 and 40 characters.' }, { status: 400 });
	}

	const address = getAddress(walletAddress);
	const db = getDb();
	const [challenge] = await db
		.select()
		.from(walletChallenges)
		.where(eq(walletChallenges.walletAddress, address.toLowerCase()))
		.limit(1);

	if (!challenge || challenge.message !== message || challenge.expiresAt <= new Date()) {
		return json({ error: 'The login challenge is invalid or expired.' }, { status: 401 });
	}

	const valid = await verifyMessage({ address, message, signature });
	if (!valid) return json({ error: 'Wallet signature verification failed.' }, { status: 401 });

	await db
		.insert(profiles)
		.values({ walletAddress: address.toLowerCase(), displayName })
		.onConflictDoUpdate({
			target: profiles.walletAddress,
			set: { displayName, updatedAt: new Date() }
		});

	const [profile] = await db
		.select()
		.from(profiles)
		.where(eq(profiles.walletAddress, address.toLowerCase()))
		.limit(1);
	if (!profile) return json({ error: 'Profile could not be created.' }, { status: 500 });
	await db
		.delete(walletChallenges)
		.where(eq(walletChallenges.walletAddress, address.toLowerCase()));

	const token = createSessionToken();
	await saveSession(event, profile.id, token);

	return json({
		profile: {
			id: profile.id,
			walletAddress: profile.walletAddress,
			displayName: profile.displayName,
			avatarPath: profile.avatarPath
		}
	});
}

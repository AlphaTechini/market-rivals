import { randomBytes } from 'node:crypto';
import { json } from '@sveltejs/kit';
import { isAddress, getAddress } from 'viem';
import { readJson, stringField } from '$lib/server/http';
import { getDb } from '$lib/server/db';
import { walletChallenges } from '$lib/server/db/schema';

export async function POST({ request }) {
	const body = await readJson(request);
	const walletAddress = stringField(body, 'walletAddress');

	if (!walletAddress || !isAddress(walletAddress)) {
		return json({ error: 'A valid wallet address is required.' }, { status: 400 });
	}

	const address = getAddress(walletAddress);
	const nonce = randomBytes(24).toString('hex');
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
	const message = [
		'Market Rivals login',
		`Wallet: ${address}`,
		`Nonce: ${nonce}`,
		`Expires: ${expiresAt.toISOString()}`
	].join('\n');

	await getDb()
		.insert(walletChallenges)
		.values({ walletAddress: address.toLowerCase(), nonce, message, expiresAt })
		.onConflictDoUpdate({
			target: walletChallenges.walletAddress,
			set: { nonce, message, expiresAt, createdAt: new Date() }
		});

	return json({ message, expiresAt: expiresAt.toISOString() });
}

import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { authSessions, profiles } from '$lib/server/db/schema';

export const sessionCookieName = 'market_rivals_session';
const sessionDurationSeconds = 60 * 60 * 24 * 30;

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function createSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

export async function saveSession(
	event: RequestEvent,
	profileId: string,
	token: string
): Promise<void> {
	const db = getDb();
	const expiresAt = new Date(Date.now() + sessionDurationSeconds * 1000);

	await db.insert(authSessions).values({ profileId, tokenHash: hashToken(token), expiresAt });
	event.cookies.set(sessionCookieName, token, {
		httpOnly: true,
		secure: event.url.protocol === 'https:',
		sameSite: 'lax',
		path: '/',
		maxAge: sessionDurationSeconds
	});
}

export async function getSessionProfile(event: RequestEvent) {
	const token = event.cookies.get(sessionCookieName);
	if (!token) return null;

	const [result] = await getDb()
		.select({ profile: profiles, session: authSessions })
		.from(authSessions)
		.innerJoin(profiles, eq(authSessions.profileId, profiles.id))
		.where(eq(authSessions.tokenHash, hashToken(token)))
		.limit(1);

	if (!result || result.session.expiresAt <= new Date()) return null;
	return result.profile;
}

import { and, eq, sql } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';
import { arenas, arenaParticipants, profiles } from '$lib/server/db/schema';
import { getAvatarPublicUrl } from '$lib/server/supabase';

export async function GET({ url }) {
	const assetParam = url.searchParams.get('asset');
	const asset = assetParam === 'BTC' || assetParam === 'ETH' ? assetParam : null;
	if (assetParam && !asset) return json({ error: 'Asset must be BTC or ETH.' }, { status: 400 });

	const conditions = [eq(arenas.status, 'COMPLETED'), eq(arenas.accessType, 'PUBLIC')];
	if (asset) conditions.push(eq(arenas.asset, asset));

	const rows = await getDb()
		.select({
			profileId: profiles.id,
			displayName: profiles.displayName,
			walletAddress: profiles.walletAddress,
			avatarPath: profiles.avatarPath,
			tournaments: sql<number>`count(distinct ${arenaParticipants.arenaId})`,
			totalScore: sql<string>`coalesce(sum(${arenaParticipants.totalScore}), 0)`,
			correctRounds: sql<number>`coalesce(sum(${arenaParticipants.correctRounds}), 0)`
		})
		.from(arenaParticipants)
		.innerJoin(arenas, eq(arenaParticipants.arenaId, arenas.id))
		.innerJoin(profiles, eq(arenaParticipants.profileId, profiles.id))
		.where(and(...conditions))
		.groupBy(profiles.id, profiles.displayName, profiles.walletAddress, profiles.avatarPath);

	rows.sort(
		(a, b) => Number(b.totalScore) - Number(a.totalScore) || b.correctRounds - a.correctRounds
	);
	return json(
		rows.map((row, index) => ({
			rank: index + 1,
			profile: {
				id: row.profileId,
				displayName: row.displayName,
				walletAddress: row.walletAddress,
				avatarUrl: getAvatarPublicUrl(row.avatarPath)
			},
			tournaments: Number(row.tournaments),
			correctRounds: row.correctRounds,
			totalScore: Number(row.totalScore)
		}))
	);
}

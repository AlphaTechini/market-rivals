import { randomBytes } from 'node:crypto';
import { and, asc, count, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { getSessionProfile } from '$lib/server/auth/session';
import { getDb } from '$lib/server/db';
import { readJson, numberField, stringField } from '$lib/server/http';
import { arenas, arenaParticipants, arenaRounds } from '$lib/server/db/schema';

function isAsset(value: string | null): value is 'BTC' | 'ETH' {
	return value === 'BTC' || value === 'ETH';
}

function isAccessType(value: string | null): value is 'PRIVATE' | 'PUBLIC' {
	return value === 'PRIVATE' || value === 'PUBLIC';
}

function isListStatus(value: string | null): value is 'JOINING' | 'LIVE' | 'COMPLETED' {
	return value === 'JOINING' || value === 'LIVE' || value === 'COMPLETED';
}

export async function GET({ url }) {
	const statusParam = url.searchParams.get('status') ?? 'JOINING';
	const status = isListStatus(statusParam) ? statusParam : null;
	const assetParam = url.searchParams.get('asset');
	const asset = assetParam && isAsset(assetParam) ? assetParam : null;
	if (!status)
		return json({ error: 'Status must be JOINING, LIVE, or COMPLETED.' }, { status: 400 });
	if (assetParam && !asset) return json({ error: 'Asset must be BTC or ETH.' }, { status: 400 });

	const filters = [eq(arenas.status, status), eq(arenas.accessType, 'PUBLIC')];
	if (asset) filters.push(eq(arenas.asset, asset));

	const rows = await getDb()
		.select({ arena: arenas, playerCount: count(arenaParticipants.id) })
		.from(arenas)
		.leftJoin(arenaParticipants, eq(arenaParticipants.arenaId, arenas.id))
		.where(and(...filters))
		.groupBy(arenas.id)
		.orderBy(asc(arenas.startAt));

	return json(
		rows.map(({ arena, playerCount }) => ({
			...arena,
			playerCount: Number(playerCount)
		}))
	);
}

export async function POST(event) {
	const profile = await getSessionProfile(event);
	if (!profile) return json({ error: 'Authentication required.' }, { status: 401 });

	const body = await readJson(event.request);
	const name = stringField(body, 'name');
	const asset = stringField(body, 'asset');
	const accessType = stringField(body, 'accessType');
	const startAtValue = stringField(body, 'startAt');
	const description = stringField(body, 'description');
	const roundCount = numberField(body, 'roundCount');
	const maximumParticipants = numberField(body, 'maximumParticipants');
	const roundIntervalMinutes = numberField(body, 'roundIntervalMinutes');
	const entryFee = numberField(body, 'entryFee');

	if (!name || name.length > 80 || !isAsset(asset) || !isAccessType(accessType)) {
		return json(
			{ error: 'Name, BTC or ETH asset, and access type are required.' },
			{ status: 400 }
		);
	}
	if (!roundCount || !Number.isInteger(roundCount) || roundCount < 1) {
		return json({ error: 'Round count must be a positive whole number.' }, { status: 400 });
	}
	if (
		!maximumParticipants ||
		!Number.isInteger(maximumParticipants) ||
		maximumParticipants < 2 ||
		maximumParticipants > 100
	) {
		return json(
			{ error: 'Maximum participants must be a whole number between 2 and 100.' },
			{ status: 400 }
		);
	}
	if (
		!roundIntervalMinutes ||
		!Number.isInteger(roundIntervalMinutes) ||
		roundIntervalMinutes < 3 ||
		roundIntervalMinutes > 20
	) {
		return json(
			{ error: 'Round interval must be a whole number between 3 and 20 minutes.' },
			{ status: 400 }
		);
	}
	if (!entryFee || entryFee < 1)
		return json({ error: 'Entry fee must be at least 1 USDso.' }, { status: 400 });

	const startAt = startAtValue ? new Date(startAtValue) : null;
	if (!startAt || Number.isNaN(startAt.getTime()) || startAt <= new Date()) {
		return json({ error: 'Start time must be a valid future date.' }, { status: 400 });
	}

	const inviteCode = randomBytes(8).toString('base64url');
	const created = await getDb().transaction(async (tx) => {
		const [arena] = await tx
			.insert(arenas)
			.values({
				name,
				hostProfileId: profile.id,
				asset,
				accessType,
				inviteCode,
				roundCount,
				maximumParticipants,
				roundIntervalMinutes,
				entryFee: entryFee.toFixed(8),
				startAt,
				description
			})
			.returning();

		await tx.insert(arenaParticipants).values({
			arenaId: arena.id,
			profileId: profile.id,
			walletAddress: profile.walletAddress
		});

		const rounds = Array.from({ length: roundCount }, (_, index) => {
			const opensAt = new Date(startAt.getTime() + index * roundIntervalMinutes * 60 * 1000);
			return {
				arenaId: arena.id,
				roundNumber: index + 1,
				opensAt,
				locksAt: new Date(opensAt.getTime() + roundIntervalMinutes * 60 * 1000)
			};
		});
		await tx.insert(arenaRounds).values(rounds);
		return arena;
	});

	return json(created, { status: 201 });
}

import { randomBytes } from 'node:crypto';
import { and, asc, count, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { getSessionProfile } from '$lib/server/auth/session';
import { getDb } from '$lib/server/db';
import { readJson, numberField, stringField } from '$lib/server/http';
import { arenas, arenaParticipants, arenaRounds } from '$lib/server/db/schema';

// DreamDEX 15-minute series cadence: two rounds share one window, voting
// phases run sequentially inside it (6 minutes + 1 minute gap + 6 minutes).
const windowMinutes = 15;
const phaseMinutes = 6;
const phaseGapMinutes = 1;
const maxRounds = 4;

function isAsset(value: string | null): value is 'BTC' | 'ETH' | 'MIX' {
	return value === 'BTC' || value === 'ETH' || value === 'MIX';
}

function isAccessType(value: string | null): value is 'PRIVATE' | 'PUBLIC' {
	return value === 'PRIVATE' || value === 'PUBLIC';
}

function isListStatus(value: string | null): value is 'JOINING' | 'LIVE' | 'COMPLETED' {
	return value === 'JOINING' || value === 'LIVE' || value === 'COMPLETED';
}

function roundAsset(asset: 'BTC' | 'ETH' | 'MIX', index: number): 'BTC' | 'ETH' {
	if (asset === 'MIX') return index % 2 === 0 ? 'BTC' : 'ETH';
	return asset;
}

function phaseFor(asset: 'BTC' | 'ETH' | 'MIX', index: number, startAt: Date) {
	const start = new Date(startAt.getTime());
	if (asset !== 'MIX') {
		const opensAt = new Date(start.getTime() + index * windowMinutes * 60 * 1000);
		return { opensAt, locksAt: new Date(opensAt.getTime() + phaseMinutes * 60 * 1000) };
	}
	const wave = Math.floor(index / 2);
	const offsetMinutes = index % 2 === 0 ? 0 : phaseMinutes + phaseGapMinutes;
	const opensAt = new Date(start.getTime() + (wave * windowMinutes + offsetMinutes) * 60 * 1000);
	return { opensAt, locksAt: new Date(opensAt.getTime() + phaseMinutes * 60 * 1000) };
}

export async function GET({ url }) {
	const statusParam = url.searchParams.get('status') ?? 'JOINING';
	const status = isListStatus(statusParam) ? statusParam : null;
	const assetParam = url.searchParams.get('asset');
	const asset = assetParam && isAsset(assetParam) ? assetParam : null;
	if (!status)
		return json({ error: 'Status must be JOINING, LIVE, or COMPLETED.' }, { status: 400 });
	if (assetParam && !asset)
		return json({ error: 'Asset must be BTC, ETH, or MIX.' }, { status: 400 });

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
	const entryFee = numberField(body, 'entryFee');

	if (!name || name.length > 80 || !isAsset(asset) || !isAccessType(accessType)) {
		return json(
			{ error: 'Name, BTC, ETH, or MIX asset, and access type are required.' },
			{ status: 400 }
		);
	}
	if (!roundCount || !Number.isInteger(roundCount) || roundCount < 1 || roundCount > maxRounds) {
		return json(
			{ error: `Round count must be a whole number between 1 and ${maxRounds}.` },
			{ status: 400 }
		);
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
				roundIntervalMinutes: windowMinutes,
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
			const { opensAt, locksAt } = phaseFor(asset, index, startAt);
			return {
				arenaId: arena.id,
				roundNumber: index + 1,
				asset: roundAsset(asset, index),
				opensAt,
				locksAt
			};
		});
		await tx.insert(arenaRounds).values(rounds);
		return arena;
	});

	return json(created, { status: 201 });
}

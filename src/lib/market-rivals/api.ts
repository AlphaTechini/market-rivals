import { createWalletClient, custom, type Address } from 'viem';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';
import type { ProfileDraft } from './ProfileSetupModal.svelte';

export type ApiProfile = {
	id: string;
	displayName: string;
	walletAddress: string;
	avatarUrl: string | null;
};

export type ArenaRecord = {
	id: string;
	name: string;
	asset: 'BTC' | 'ETH';
	accessType: 'PRIVATE' | 'PUBLIC';
	status: 'JOINING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
	roundCount: number;
	contractQuantity: number;
	maximumParticipants: number;
	roundIntervalMinutes: number;
	entryFee: string;
	startAt: string;
	description: string | null;
	createdAt: string;
	completedAt: string | null;
	hostProfileId: string;
};

export type ApiAchievement = {
	participantId: string;
	type: string;
	title: string;
	awardedAt: string;
};

export type ArenaRoundResult = {
	roundNumber: number;
	asset: 'BTC' | 'ETH';
	status: string;
	winningSide: 'UP' | 'DOWN' | null;
	opensAt: string;
	picks: Array<{
		participantId: string;
		selectedSide: 'UP' | 'DOWN';
		status: string;
		roundScore: string | null;
		changed: boolean;
	}>;
};

export type RivalryRecord = {
	profileId: string;
	displayName: string;
	avatarUrl: string | null;
	roundsTogether: number;
	wins: number;
	losses: number;
	ties: number;
};

export type LeaderboardEntry = {
	rank: number;
	profile: ApiProfile;
	tournaments: number;
	correctRounds: number;
	totalScore: number;
};

export type ArenaSummary = {
	arena: ArenaRecord;
	inviteCode: string | null;
	host: ApiProfile | null;
	participants: Array<{
		participantId: string;
		totalScore: string;
		correctRounds: number;
		missedRounds: number;
		finalRank: number | null;
		rank: number;
		profile: ApiProfile;
	}>;
	achievements: ApiAchievement[];
	rounds: ArenaRoundResult[];
};

export type StageLine = { kind: 'leader' | 'split' | 'same' | 'recap' | 'void'; text: string };

export type RoundDetail = {
	round: {
		roundNumber: number;
		asset: 'BTC' | 'ETH';
		status: 'SCHEDULED' | 'TRADING' | 'LOCKED' | 'SETTLED' | 'VOIDED' | 'MISSED';
		marketSymbol: string | null;
		dreamDexMarketId: string | null;
		opensAt: string;
		locksAt: string;
		marketExpiresAt: string | null;
		settlesAt: string | null;
		winningSide: 'UP' | 'DOWN' | null;
		openingPrice: string | null;
		closingPrice: string | null;
	};
	pickDeadline: string;
	votePhaseEnd: string;
	pickedCount: number;
	participantCount: number;
	stage: {
		phase: 'PENDING' | 'CONDITIONAL' | 'SETTLED' | 'VOIDED';
		headline: string;
		lines: StageLine[];
	};
	myPick: {
		selectedSide: 'UP' | 'DOWN';
		status: string;
		averageFillPrice: string | null;
		filledQuantity: string | null;
		roundScore: string | null;
		settlementValue: string | null;
		orderTransactionHash: string | null;
		changed: boolean;
		submittedAt: string | null;
	} | null;
	canChange: boolean;
	changeDeadline: string | null;
	picks: RoundPick[];
	standings: Array<{
		participantId: string;
		displayName: string;
		avatarUrl: string | null;
		walletAddress: string;
		totalScore: string;
		correctRounds: number;
		missedRounds: number;
		finalRank: number | null;
		rank: number;
	}>;
};

export type RoundPick = {
	participantId: string;
	displayName: string;
	avatarUrl: string | null;
	walletAddress: string;
	selectedSide: 'UP' | 'DOWN';
	initialSide?: 'UP' | 'DOWN' | null;
	changed?: boolean;
	status: string;
	averageFillPrice: string | null;
	filledQuantity?: string | null;
	roundScore: string | null;
};

export type LiveArena = {
	id: string;
	name: string;
	asset: 'BTC' | 'ETH';
	status: string;
	roundCount: number;
	maximumParticipants: number;
	startAt: string;
	playerCount: number;
};

type ArenaListStatus = 'JOINING' | 'LIVE' | 'COMPLETED';

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
	const response = await fetch(input, init);
	const body: unknown = await response.json().catch(() => null);

	if (!response.ok) {
		const message = body && typeof body === 'object' && 'error' in body ? body.error : null;
		throw new Error(typeof message === 'string' ? message : 'Request failed.');
	}

	return body as T;
}

export function fetchMyProfile(): Promise<ApiProfile | null> {
	return request<{ profile: ApiProfile | null }>('/api/me').then((body) => body.profile);
}

export function fetchLeaderboard(asset: 'ALL' | 'BTC' | 'ETH'): Promise<LeaderboardEntry[]> {
	const query = asset === 'ALL' ? '' : `?asset=${asset}`;
	return request<LeaderboardEntry[]>(`/api/leaderboard${query}`);
}

export function fetchArenaSummary(arenaId: string): Promise<ArenaSummary> {
	return request<ArenaSummary>(`/api/arenas/${arenaId}/summary`);
}

export function fetchRoundDetail(arenaId: string, roundNumber: number): Promise<RoundDetail> {
	return request<RoundDetail>(`/api/arenas/${arenaId}/rounds/${roundNumber}`);
}

export function fetchRivalries(): Promise<{
	rivalries: RivalryRecord[];
	tiedRival: RivalryRecord | null;
}> {
	return request<{ rivalries: RivalryRecord[]; tiedRival: RivalryRecord | null }>('/api/rivalries');
}

function fetchArenas(status: ArenaListStatus, asset?: 'BTC' | 'ETH'): Promise<LiveArena[]> {
	const params = new URLSearchParams({ status });
	if (asset) params.set('asset', asset);
	return request<LiveArena[]>(`/api/arenas?${params.toString()}`);
}

export function fetchLiveArenas(asset?: 'BTC' | 'ETH'): Promise<LiveArena[]> {
	return Promise.all([fetchArenas('JOINING', asset), fetchArenas('LIVE', asset)]).then((arenas) =>
		arenas.flat()
	);
}

export function fetchPastArenas(asset?: 'BTC' | 'ETH'): Promise<LiveArena[]> {
	return fetchArenas('COMPLETED', asset);
}

export function joinArena(
	arenaId: string,
	inviteCode?: string
): Promise<{ participantId: string; arenaId: string }> {
	const body = inviteCode ? JSON.stringify({ inviteCode }) : undefined;
	return request<{ participantId: string; arenaId: string }>(`/api/arenas/${arenaId}/join`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body
	});
}

export function submitArenaPick(input: {
	arenaId: string;
	roundNumber: number;
	marketId: string;
	marketSymbol: string;
	direction: 'UP' | 'DOWN';
	orderTransactionHash: string;
	filledQuantity: string;
	averageFillPrice: string | null;
}): Promise<{ pickId: string; status: string }> {
	return request<{ pickId: string; status: string }>(
		`/api/arenas/${input.arenaId}/rounds/${input.roundNumber}/pick`,
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(input)
		}
	);
}

export async function createArena(input: {
	name: string;
	asset: 'BTC' | 'ETH' | 'MIX';
	accessType: 'PRIVATE' | 'PUBLIC';
	roundCount: number;
	maximumParticipants: number;
	roundIntervalMinutes: number;
	entryFee: number;
	startAt: string;
	description: string;
}): Promise<{ id: string }> {
	return request<{ id: string }>('/api/arenas', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(input)
	});
}

type EthereumProvider = {
	request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

function getEthereumProvider(): EthereumProvider {
	const provider = (globalThis as typeof globalThis & { ethereum?: EthereumProvider }).ethereum;
	if (!provider) throw new Error('Install an EVM wallet to continue.');
	return provider;
}

export async function authenticateWithWallet(profile: ProfileDraft): Promise<void> {
	const provider = getEthereumProvider();
	const walletClient = createWalletClient({ chain: somniaShannon, transport: custom(provider) });
	const [account] = await walletClient.requestAddresses();
	if (!account) throw new Error('No wallet account was selected.');

	const challenge = await request<{ message: string }>('/api/auth/challenge', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ walletAddress: account })
	});
	const signature = await walletClient.signMessage({ account, message: challenge.message });

	await request('/api/auth/verify', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			walletAddress: account,
			message: challenge.message,
			signature,
			displayName: profile.displayName
		})
	});

	const form = new FormData();
	form.set('avatar', profile.avatarFile);
	await request('/api/profile/avatar', { method: 'POST', body: form });
}

export function profileFromApi(profile: ApiProfile) {
	return {
		name: profile.displayName,
		initials: profile.displayName.slice(0, 2).toUpperCase(),
		avatarUrl: profile.avatarUrl ?? undefined
	};
}

export function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function explorerTransactionUrl(hash: string): string {
	return `https://shannon-explorer.somnia.network/tx/${hash}`;
}

export type WalletAddress = Address;

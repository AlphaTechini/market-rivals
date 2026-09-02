import { createWalletClient, custom, type Address } from 'viem';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';
import type { ProfileDraft } from './ProfileSetupModal.svelte';

export type ApiProfile = {
	id: string;
	displayName: string;
	walletAddress: string;
	avatarUrl: string | null;
};

export type LeaderboardEntry = {
	rank: number;
	profile: ApiProfile;
	tournaments: number;
	correctRounds: number;
	totalScore: number;
};

export type ArenaSummary = {
	arena: {
		id: string;
		name: string;
		asset: 'BTC' | 'ETH';
		status: string;
		roundCount: number;
		maximumParticipants: number;
	};
	participants: Array<{
		totalScore: string;
		correctRounds: number;
		profile: ApiProfile;
	}>;
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

export function fetchLeaderboard(asset: 'ALL' | 'BTC' | 'ETH'): Promise<LeaderboardEntry[]> {
	const query = asset === 'ALL' ? '' : `?asset=${asset}`;
	return request<LeaderboardEntry[]>(`/api/leaderboard${query}`);
}

export function fetchArenaSummary(arenaId: string): Promise<ArenaSummary> {
	return request<ArenaSummary>(`/api/arenas/${arenaId}/summary`);
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

export async function createArena(input: {
	name: string;
	asset: 'BTC' | 'ETH';
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

export type WalletAddress = Address;

import type { Pathname } from '$app/types';

export type Tournament = {
	name: string;
	status: 'JOINING' | 'LIVE';
	players: string;
	detail: string;
	avatars: string[];
	cta: string;
	href: Pathname;
};

export type Player = {
	name: string;
	initials: string;
	avatarUrl?: string;
	status?: string;
};

export type Standing = {
	rank: number;
	player: string;
	pick: string;
	round: string;
	total: number;
};

export const playerProfiles: Record<string, Player> = {
	Alpha: { name: 'Alpha', initials: 'AL' },
	Ava: { name: 'Ava', initials: 'AV' },
	Milo: { name: 'Milo', initials: 'MI' },
	Zoe: { name: 'Zoe', initials: 'ZO' },
	Liam: { name: 'Liam', initials: 'LI' },
	Noah: { name: 'Noah', initials: 'NO' }
};

export function profileFor(name: string): Player {
	return playerProfiles[name] ?? { name, initials: name.slice(0, 2).toUpperCase() };
}

export const liveTournaments: Tournament[] = [
	{
		name: 'BTC Sprint League',
		status: 'JOINING',
		players: '12 / 24 players',
		detail: '10 rounds · 15-minute markets · starts in 04:18',
		avatars: ['AK', 'MO', 'ZE', '+9'],
		cta: 'View arena ->',
		href: '/tournaments/btc-sprint/lobby'
	},
	{
		name: 'ETH Night Shift',
		status: 'JOINING',
		players: '7 / 12 players',
		detail: '8 rounds · 15-minute markets · starts in 12:40',
		avatars: ['LI', 'NO', '+5'],
		cta: 'View arena ->',
		href: '/tournaments/eth-night/lobby'
	},
	{
		name: 'The Silver Cup',
		status: 'LIVE',
		players: '20 players',
		detail: 'Round 4 of 12 · BTC/USD · spectators welcome',
		avatars: ['AV', 'JO', '+18'],
		cta: 'Watch live ->',
		href: '/tournaments/silver-cup/round/4/arena'
	}
];

export const lobbyPlayers: Player[] = [
	{ name: 'Alpha', initials: 'AL', status: 'Host · Ready' },
	{ name: 'Ava', initials: 'AV', status: 'Ready' },
	{ name: 'Milo', initials: 'MI', status: 'Ready' },
	{ name: 'Zoe', initials: 'ZO', status: 'Ready' },
	{ name: 'Liam', initials: 'LI', status: 'Ready' },
	{ name: 'Noah', initials: 'NO', status: 'Ready' }
];

export const roundPlayers: Player[] = [
	{ name: 'Ava', initials: 'AV', status: 'Locked' },
	{ name: 'Zoe', initials: 'ZO', status: 'Locked' },
	{ name: 'Noah', initials: 'NO', status: 'Locked' },
	{ name: 'Milo', initials: 'MI', status: 'Choosing' },
	{ name: 'Liam', initials: 'LI', status: 'Choosing' }
];

export const roundStandings: Standing[] = [
	{ rank: 1, player: 'Ava', pick: 'UP', round: '+100', total: 810 },
	{ rank: 2, player: 'Alpha', pick: 'UP', round: '+100', total: 720 },
	{ rank: 3, player: 'Zoe', pick: 'DOWN', round: '+100', total: 650 },
	{ rank: 4, player: 'Milo', pick: 'DOWN', round: '0', total: 530 }
];

export const finalStandings = [
	{ player: 'Ava', rounds: '8 / 10', winRate: '80%', points: 810 },
	{ player: 'Alpha', rounds: '7 / 10', winRate: '70%', points: 720 },
	{ player: 'Zoe', rounds: '6 / 10', winRate: '60%', points: 650 },
	{ player: 'Milo', rounds: '5 / 10', winRate: '50%', points: 530 }
];

export const globalStandings = [
	{ player: 'Ava', tournaments: 14, winRate: '72%', points: 10240 },
	{ player: 'Zoe', tournaments: 13, winRate: '69%', points: 8980 },
	{ player: 'Alpha', tournaments: 12, winRate: '68%', points: 8410 },
	{ player: 'Milo', tournaments: 15, winRate: '61%', points: 7720 },
	{ player: 'Liam', tournaments: 9, winRate: '64%', points: 6110 }
];

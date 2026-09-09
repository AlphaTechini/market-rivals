import type { ArenaSummary, RivalryRecord } from '$lib/market-rivals/api';
import { loadAvatarBitmap } from './avatar-loader';
import {
	filmDuration,
	type MatchFilmData,
	type MatchFilmOutcome,
	type MatchFilmRound
} from './types';

function outcomeFor(
	round: ArenaSummary['rounds'][number],
	pick: ArenaSummary['rounds'][number]['picks'][number] | undefined
): MatchFilmOutcome {
	if (round.status === 'VOIDED') return 'VOID';
	if (round.winningSide === null || !pick || pick.roundScore === null) return 'PENDING';
	return pick.selectedSide === round.winningSide ? 'WIN' : 'LOSS';
}

function rivalryLineFor(rivalry: RivalryRecord | null): string | null {
	if (!rivalry || rivalry.roundsTogether === 0) return null;
	if (rivalry.wins === rivalry.losses) {
		return `TIED WITH ${rivalry.displayName.toUpperCase()} ${rivalry.wins}-${rivalry.losses}`;
	}
	if (rivalry.wins > rivalry.losses) {
		return `YOU LEAD ${rivalry.displayName.toUpperCase()} ${rivalry.wins}-${rivalry.losses}`;
	}
	return `${rivalry.displayName.toUpperCase()} LEADS YOU ${rivalry.losses}-${rivalry.wins}`;
}

export async function buildMatchFilmData(
	summary: ArenaSummary,
	viewerProfileId: string | null,
	rivalry: RivalryRecord | null
): Promise<MatchFilmData> {
	const viewerParticipant = viewerProfileId
		? (summary.participants.find((participant) => participant.profile.id === viewerProfileId) ??
			null)
		: null;

	const players = await Promise.all(
		[...summary.participants]
			.sort((a, b) => a.rank - b.rank)
			.slice(0, 4)
			.map(async (participant) => ({
				name: participant.profile.displayName,
				score: Number(participant.totalScore),
				rank: participant.finalRank,
				avatar: await loadAvatarBitmap(participant.profile.avatarUrl),
				initials: participant.profile.displayName.slice(0, 2).toUpperCase()
			}))
	);

	const rounds: MatchFilmRound[] = summary.rounds.map((round) => {
		const pick = viewerParticipant
			? round.picks.find((entry) => entry.participantId === viewerParticipant.participantId)
			: undefined;
		return {
			number: round.roundNumber,
			asset: round.asset === 'ETH' ? 'ETH' : 'BTC',
			side: pick ? pick.selectedSide : null,
			changed: pick?.changed ?? false,
			fillPrice: pick?.averageFillPrice ?? null,
			quantity: pick?.filledQuantity ?? null,
			outcome: outcomeFor(round, pick),
			points:
				pick?.roundScore !== null && pick?.roundScore !== undefined ? Number(pick.roundScore) : null
		};
	});

	return {
		arenaName: summary.arena.name,
		completed: summary.arena.status === 'COMPLETED',
		players,
		rounds,
		rivalryLine: rivalryLineFor(rivalry),
		totalDuration: filmDuration(Math.max(rounds.length, 1))
	};
}

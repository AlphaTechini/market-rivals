import type { RoundPickRow, RoundStandingRow } from './match-stage-types';

export type StageLine = { kind: 'leader' | 'split' | 'same' | 'recap' | 'void'; text: string };

export type RoundStage = {
	phase: 'PENDING' | 'CONDITIONAL' | 'SETTLED' | 'VOIDED';
	headline: string;
	lines: StageLine[];
};

const priceScale = 1_000_000_000_000_000_000n;

function parseScaledDecimal(value: string): bigint {
	if (!/^\d+(\.\d+)?$/.test(value)) return 0n;
	const [whole, fraction = ''] = value.split('.');
	return BigInt(whole) * priceScale + BigInt((fraction.padEnd(18, '0') || '0').slice(0, 18));
}

// points for one contract under the published (settlementValue - avgFill) x 100 rule
function projectedPoints(selectedSide: 'UP' | 'DOWN', winningSide: 'UP' | 'DOWN', avgFill: string) {
	const averageFillPrice = parseScaledDecimal(avgFill);
	const settlement = selectedSide === winningSide ? priceScale : 0n;
	const difference = settlement - averageFillPrice;
	return Number(difference * 100n) / 1e18;
}

function formatSigned(value: number): string {
	const rounded = Math.round(value * 10) / 10;
	return `${rounded > 0 ? '+' : ''}${rounded.toLocaleString()}`;
}

function leaderWithMargin(
	picks: RoundPickRow[],
	winningSide: 'UP' | 'DOWN',
	standings: RoundStandingRow[]
) {
	const totals = new Map<string, number>();
	for (const standing of standings) {
		totals.set(standing.participantId, Number(standing.totalScore));
	}
	const pickByParticipant = new Map(picks.map((pick) => [pick.participantId, pick]));

	for (const standing of standings) {
		const pick = pickByParticipant.get(standing.participantId);
		if (!pick || pick.status !== 'CONFIRMED' || !pick.averageFillPrice) {
			totals.set(standing.participantId, (totals.get(standing.participantId) ?? 0) - 100);
			continue;
		}
		const projected = projectedPoints(pick.selectedSide, winningSide, pick.averageFillPrice);
		totals.set(standing.participantId, (totals.get(standing.participantId) ?? 0) + projected);
	}

	const ranked = standings
		.map((standing) => ({
			name: standing.displayName,
			total: totals.get(standing.participantId) ?? 0
		}))
		.sort((a, b) => b.total - a.total);

	return { leader: ranked[0], runnerUp: ranked[1] ?? null, ranked };
}

export function buildRoundStage(input: {
	roundStatus: 'SCHEDULED' | 'TRADING' | 'LOCKED' | 'SETTLED' | 'VOIDED' | 'MISSED';
	winningSide: 'UP' | 'DOWN' | null;
	picks: RoundPickRow[];
	standings: RoundStandingRow[];
	viewerParticipantId: string | null;
	asset: string;
}): RoundStage {
	const { roundStatus, winningSide, picks, standings, viewerParticipantId, asset } = input;

	if (roundStatus === 'VOIDED') {
		return {
			phase: 'VOIDED',
			headline: 'DreamDEX voided this market. No points awarded.',
			lines: []
		};
	}

	if (roundStatus === 'SETTLED' && winningSide) {
		const settledPicks = picks.filter((pick) => pick.status === 'CONFIRMED' && pick.roundScore);
		const best = settledPicks
			.map((pick) => ({ name: pick.displayName, score: Number(pick.roundScore ?? 0) }))
			.sort((a, b) => b.score - a.score)[0];
		const lines: StageLine[] = [
			{
				kind: 'recap',
				text: best
					? `${best.name} took the round with ${formatSigned(best.score)} pts.`
					: 'No confirmed positions scored this round.'
			}
		];
		if (viewerParticipantId) {
			const viewerPick = picks.find((pick) => pick.participantId === viewerParticipantId);
			const rivals = settledPicks.filter(
				(pick) =>
					pick.participantId !== viewerParticipantId &&
					viewerPick &&
					pick.selectedSide !== viewerPick.selectedSide
			);
			for (const rival of rivals.slice(0, 2)) {
				lines.push({
					kind: 'split',
					text: `${asset} settled ${winningSide}: this market decided you against ${rival.displayName}.`
				});
			}
		}
		return {
			phase: 'SETTLED',
			headline: `${asset} settled ${winningSide}.`,
			lines
		};
	}

	if (roundStatus !== 'LOCKED' || picks.length === 0) {
		return {
			phase: 'PENDING',
			headline: 'Positions are still being placed. Conditional standings appear once picks lock.',
			lines: []
		};
	}

	const up = leaderWithMargin(picks, 'UP', standings);
	const down = leaderWithMargin(picks, 'DOWN', standings);
	const lines: StageLine[] = [
		{
			kind: 'leader',
			text: `If ${asset} settles UP: ${up.leader.name} leads${up.runnerUp ? ` by ${formatSigned(up.leader.total - up.runnerUp.total)} pts over ${up.runnerUp.name}` : ''}.`
		},
		{
			kind: 'leader',
			text: `If ${asset} settles DOWN: ${down.leader.name} leads${down.runnerUp ? ` by ${formatSigned(down.leader.total - down.runnerUp.total)} pts over ${down.runnerUp.name}` : ''}.`
		}
	];

	if (viewerParticipantId) {
		const viewerPick = picks.find((pick) => pick.participantId === viewerParticipantId);
		if (viewerPick && viewerPick.status === 'CONFIRMED') {
			const sameSide = picks.filter(
				(pick) =>
					pick.participantId !== viewerParticipantId &&
					pick.status === 'CONFIRMED' &&
					pick.selectedSide === viewerPick.selectedSide
			);
			const opposite = picks.filter(
				(pick) =>
					pick.participantId !== viewerParticipantId &&
					pick.status === 'CONFIRMED' &&
					pick.selectedSide !== viewerPick.selectedSide
			);
			for (const other of sameSide.slice(0, 2)) {
				lines.push({
					kind: 'same',
					text: `You and ${other.displayName} chose the same side; this market won't separate you.`
				});
			}
			for (const rival of opposite.slice(0, 2)) {
				lines.push({
					kind: 'split',
					text: `${rival.displayName} took the other side. This market decides between you.`
				});
			}
		}
	}

	return {
		phase: 'CONDITIONAL',
		headline: `${picks.length} position${picks.length === 1 ? '' : 's'} locked. What each settlement means:`,
		lines
	};
}

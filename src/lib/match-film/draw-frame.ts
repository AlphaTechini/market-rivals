import { THEME, font } from './theme';
import { clamp01, easeInOutCubic, easeOutBack, easeOutCubic, phase } from './easing';
import {
	FILM_SIZE,
	INTRO_DURATION,
	ROUND_BEAT_DURATION,
	STANDINGS_DURATION,
	type MatchFilmData,
	type MatchFilmRound
} from './types';

export type FilmContext2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function roundRect(
	ctx: FilmContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number
): void {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

function drawBackground(ctx: FilmContext2D): void {
	ctx.fillStyle = THEME.bg;
	ctx.fillRect(0, 0, FILM_SIZE, FILM_SIZE);

	const glow = ctx.createRadialGradient(FILM_SIZE / 2, -80, 40, FILM_SIZE / 2, -80, 900);
	glow.addColorStop(0, 'rgba(52, 65, 78, 0.9)');
	glow.addColorStop(0.5, 'rgba(17, 22, 28, 0.6)');
	glow.addColorStop(1, 'rgba(9, 12, 16, 0)');
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, FILM_SIZE, FILM_SIZE);
}

function drawAvatar(
	ctx: FilmContext2D,
	player: { avatar: ImageBitmap | null; initials: string },
	x: number,
	y: number,
	size: number
): void {
	ctx.save();
	ctx.beginPath();
	ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
	ctx.closePath();
	ctx.clip();
	if (player.avatar) {
		ctx.drawImage(player.avatar, x, y, size, size);
	} else {
		ctx.fillStyle = THEME.panelEdge;
		ctx.fillRect(x, y, size, size);
		ctx.fillStyle = THEME.silver;
		ctx.font = font(800, size * 0.34);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(player.initials, x + size / 2, y + size / 2 + size * 0.02);
	}
	ctx.restore();
}

function drawWatermark(ctx: FilmContext2D, alpha: number): void {
	if (alpha <= 0) return;
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.fillStyle = THEME.muted;
	ctx.font = font(800, 22);
	ctx.letterSpacing = '6px';
	ctx.textAlign = 'center';
	ctx.fillText('MARKET RIVALS · DREAMDEX EVENT CONTRACTS', FILM_SIZE / 2, FILM_SIZE - 54);
	ctx.restore();
}

function drawIntro(ctx: FilmContext2D, data: MatchFilmData, t: number): void {
	const titleP = easeOutCubic(phase(t, 0.15, 0.7));
	const chipsP = easeOutCubic(phase(t, 0.55, 0.8));

	ctx.save();
	ctx.textAlign = 'center';
	ctx.globalAlpha = titleP;
	ctx.fillStyle = THEME.silver;
	ctx.font = font(800, 74);
	const title = data.arenaName.length > 26 ? `${data.arenaName.slice(0, 25)}…` : data.arenaName;
	ctx.fillText(title, FILM_SIZE / 2, 360 + (1 - titleP) * 40);

	ctx.globalAlpha = titleP * 0.9;
	ctx.fillStyle = THEME.muted;
	ctx.font = font(700, 26);
	ctx.fillText(
		`MATCH FILM · ${data.rounds.length} ROUNDS${data.completed ? '' : ' · IN PROGRESS'}`,
		FILM_SIZE / 2,
		425
	);
	ctx.restore();

	const showPlayers = Math.min(data.players.length, 4);
	const chipW = 200;
	const chipH = 150;
	const gap = 26;
	const totalW = showPlayers * chipW + (showPlayers - 1) * gap;
	let x = (FILM_SIZE - totalW) / 2;
	for (let index = 0; index < showPlayers; index++) {
		const player = data.players[index];
		const p = clamp01(chipsP * showPlayers - index);
		if (p > 0) {
			ctx.save();
			ctx.globalAlpha = p;
			const y = 560 + (1 - easeOutCubic(p)) * 30;
			roundRect(ctx, x, y, chipW, chipH, 18);
			ctx.fillStyle = index === 0 ? 'rgba(35, 44, 54, 0.96)' : 'rgba(17, 22, 28, 0.96)';
			ctx.fill();
			ctx.strokeStyle = index === 0 ? 'rgba(238, 242, 245, 0.35)' : THEME.panelEdge;
			ctx.lineWidth = index === 0 ? 2 : 1;
			ctx.stroke();
			drawAvatar(ctx, player, x + chipW / 2 - 34, y + 20, 68);
			ctx.fillStyle = THEME.silver;
			ctx.font = font(700, 25);
			ctx.textAlign = 'center';
			ctx.fillText(
				player.name.length > 12 ? `${player.name.slice(0, 11)}…` : player.name,
				x + chipW / 2,
				y + 116
			);
			ctx.restore();
		}
		x += chipW + gap;
	}
}

function outcomeColor(outcome: MatchFilmRound['outcome']): string {
	if (outcome === 'WIN') return THEME.green;
	if (outcome === 'LOSS') return THEME.red;
	return THEME.muted;
}

function drawRoundBeat(ctx: FilmContext2D, round: MatchFilmRound, beatT: number): void {
	const labelP = easeOutCubic(phase(beatT, 0, 0.4));
	ctx.save();
	ctx.globalAlpha = labelP;
	ctx.textAlign = 'center';
	ctx.fillStyle = THEME.muted;
	ctx.font = font(800, 24);
	ctx.letterSpacing = '6px';
	ctx.fillText(`ROUND ${round.number} · ${round.asset}`, FILM_SIZE / 2, 250 + (1 - labelP) * 20);
	ctx.restore();

	if (!round.side) {
		const p = easeOutCubic(phase(beatT, 0.4, 0.6));
		ctx.save();
		ctx.globalAlpha = p;
		ctx.textAlign = 'center';
		ctx.fillStyle = THEME.muted;
		ctx.font = font(700, 44);
		ctx.fillText('NO POSITION · -100', FILM_SIZE / 2, 480);
		ctx.restore();
		return;
	}

	const stampP = phase(beatT, 0.35, 0.5);
	if (stampP > 0) {
		const scale = 1.6 - 0.6 * easeOutBack(stampP);
		const isUp = round.side === 'UP';
		ctx.save();
		ctx.translate(FILM_SIZE / 2, 415);
		ctx.scale(scale, scale);
		ctx.globalAlpha = clamp01(stampP * 2);
		const w = 430;
		const h = 200;
		roundRect(ctx, -w / 2, -h / 2, w, h, 26);
		ctx.fillStyle = isUp ? 'rgba(18, 60, 42, 0.95)' : 'rgba(67, 26, 27, 0.95)';
		ctx.fill();
		ctx.strokeStyle = isUp ? THEME.green : THEME.red;
		ctx.lineWidth = 3;
		ctx.stroke();
		ctx.fillStyle = isUp ? THEME.green : THEME.red;
		ctx.font = font(800, 96);
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(isUp ? '▲ UP' : '▼ DOWN', 0, -14);
		ctx.restore();

		const fillP = easeOutCubic(phase(beatT, 0.85, 0.5));
		if (fillP > 0 && round.fillPrice) {
			ctx.save();
			ctx.globalAlpha = fillP;
			ctx.textAlign = 'center';
			ctx.fillStyle = THEME.silver;
			ctx.font = font(700, 36);
			const qty = round.quantity ? `${Number(round.quantity).toFixed(0)} contracts` : '';
			ctx.fillText(
				`${qty} @ ${Number(round.fillPrice).toFixed(3)} USDso${round.changed ? ' · changed pick' : ''}`,
				FILM_SIZE / 2,
				570
			);
			ctx.restore();
		}
	}

	const settleP = phase(beatT, 1.7, 0.6);
	if (settleP > 0) {
		const color = outcomeColor(round.outcome);
		ctx.save();
		ctx.globalAlpha = easeOutCubic(settleP);
		ctx.textAlign = 'center';
		ctx.fillStyle = color;
		ctx.font = font(800, 72);
		const label =
			round.outcome === 'WIN'
				? 'WIN'
				: round.outcome === 'LOSS'
					? 'LOSS'
					: round.outcome === 'VOID'
						? 'VOID'
						: 'PENDING';
		ctx.fillText(label, FILM_SIZE / 2, 700);
		if (round.points !== null) {
			const shown = Math.round(round.points * 10) / 10;
			ctx.font = font(700, 44);
			ctx.fillStyle = THEME.silver;
			ctx.fillText(`${shown > 0 ? '+' : ''}${shown.toFixed(1)} pts`, FILM_SIZE / 2, 770);
		}
		ctx.restore();
	}
}

function drawStandings(ctx: FilmContext2D, data: MatchFilmData, t: number): void {
	const riseP = easeInOutCubic(phase(t, 0.2, 1.2));
	const scoreP = phase(t, 0.6, 1.2);

	const showPlayers = Math.min(data.players.length, 4);
	const maxScore = Math.max(...data.players.map((p) => Math.abs(p.score)), 100);
	const colW = 190;
	const gap = 40;
	const totalW = showPlayers * colW + (showPlayers - 1) * gap;
	const baseY = 840;
	let x = (FILM_SIZE - totalW) / 2;

	ctx.save();
	ctx.textAlign = 'center';
	ctx.fillStyle = THEME.muted;
	ctx.font = font(800, 24);
	ctx.letterSpacing = '6px';
	ctx.globalAlpha = easeOutCubic(phase(t, 0, 0.4));
	ctx.fillText('FINAL STANDINGS', FILM_SIZE / 2, 230);
	ctx.restore();

	for (let index = 0; index < showPlayers; index++) {
		const player = data.players[index];
		const maxH = 380;
		const normalized = Math.max(Math.abs(player.score) / maxScore, 0.12);
		const h = maxH * normalized * riseP;
		const y = baseY - h;
		const isFirst = index === 0;

		ctx.save();
		roundRect(ctx, x, y, colW, h, 16);
		const grad = ctx.createLinearGradient(x, y, x, baseY);
		if (isFirst) {
			grad.addColorStop(0, 'rgba(238, 242, 245, 0.28)');
			grad.addColorStop(1, 'rgba(238, 242, 245, 0.06)');
		} else {
			grad.addColorStop(0, 'rgba(143, 154, 166, 0.20)');
			grad.addColorStop(1, 'rgba(143, 154, 166, 0.04)');
		}
		ctx.fillStyle = grad;
		ctx.fill();
		ctx.strokeStyle = isFirst ? 'rgba(238, 242, 245, 0.5)' : THEME.panelEdge;
		ctx.lineWidth = isFirst ? 2 : 1;
		ctx.stroke();
		ctx.restore();

		if (riseP > 0.8) {
			ctx.save();
			ctx.globalAlpha = clamp01((riseP - 0.8) * 5);
			ctx.textAlign = 'center';
			ctx.fillStyle = THEME.silver;
			ctx.font = font(800, 40);
			ctx.fillText(
				Math.round(player.score * easeOutCubic(scoreP)).toString(),
				x + colW / 2,
				y - 66
			);
			ctx.font = font(700, 28);
			ctx.fillStyle = isFirst ? THEME.blue : THEME.muted;
			ctx.fillText(
				player.name.length > 12 ? `${player.name.slice(0, 11)}…` : player.name,
				x + colW / 2,
				y - 26
			);
			ctx.restore();
		}
		x += colW + gap;
	}
}

function drawOutro(ctx: FilmContext2D, data: MatchFilmData, t: number): void {
	const p = easeOutCubic(phase(t, 0.15, 0.6));
	if (data.rivalryLine && p > 0) {
		ctx.save();
		ctx.globalAlpha = p;
		ctx.textAlign = 'center';
		ctx.fillStyle = THEME.silver;
		ctx.font = font(800, 52);
		ctx.fillText(data.rivalryLine, FILM_SIZE / 2, FILM_SIZE / 2 - 20 + (1 - p) * 26);
		ctx.restore();
	}
}

// Renders one complete frame of the match film at time t (seconds).
// Pure: depends only on t and data, so preview and exports stay identical.
export function drawFrame(ctx: FilmContext2D, data: MatchFilmData, t: number): void {
	ctx.save();
	drawBackground(ctx);

	const roundsEnd = INTRO_DURATION + data.rounds.length * ROUND_BEAT_DURATION;
	const standingsEnd = roundsEnd + STANDINGS_DURATION;

	drawIntro(ctx, data, t);

	for (const [index, round] of data.rounds.entries()) {
		const beatStart = INTRO_DURATION + index * ROUND_BEAT_DURATION;
		const beatEnd = beatStart + ROUND_BEAT_DURATION;
		if (t >= beatStart && t < beatEnd + 0.4) {
			ctx.save();
			ctx.translate(0, -40 * (1 - easeOutCubic(phase(t, beatStart, 0.4))));
			drawRoundBeat(ctx, round, t - beatStart);
			ctx.restore();
		}
	}

	if (t >= roundsEnd - 0.3) {
		ctx.save();
		ctx.globalAlpha = clamp01(phase(t, roundsEnd - 0.3, 0.5));
		drawStandings(ctx, data, t - (roundsEnd - 0.3));
		ctx.restore();
	}

	if (t >= standingsEnd) {
		drawOutro(ctx, data, t - standingsEnd);
	}

	drawWatermark(ctx, clamp01(phase(t, 0.8, 1)));
	ctx.restore();
}

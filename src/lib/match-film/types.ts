export type MatchFilmOutcome = 'WIN' | 'LOSS' | 'VOID' | 'PENDING';

export type MatchFilmRound = {
	number: number;
	asset: 'BTC' | 'ETH';
	side: 'UP' | 'DOWN' | null;
	changed: boolean;
	fillPrice: string | null;
	quantity: string | null;
	outcome: MatchFilmOutcome;
	points: number | null;
};

export type MatchFilmPlayer = {
	name: string;
	score: number;
	rank: number | null;
	avatar: ImageBitmap | null;
	initials: string;
};

export type MatchFilmData = {
	arenaName: string;
	completed: boolean;
	players: MatchFilmPlayer[];
	rounds: MatchFilmRound[];
	rivalryLine: string | null;
	totalDuration: number;
};

export const FILM_SIZE = 1080;
export const FILM_FPS = 30;
export const INTRO_DURATION = 1.6;
export const ROUND_BEAT_DURATION = 3;
export const STANDINGS_DURATION = 2.5;
export const OUTRO_DURATION = 2;

export function filmDuration(roundCount: number): number {
	return INTRO_DURATION + roundCount * ROUND_BEAT_DURATION + STANDINGS_DURATION + OUTRO_DURATION;
}

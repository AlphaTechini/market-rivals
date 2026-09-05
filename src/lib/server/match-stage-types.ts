export type RoundPickRow = {
	participantId: string;
	displayName: string;
	selectedSide: 'UP' | 'DOWN';
	status: string;
	averageFillPrice: string | null;
	roundScore: string | null;
};

export type RoundStandingRow = {
	participantId: string;
	displayName: string;
	totalScore: string;
};

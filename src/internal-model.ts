import { PickStat } from './model';

export interface InternalArenaMatchStatsDbRow {
	readonly playerClass: string;
	readonly result: 'won' | 'lost' | 'tied';
	readonly wins: number;
	readonly losses: number;
	readonly playerDecklist: string;
	readonly runId: string;
	readonly matchAnalysis: string;
}

export interface InternalDraftPickDbRow {
	readonly runId: string;
	readonly playerClass: string;
	readonly pickNumber: number;
	readonly options: string;
	readonly pick: string;
}

export interface DraftStatsByContextAndPeriod {
	readonly lastUpdateDate: string;
	readonly context: string;
	readonly minWins: number;
	readonly cardStats: DraftCardStat[];
	readonly dataPoints: number;
}

export interface DraftCardStat extends PickStat {
	readonly cardId: string;
}

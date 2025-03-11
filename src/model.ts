export interface DraftPick {
	readonly runId: string;
	readonly playerClass: string;
	readonly pickNumber: number;
	readonly options: readonly string[];
	readonly pick: string;
}

export interface DraftStatsByContext {
	readonly lastUpdateDate: string;
	readonly context: string;
	readonly dataPoints: number;
	readonly stats: DraftCardCombinedStat[];
}

export interface DraftCardCombinedStat {
	readonly cardId: string;
	readonly statsByWins: {
		[wins: number]: PickStat;
	};
	readonly statsByWinsGlobal: {
		[wins: number]: PickStat;
	};
}

export interface PickStat {
	offered: number;
	picked: number;
}

export type TimePeriod = 'past-20' | 'past-7' | 'past-3' | 'last-patch' | 'current-season';

export interface Picks {
	readonly runId: string;
	readonly picks: readonly Pick[];
}
export interface Pick {
	readonly pickNumber: number;
	readonly options: readonly string[];
	readonly pick: string;
}

export interface DraftDeckStats {
	readonly runId: string;
	readonly userId: string;
	readonly playerClass: string;
	readonly deckImpact: number;
	readonly deckScore: number;
	// Only used for partial decks
	readonly creationTimestamp?: number;
	readonly heroCardId?: string;
	readonly initialDeckList?: string;
}

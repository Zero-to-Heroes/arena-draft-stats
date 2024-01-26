import { DraftCardStat, DraftStatsByContextAndPeriod, InternalDraftPickDbRow } from '../../internal-model';

export const buildHourlyDraftStats = (
	pickInfos: readonly InternalDraftPickDbRow[],
	minWins: number,
): readonly DraftStatsByContextAndPeriod[] => {
	const flatResult: { [cardIdAndContext: string]: DraftCardStat } = {};
	for (const pick of pickInfos) {
		const options: readonly string[] = JSON.parse(pick.options);
		if (!options?.length) {
			continue;
		}
		const contexts = ['global', pick.playerClass];
		for (const context of contexts) {
			for (const option of options) {
				const cardIdAndContext = `${option}-${context}`;
				if (!flatResult[cardIdAndContext]) {
					flatResult[cardIdAndContext] = {
						cardId: option,
						offered: 0,
						picked: 0,
					} as DraftCardStat;
				}
				flatResult[cardIdAndContext].offered++;
				if (pick.pick === option) {
					flatResult[cardIdAndContext].picked++;
				}
			}
		}
	}

	const resultByContext: { [context: string]: DraftStatsByContextAndPeriod } = {};
	for (const cardIdAndContext of Object.keys(flatResult)) {
		const cardStat = flatResult[cardIdAndContext];
		const context = cardIdAndContext.split('-')[1];
		if (!resultByContext[context]) {
			resultByContext[context] = {
				lastUpdateDate: new Date().toISOString(),
				context: context,
				minWins: minWins,
				cardStats: [],
				dataPoints: 0,
			} as DraftStatsByContextAndPeriod;
		}
		resultByContext[context].cardStats.push(cardStat);
	}
	return Object.values(resultByContext).map((stat) => {
		const result: DraftStatsByContextAndPeriod = {
			...stat,
			dataPoints: stat.cardStats.map((cardStat) => cardStat.offered).reduce((a, b) => a + b, 0),
		};
		return result;
	});
};

import { S3 } from '@firestone-hs/aws-lambda-utils';
import { DraftCardStat, DraftStatsByContextAndPeriod } from '../../internal-model';
import { ARENA_STATS_BUCKET } from '../comon/config';
import { buildFileKeys, buildFileNamesForGivenDay } from '../comon/utils';
import { saveDraftStats } from './s3-save';

export const buildDailyAggregate = async (
	gameMode: 'arena' | 'arena-underground',
	minWin: number,
	context: string,
	targetDate: string,
	s3: S3,
): Promise<readonly DraftStatsByContextAndPeriod[]> => {
	const fileNames = buildFileNamesForGivenDay(targetDate);
	const fileKeys = buildFileKeys('hourly', gameMode, minWin, context, fileNames);
	const hourlyRawData: readonly string[] = await Promise.all(
		fileKeys.map((fileKey) => s3.readGzipContent(ARENA_STATS_BUCKET, fileKey, 1, false, 300)),
	);
	const hourlyData: readonly DraftStatsByContextAndPeriod[] = hourlyRawData
		.filter((d) => !!d?.length)
		.map((data) => JSON.parse(data));
	if (!hourlyData?.length) {
		console.warn('no data found for', targetDate);
		return;
	}
	const totalCards = hourlyData
		.flatMap((data) => data.cardStats)
		.map((stat) => stat.picked)
		.reduce((a, b) => a + b, 0);
	console.debug(`Total cards picked for ${gameMode} on ${targetDate}:`, totalCards);

	const mergedStats: DraftCardStat[] = mergeStats(hourlyData.flatMap((data) => data.cardStats));
	const totalCardsFromMergedStats = mergedStats.map((stat) => stat.picked).reduce((a, b) => a + b, 0);
	console.debug(`Total cards picked from merged stats for ${gameMode} on ${targetDate}:`, totalCardsFromMergedStats);

	const aggregatedData: DraftStatsByContextAndPeriod = {
		lastUpdateDate: new Date().toISOString(),
		context: context,
		minWins: minWin,
		cardStats: mergedStats,
		dataPoints: mergedStats.map((stat) => stat.offered).reduce((a, b) => a + b, 0),
	};

	await saveDraftStats(aggregatedData, gameMode, minWin, targetDate, s3);
};

const mergeStats = (stats: readonly DraftCardStat[]): DraftCardStat[] => {
	const result: { [cardId: string]: DraftCardStat } = {};
	for (const stat of stats) {
		if (!result[stat.cardId]) {
			result[stat.cardId] = {
				cardId: stat.cardId,
				offered: 0,
				picked: 0,
			};
		}
		result[stat.cardId].offered += stat.offered;
		result[stat.cardId].picked += stat.picked;
	}
	return Object.values(result);
};

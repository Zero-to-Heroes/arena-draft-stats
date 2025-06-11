import { PatchInfo, S3 } from '@firestone-hs/aws-lambda-utils';
import { DraftStatsByContextAndPeriod } from '../../internal-model';
import { DraftCardCombinedStat, DraftStatsByContext, TimePeriod } from '../../model';
import { ARENA_STATS_BUCKET, CONTEXTS, MIN_WINS } from '../comon/config';
import { getFileKeysToLoad } from '../comon/utils';
import { saveDraftStats } from './s3-save';

export const buildStatsForPeriod = async (
	gameMode: 'arena' | 'arena-underground' | 'all',
	timePeriod: TimePeriod,
	patchInfo: PatchInfo,
	currentSeasonPatchInfo: PatchInfo,
	s3: S3,
) => {
	const globalStats = await buildStatsForContext(
		gameMode,
		timePeriod,
		'global',
		patchInfo,
		currentSeasonPatchInfo,
		null,
		s3,
	);
	await saveDraftStats(globalStats, gameMode, timePeriod, s3);

	for (const context of CONTEXTS) {
		if (context === 'global') {
			continue;
		}
		const stat = await buildStatsForContext(
			gameMode,
			timePeriod,
			context,
			patchInfo,
			currentSeasonPatchInfo,
			globalStats,
			s3,
		);
		await saveDraftStats(stat, gameMode, timePeriod, s3);
	}
};

const buildStatsForContext = async (
	gameMode: 'arena' | 'arena-underground' | 'all',
	timePeriod: TimePeriod,
	context: string,
	patchInfo: PatchInfo,
	currentSeasonPatchInfo: PatchInfo,
	globalStats: DraftStatsByContext,
	s3: S3,
): Promise<DraftStatsByContext> => {
	const tempStats: { [cardId: string]: DraftCardCombinedStat } = {};
	for (const winNumber of MIN_WINS) {
		const periodStats: readonly DraftStatsByContextAndPeriod[] = await loadDraftStatsForPeriod(
			gameMode,
			timePeriod,
			context,
			winNumber,
			patchInfo,
			currentSeasonPatchInfo,
			s3,
		);
		const debugStat = periodStats.flatMap((s) => s.cardStats).find((s) => s.cardId === 'DMF_226');
		console.debug(
			`Loaded ${periodStats.length} stats for ${gameMode} in ${timePeriod} for context ${context} and win number ${winNumber}, debug stat:`,
			debugStat,
		);
		for (const stat of periodStats) {
			for (const cardStat of stat.cardStats) {
				const debug = cardStat.cardId === 'DMF_226';
				if (debug) {
					console.debug(
						`Processing card stat for ${cardStat.cardId} in ${gameMode} for context ${context} and win number ${winNumber}:`,
						cardStat,
					);
					console.debug(`Current tempStats for ${cardStat.cardId}:`);
				}
				if (!tempStats[cardStat.cardId]) {
					tempStats[cardStat.cardId] = {
						cardId: cardStat.cardId,
						statsByWins: {},
						statsByWinsGlobal: globalStats?.stats?.find((s) => s.cardId === cardStat.cardId)?.statsByWins,
					};
				}
				const existingStatByWin = tempStats[cardStat.cardId].statsByWins[winNumber];
				if (!existingStatByWin) {
					tempStats[cardStat.cardId].statsByWins[winNumber] = {
						offered: 0,
						picked: 0,
					};
				}
				tempStats[cardStat.cardId].statsByWins[winNumber].offered += cardStat.offered;
				tempStats[cardStat.cardId].statsByWins[winNumber].picked += cardStat.picked;
			}
		}
	}

	const combinedStats = Object.values(tempStats);
	for (const stat of combinedStats) {
		if (!stat.statsByWins[0]) {
			console.warn('no stat for wins', gameMode, context, timePeriod, stat);
		}
	}

	const result: DraftStatsByContext = {
		lastUpdateDate: new Date().toISOString(),
		context: context,
		stats: combinedStats,
		dataPoints: combinedStats.map((stat) => stat.statsByWins[0]?.offered ?? 0).reduce((a, b) => a + b, 0),
	};
	return result;
};

const loadDraftStatsForPeriod = async (
	gameMode: 'arena' | 'arena-underground' | 'all',
	timePeriod: TimePeriod,
	context: string,
	winNumber: number,
	patchInfo: PatchInfo,
	currentSeasonPatchInfo: PatchInfo,
	s3: S3,
): Promise<readonly DraftStatsByContextAndPeriod[]> => {
	const fileKeys = getFileKeysToLoad(gameMode, timePeriod, winNumber, context, patchInfo, currentSeasonPatchInfo);
	// console.log('file keys', timePeriod, context, fileKeys);
	const rawData: readonly string[] = await Promise.all(
		fileKeys.map((fileKey) => s3.readGzipContent(ARENA_STATS_BUCKET, fileKey, 1, false, 300)),
	);
	const data: readonly DraftStatsByContextAndPeriod[] = rawData
		.filter((d) => !!d?.length)
		.map((data) => JSON.parse(data));
	return data;
};

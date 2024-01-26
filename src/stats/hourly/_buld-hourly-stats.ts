import { S3, logBeforeTimeout } from '@firestone-hs/aws-lambda-utils';
import { Context } from 'aws-lambda';
import {
	DraftStatsByContextAndPeriod,
	InternalArenaMatchStatsDbRow,
	InternalDraftPickDbRow,
} from '../../internal-model';
import { MIN_WINS } from '../comon/config';
import { loadDraftPicks } from './db-draft-picks';
import { loadArenaMatches } from './db-rows';
import { buildHourlyDraftStats } from './draft-stats';
import { saveDraftStats } from './s3-save';

const s3 = new S3();

export default async (event, context: Context): Promise<any> => {
	const cleanup = logBeforeTimeout(context);
	// await allCards.initializeCardsDb();

	// if (event.catchUp) {
	// 	await dispatchCatchUpEvents(context, +event.catchUp);
	// 	return;
	// }

	const processStartDate = buildProcessStartDate(event);
	const processEndDate = new Date(processStartDate);
	processEndDate.setHours(processEndDate.getHours() + 1);

	const hourlyRows: readonly InternalArenaMatchStatsDbRow[] = await loadArenaMatches(
		processStartDate,
		processEndDate,
	);

	for (const minWin of MIN_WINS) {
		console.log('building stats for min wins', minWin);
		const runsOverDuringLastHour: readonly string[] = keepOnlyEndedRuns(hourlyRows, minWin);
		const pickInfos: readonly InternalDraftPickDbRow[] = await loadDraftPicks(runsOverDuringLastHour);
		const allRunsStats: readonly DraftStatsByContextAndPeriod[] = buildHourlyDraftStats(pickInfos, minWin);
		for (const stat of allRunsStats) {
			await saveDraftStats(stat, minWin, processStartDate, s3);
		}
	}

	cleanup();
	return { statusCode: 200, body: null };
};

const buildProcessStartDate = (event): Date => {
	if (event.targetDate) {
		const targetDate = new Date(event.targetDate);
		return targetDate;
	}

	// Start from the start of the current hour
	const processStartDate = new Date();
	processStartDate.setHours(processStartDate.getHours() - 1);
	processStartDate.setMinutes(0);
	processStartDate.setSeconds(0);
	processStartDate.setMilliseconds(0);
	return processStartDate;
};

const keepOnlyEndedRuns = (rows: readonly InternalArenaMatchStatsDbRow[], minWins = 0): readonly string[] => {
	const runIds = rows
		.filter((row) => row.runId)
		.filter((row) => row.wins >= minWins)
		.filter((row) => (row.result === 'won' && row.wins === 11) || (row.result === 'lost' && row.losses === 2))
		.map((row) => row.runId);
	const uniqueRunIds = [...new Set(runIds)];
	return uniqueRunIds;
};

import { S3, logBeforeTimeout, sleep } from '@firestone-hs/aws-lambda-utils';
import { Context } from 'aws-lambda';
import AWS from 'aws-sdk';
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
const lambda = new AWS.Lambda();

export default async (event, context: Context): Promise<any> => {
	const cleanup = logBeforeTimeout(context);
	// await allCards.initializeCardsDb();

	if (event.catchUp) {
		await dispatchCatchUpEvents(context, +event.catchUp);
		cleanup();
		return;
	}

	if (!event.gameMode) {
		await dispatchAllEvents(context, event);
		cleanup();
		return;
	}

	const gameMode: 'arena' | 'arena-underground' = event.gameMode ?? 'arena';
	const processStartDate = buildProcessStartDate(event);
	const processEndDate = new Date(processStartDate);
	processEndDate.setHours(processEndDate.getHours() + 1);

	const hourlyRows: readonly InternalArenaMatchStatsDbRow[] = await loadArenaMatches(
		gameMode,
		processStartDate,
		processEndDate,
	);
	console.log(
		'loaded',
		hourlyRows.length,
		'rows for game mode',
		gameMode,
		'between',
		processStartDate,
		'and',
		processEndDate,
	);

	for (const minWin of MIN_WINS) {
		console.log('building stats for min wins', minWin);
		const runsOverDuringLastHour: readonly string[] = keepOnlyEndedRuns(hourlyRows, minWin);
		const pickInfos: readonly InternalDraftPickDbRow[] = await loadDraftPicks(runsOverDuringLastHour);
		const allRunsStats: readonly DraftStatsByContextAndPeriod[] = buildHourlyDraftStats(pickInfos, minWin);
		for (const stat of allRunsStats) {
			await saveDraftStats(stat, minWin, gameMode, processStartDate, s3);
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
		.filter((row) => isEnded(row))
		.map((row) => row.runId);
	const uniqueRunIds = [...new Set(runIds)];
	return uniqueRunIds;
};

const isEnded = (row: InternalArenaMatchStatsDbRow): boolean => {
	if (row.gameMode === 'arena-underground') {
		return (row.result === 'won' && row.wins === 11) || (row.result === 'lost' && row.losses === 2);
	} else {
		return (row.result === 'won' && row.wins === 4) || (row.result === 'lost' && row.losses === 1);
	}
};

const dispatchAllEvents = async (context: Context, event) => {
	const gameModes = ['arena', 'arena-underground'];
	for (const gameMode of gameModes) {
		console.log('dispatching event for game mode', gameMode);
		const newEvent = {
			gameMode: gameMode,
			targetDate: event.targetDate,
		};
		const params = {
			FunctionName: context.functionName,
			InvocationType: 'Event',
			LogType: 'Tail',
			Payload: JSON.stringify(newEvent),
		};
		// console.log('\tinvoking lambda', params);
		const result = await lambda.invoke(params).promise();
		// console.log('\tinvocation result', result);
		await sleep(50);
	}
};

const dispatchCatchUpEvents = async (context: Context, daysInThePast: number) => {
	// Build a list of hours for the last `daysInThePast` days, in the format YYYY-MM-ddTHH:mm:ss.sssZ
	const now = new Date();
	const hours = [];
	for (let i = 0; i < 24 * daysInThePast; i++) {
		const baseDate = new Date(now);
		baseDate.setMinutes(0);
		baseDate.setSeconds(0);
		baseDate.setMilliseconds(0);
		const hour = new Date(baseDate.getTime() - i * 60 * 60 * 1000);
		hours.push(hour.toISOString());
	}

	for (const targetDate of hours) {
		console.log('dispatching catch-up for date', targetDate);
		const newEvent = {
			targetDate: targetDate,
		};
		const params = {
			FunctionName: context.functionName,
			InvocationType: 'Event',
			LogType: 'Tail',
			Payload: JSON.stringify(newEvent),
		};
		// console.log('\tinvoking lambda', params);
		const result = await lambda.invoke(params).promise();
		// console.log('\tinvocation result', result);
		await sleep(50);
	}
};

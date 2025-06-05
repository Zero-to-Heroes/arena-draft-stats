import { S3, logBeforeTimeout, sleep } from '@firestone-hs/aws-lambda-utils';
import { Context } from 'aws-lambda';
import AWS from 'aws-sdk';
import { yesterdayDate } from '../../misc-utils';
import { CONTEXTS, MIN_WINS } from '../comon/config';
import { buildDailyAggregate } from './draft-stats';

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

	const targetDate: string = event.targetDate || yesterdayDate();
	const gameMode: 'arena' | 'arena-underground' = event.gameMode;
	for (const minWin of MIN_WINS) {
		for (const context of CONTEXTS) {
			await buildDailyAggregate(gameMode, minWin, context, targetDate, s3);
		}
	}

	cleanup();
	return { statusCode: 200, body: null };
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
	const days = [];
	for (let i = 0; i < daysInThePast; i++) {
		const baseDate = new Date(now);
		baseDate.setHours(0);
		baseDate.setMinutes(0);
		baseDate.setSeconds(0);
		baseDate.setMilliseconds(0);
	}

	for (const targetDate of days) {
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

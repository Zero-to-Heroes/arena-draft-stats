// This example demonstrates a NodeJS 8.10 async handler[1], however of course you could use
// the more traditional callback-style handler.

import {
	S3,
	getArenaCurrentSeasonPatch,
	getLastArenaPatch,
	logBeforeTimeout,
	sleep,
} from '@firestone-hs/aws-lambda-utils';
import { Context } from 'aws-lambda';
import AWS from 'aws-sdk';
import { TimePeriod } from '../../model';
import { buildStatsForPeriod } from './draft-stats';

const s3 = new S3();
const lambda = new AWS.Lambda();

// [1]: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
export default async (event, context: Context): Promise<any> => {
	// await allCards.initializeCardsDb();

	if (!event.timePeriod) {
		await dispatchEvents(context);
		return;
	}

	const cleanup = logBeforeTimeout(context);
	const timePeriod: TimePeriod = event.timePeriod;
	const gameMode: 'arena' | 'arena-underground' | 'all' = event.gameMode;
	const patchInfo = await getLastArenaPatch();
	const currentSeasonPatchInfo = await getArenaCurrentSeasonPatch();
	console.log('patchInfo', patchInfo);
	await buildStatsForPeriod(gameMode, timePeriod, patchInfo, currentSeasonPatchInfo, s3);

	cleanup();
	return { statusCode: 200, body: null };
};

const dispatchEvents = async (context: Context) => {
	const allTimePeriod: readonly TimePeriod[] = ['last-patch', 'past-20', 'past-7', 'past-3', 'current-season'];
	const allGameModes: readonly string[] = ['arena', 'arena-underground', 'all'];
	for (const timePeriod of allTimePeriod) {
		for (const gameMode of allGameModes) {
			const newEvent = {
				dailyProcessing: true,
				timePeriod: timePeriod,
				gameMode: gameMode,
			};
			const params = {
				FunctionName: context.functionName,
				InvocationType: 'Event',
				LogType: 'Tail',
				Payload: JSON.stringify(newEvent),
			};
			console.log('\tinvoking lambda', params);
			const result = await lambda.invoke(params).promise();
			// console.log('\tinvocation result', result);
			await sleep(50);
		}
	}
};

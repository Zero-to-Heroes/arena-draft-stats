// This example demonstrates a NodeJS 8.10 async handler[1], however of course you could use
// the more traditional callback-style handler.

import { S3, getLastArenaPatch, logBeforeTimeout, sleep } from '@firestone-hs/aws-lambda-utils';
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
	const patchInfo = await getLastArenaPatch();
	console.log('patchInfo', patchInfo);
	await buildStatsForPeriod(timePeriod, patchInfo, s3);

	cleanup();
	return { statusCode: 200, body: null };
};

const dispatchEvents = async (context: Context) => {
	const allTimePeriod: readonly TimePeriod[] = ['last-patch', 'past-20', 'past-7', 'past-3'];
	for (const timePeriod of allTimePeriod) {
		const newEvent = {
			dailyProcessing: true,
			timePeriod: timePeriod,
		};
		const params = {
			FunctionName: context.functionName,
			InvocationType: 'Event',
			LogType: 'Tail',
			Payload: JSON.stringify(newEvent),
		};
		console.log('\tinvoking lambda', params);
		const result = await lambda
			.invoke({
				FunctionName: context.functionName,
				InvocationType: 'Event',
				LogType: 'Tail',
				Payload: JSON.stringify(newEvent),
			})
			.promise();
		// console.log('\tinvocation result', result);
		await sleep(50);
	}
};

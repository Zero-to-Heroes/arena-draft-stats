// This example demonstrates a NodeJS 8.10 async handler[1], however of course you could use
// the more traditional callback-style handler.

import { S3, getConnection } from '@firestone-hs/aws-lambda-utils';
import { AllCardsService } from '@firestone-hs/reference-data';
import { Pick, Picks } from '../model';

export const allCards = new AllCardsService();
export const s3 = new S3();

// [1]: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
export default async (event, context): Promise<any> => {
	console.debug('handling event', event);
	const runId = event.rawPath.split('/').slice(-1)[0];

	const mysql = await getConnection();
	const query = `SELECT * FROM arena_draft_pick WHERE runId = ?`;
	console.debug('query', query);
	const queryResult: readonly any[] = await mysql.query(query, [runId]);
	console.debug('result', queryResult);
	await mysql.end();

	const result: Picks = {
		runId: runId,
		picks: queryResult.map((r) => {
			const pick: Pick = {
				pickNumber: r.pickNumber,
				options: JSON.parse(r.options),
				pick: r.pick,
			};
			return pick;
		}),
	};

	return { statusCode: 200, body: JSON.stringify(result) };
};

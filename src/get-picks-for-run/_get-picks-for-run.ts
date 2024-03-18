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
	console.debug('runId', runId);
	const mysql = await getConnection();
	const rawPicks = await getDraftPicks(runId, mysql);
	console.debug('rawPicks', rawPicks);
	await mysql.end();

	const result: Picks = {
		runId: runId,
		picks: rawPicks.map((r) => {
			const pick: Pick = {
				pickNumber: r.pickNumber,
				options: JSON.parse(r.options),
				pick: r.pick,
			};
			return pick;
		}),
	};
	console.debug('result', result);
	return { statusCode: 200, body: JSON.stringify(result) };
};

const getDraftPicks = async (runId: string, mysql): Promise<readonly any[]> => {
	// If we get a runId as a number, this means we're getting the info for a high-wins run, so we first retrieve the runId
	if (!runId?.includes('-')) {
		const query = `SELECT runId FROM arena_stats_by_run WHERE id = ?`;
		const queryResult: readonly any[] = await mysql.query(query, [runId]);
		if (queryResult.length === 0) {
			return [];
		}
		runId = queryResult[0].runId;
	}

	const query = `SELECT * FROM arena_draft_pick WHERE runId = ?`;
	console.debug('query', query);
	const queryResult: readonly any[] = await mysql.query(query, [runId]);
	console.debug('result', queryResult);
	return queryResult;
};

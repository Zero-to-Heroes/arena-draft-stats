/* eslint-disable @typescript-eslint/no-use-before-define */
import { getConnection } from '@firestone-hs/aws-lambda-utils';
import { ServerlessMysql } from 'serverless-mysql';
import { DraftPick } from '../model';

export default async (event, context): Promise<any> => {
	// console.log('processing event', event);
	const events: readonly DraftPick[] = (event.Records as any[])
		.map((event) => JSON.parse(event.body))
		.reduce((a, b) => a.concat(b), []);
	events.forEach((e) => {
		if (!e.playerClass?.length) {
			console.error('missing playerClass', e);
		}
	});
	const validEvents = events.filter((ev) => ev.playerClass?.length);
	console.debug('validEvents', validEvents.length);
	const mysql = await getConnection();
	await processEvents(validEvents, mysql);
	await mysql.end();

	const response = {
		statusCode: 200,
		isBase64Encoded: false,
		body: null,
	};
	return response;
};

// For now we don't save metadata like the player class, as we will need to retrieve the run
// full info in any case to build the stats. So we can just retrieve the class from the run
const processEvents = async (picks: DraftPick[], mysql: ServerlessMysql) => {
	// console.log('saving picks', picks);
	if (!picks.length) {
		return;
	}
	const query = `
        INSERT INTO arena_draft_pick
        (creationDate, playerClass, runId, pickNumber, options, pick)
        VALUES ?
    `;
	const queryArgs = picks.map((pick) => [
		new Date(),
		pick.playerClass,
		pick.runId,
		pick.pickNumber,
		JSON.stringify(pick.options),
		pick.pick,
	]);
	await mysql.query(query, [queryArgs]);
};

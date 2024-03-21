import { Sqs, getConnection } from '@firestone-hs/aws-lambda-utils';
import { DraftDeckStats } from '../model';

const sqs = new Sqs();

export default async (event): Promise<any> => {
	const start = Date.now();
	const headers = {
		'Access-Control-Allow-Headers':
			'Accept,Accept-Language,Content-Language,Content-Type,Authorization,x-correlation-id,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
		'Access-Control-Expose-Headers': 'x-my-header-out',
		'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
		'Access-Control-Allow-Origin': event.headers?.Origin || event.headers?.origin || '*',
	};
	// Preflight
	if (!event.body) {
		const response = {
			statusCode: 200,
			body: null,
			headers: headers,
		};
		return response;
	}

	// console.debug('received event', event);
	const input: DraftDeckStats = JSON.parse(event.body);
	if (!input.userId || !input.playerClass || !input.runId || !input.deckImpact || !input.deckScore) {
		return {
			statusCode: 400,
			headers: headers,
			body: 'missing data',
		};
	}

	await saveDraftDeckStats(input);
	return {
		statusCode: 200,
		headers: headers,
		body: '',
	};
};

const saveDraftDeckStats = async (input: DraftDeckStats) => {
	const mysql = await getConnection();

	const query = `
        INSERT INTO arena_draft_stat
        (creationDate, userId, playerClass, runId, deckImpact, deckScore)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
	const queryArgs = [new Date(), input.userId, input.playerClass, input.runId, input.deckImpact, input.deckScore];
	await mysql.query(query, queryArgs);
};

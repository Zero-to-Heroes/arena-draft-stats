import { Sqs, getConnection } from '@firestone-hs/aws-lambda-utils';
import SqlString from 'sqlstring';
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
	const input: { userId: string; userName: string } = JSON.parse(event.body);
	const result = await retrieveDeckStats(input.userId, input.userName);
	return {
		statusCode: 200,
		headers: headers,
		body: JSON.stringify(result),
	};
};

const retrieveDeckStats = async (userId: string, userName: string) => {
	const mysql = await getConnection();
	const userIds = await getAllUserIds(userId, userName, mysql);

	const query = `
        SELECT * FROM arena_draft_stat
		WHERE userId IN (${userIds.map((id) => `'${id}'`).join(', ')})
    `;
	const result: any[] = await mysql.query(query);
	await mysql.end();
	return result.map(
		(r) =>
			({
				userId: r.userId,
				playerClass: r.playerClass,
				runId: r.runId,
				deckImpact: r.deckImpact,
				deckScore: r.deckScore,
			} as DraftDeckStats),
	);
};

const getAllUserIds = async (userId: string, userName: string, mysql): Promise<readonly string[]> => {
	const escape = SqlString.escape;
	const userSelectQuery = `
			SELECT DISTINCT userId FROM user_mapping
			INNER JOIN (
				SELECT DISTINCT username FROM user_mapping
				WHERE 
					(username = ${escape(userName)} OR username = ${escape(userId)} OR userId = ${escape(userId)})
					AND username IS NOT NULL
					AND username != ''
					AND username != 'null'
					AND userId != ''
					AND userId IS NOT NULL
					AND userId != 'null'
			) AS x ON x.username = user_mapping.username
			UNION ALL SELECT ${escape(userId)}
		`;
	const userIds: any[] = await mysql.query(userSelectQuery);
	return userIds.map((result) => result.userId);
};

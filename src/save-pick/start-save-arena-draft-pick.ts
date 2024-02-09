import { Sqs } from '@firestone-hs/aws-lambda-utils';
import { DraftPick } from '../model';

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

	if (Date.now() - start > 2000) {
		console.debug('taking a long time', event);
	}
	// console.debug('received event', event);
	const input: DraftPick = JSON.parse(event.body);
	if (Date.now() - start > 2000) {
		console.debug('taking a very long time', event, input);
	}
	await sqs.sendMessageToQueue(input, process.env.SQS_URL);
	if (Date.now() - start > 2000) {
		console.debug('taking a very very long time', event, input);
	}
	return {
		statusCode: 200,
		headers: headers,
		body: '',
	};
};

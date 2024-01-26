import { S3, logBeforeTimeout } from '@firestone-hs/aws-lambda-utils';
import { Context } from 'aws-lambda';
import { yesterdayDate } from '../../misc-utils';
import { CONTEXTS, MIN_WINS } from '../comon/config';
import { buildDailyAggregate } from './draft-stats';

const s3 = new S3();

export default async (event, context: Context): Promise<any> => {
	const cleanup = logBeforeTimeout(context);
	// await allCards.initializeCardsDb();

	// if (event.catchUp) {
	// 	await dispatchCatchUpEvents(context, +event.catchUp);
	// 	return;
	// }

	const targetDate: string = event.targetDate || yesterdayDate();
	for (const minWin of MIN_WINS) {
		for (const context of CONTEXTS) {
			await buildDailyAggregate(minWin, context, targetDate, s3);
		}
	}

	cleanup();
	return { statusCode: 200, body: null };
};

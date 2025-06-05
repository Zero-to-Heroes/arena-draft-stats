import { S3 } from '@firestone-hs/aws-lambda-utils';
import { gzipSync } from 'zlib';
import { DraftStatsByContext, TimePeriod } from '../../model';
import { ARENA_STATS_BUCKET, ARENA_STATS_KEY_PREFIX } from '../comon/config';

export const saveDraftStats = async (
	stat: DraftStatsByContext,
	gameMode: 'arena' | 'arena-underground' | 'all',
	timePeriod: TimePeriod,
	s3: S3,
): Promise<void> => {
	const gzippedResult = gzipSync(JSON.stringify(stat));
	const destination = `${ARENA_STATS_KEY_PREFIX}/${gameMode}/${timePeriod}/${stat.context.toLowerCase()}.gz.json`;
	await s3.writeFile(gzippedResult, ARENA_STATS_BUCKET, destination, 'application/json', 'gzip');
};

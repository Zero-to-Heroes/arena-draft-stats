import { S3 } from '@firestone-hs/aws-lambda-utils';
import { gzipSync } from 'zlib';
import { DraftStatsByContextAndPeriod } from '../../internal-model';
import { ARENA_STATS_BUCKET, ARENA_STATS_KEY_PREFIX } from '../comon/config';

export const saveDraftStats = async (
	stat: DraftStatsByContextAndPeriod,
	minWin: number,
	startDate: string,
	s3: S3,
): Promise<void> => {
	const gzippedResult = gzipSync(JSON.stringify(stat));
	const destination = `${ARENA_STATS_KEY_PREFIX}/daily/${minWin}/${stat.context}/${startDate}.gz.json`;
	await s3.writeFile(gzippedResult, ARENA_STATS_BUCKET, destination, 'application/json', 'gzip');
};

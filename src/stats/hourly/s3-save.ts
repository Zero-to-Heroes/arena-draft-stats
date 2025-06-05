import { S3 } from '@firestone-hs/aws-lambda-utils';
import { gzipSync } from 'zlib';
import { DraftStatsByContextAndPeriod } from '../../internal-model';
import { ARENA_STATS_BUCKET, ARENA_STATS_KEY_PREFIX } from '../comon/config';

export const saveDraftStats = async (
	stat: DraftStatsByContextAndPeriod,
	minWin: number,
	gameMode: 'arena' | 'arena-underground',
	startDate: Date,
	s3: S3,
): Promise<void> => {
	const gzippedResult = gzipSync(JSON.stringify(stat));
	const destination = `${ARENA_STATS_KEY_PREFIX}/${gameMode}/hourly/${minWin}/${
		stat.context
	}/${startDate.toISOString()}.gz.json`;
	await s3.writeFile(gzippedResult, ARENA_STATS_BUCKET, destination, 'application/json', 'gzip');
};

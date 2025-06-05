import { S3, getArenaCurrentSeasonPatch, getLastArenaPatch } from '@firestone-hs/aws-lambda-utils';
import { Context } from 'aws-lambda';
import AWS from 'aws-sdk';
import { DraftStatsByContextAndPeriod } from './internal-model';
import { TimePeriod } from './model';
import { ARENA_STATS_BUCKET, ARENA_STATS_KEY_PREFIX } from './stats/comon/config';
import { buildFileKeys, buildFileNamesForGivenDay } from './stats/comon/utils';

const s3 = new S3();
const lambda = new AWS.Lambda();

export default async (event, context: Context): Promise<any> => {
	const timePeriod: TimePeriod = 'last-patch';
	const patchInfo = await getLastArenaPatch();
	const currentSeasonPatchInfo = await getArenaCurrentSeasonPatch();

	// Build all the list of days since the last patch, in the format YYYY-MM-DD
	const startDate = new Date(currentSeasonPatchInfo.date);
	startDate.setHours(0, 0, 0, 0); // Set to the start of the day
	const allDays: string[] = [];
	while (startDate < new Date()) {
		allDays.push(startDate.toISOString());
		startDate.setDate(startDate.getDate() + 1);
	}
	// Remove the first day
	allDays.shift();

	const lookingForCard = 'RLK_048';
	const minWins = 0;
	const statContext = 'global';

	console.log('hourly files');
	for (const gameMode of ['arena'] as const) {
		for (const day of allDays) {
			console.log(`Processing day: ${day} for game mode: ${gameMode}`);
			const fileNames = buildFileNamesForGivenDay(day);
			console.log(`File names for day ${day}:`, fileNames);
			const fileKeys = buildFileKeys('hourly', gameMode, minWins, statContext, fileNames);
			console.log(`File keys for day ${day}:`, fileKeys);
			const hourlyRawData: readonly string[] = await Promise.all(
				fileKeys.map((fileKey) => s3.readGzipContent(ARENA_STATS_BUCKET, fileKey, 1, false, 300)),
			);
			const hourlyData: readonly DraftStatsByContextAndPeriod[] = hourlyRawData
				.filter((d) => !!d?.length)
				.map((data) => JSON.parse(data));
			console.log(`Loaded ${hourlyData.length} hourly data files for day ${day}`);

			for (const hourly of hourlyData) {
				const cardStat = hourly.cardStats.find((stat) => stat.cardId === lookingForCard);
				if (cardStat) {
					console.log(
						`Found ${lookingForCard} in ${hourly.context} for ${day}: offered=${cardStat.offered}, picked=${cardStat.picked}`,
					);
				}
			}
		}
	}

	console.log('\ndaily files');
	for (const gameMode of ['arena'] as const) {
		for (const day of allDays) {
			console.log(`Processing day: ${day}`);
			const dateStr = day;
			const fileKeys = [
				`${ARENA_STATS_KEY_PREFIX}/${gameMode}/daily/${minWins}/${statContext}/${dateStr}.gz.json`,
			];
			console.log(`File keys for day ${day}:`, fileKeys);
			const hourlyRawData: readonly string[] = await Promise.all(
				fileKeys.map((fileKey) => s3.readGzipContent(ARENA_STATS_BUCKET, fileKey, 1, false, 300)),
			);
			const hourlyData: readonly DraftStatsByContextAndPeriod[] = hourlyRawData
				.filter((d) => !!d?.length)
				.map((data) => JSON.parse(data));
			console.log(`Loaded ${hourlyData.length} hourly data files for day ${day}`);

			for (const hourly of hourlyData) {
				const cardStat = hourly.cardStats.find((stat) => stat.cardId === lookingForCard);
				if (cardStat) {
					console.log(
						`Found ${lookingForCard} in ${hourly.context} for ${day}: offered=${cardStat.offered}, picked=${cardStat.picked}`,
					);
				}
			}
		}
	}

	return { statusCode: 200, body: null };
};

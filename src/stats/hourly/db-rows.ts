import SecretsManager, { GetSecretValueRequest, GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager';
import { Connection, createPool } from 'mysql';
import { InternalArenaMatchStatsDbRow } from '../../internal-model';

export const loadArenaMatches = async (
	startDate: Date,
	endDate: Date,
): Promise<readonly InternalArenaMatchStatsDbRow[]> => {
	const secretRequest: GetSecretValueRequest = {
		SecretId: 'rds-connection',
	};
	const secret: SecretInfo = await getSecret(secretRequest);
	const pool = createPool({
		connectionLimit: 1,
		host: secret.hostReadOnly,
		user: secret.username,
		password: secret.password,
		database: 'replay_summary',
		port: secret.port,
	});
	return performRowProcessIngPool(pool, startDate, endDate);
};

const performRowProcessIngPool = async (
	pool: any,
	startDate: Date,
	endDate: Date,
): Promise<readonly InternalArenaMatchStatsDbRow[]> => {
	return new Promise<readonly InternalArenaMatchStatsDbRow[]>((resolve) => {
		pool.getConnection(async (err, connection) => {
			if (err) {
				console.log('error with connection', err);
				throw new Error('Could not connect to DB');
			} else {
				const result = await performRowsProcessing(connection, startDate, endDate);
				connection.release();
				resolve(result);
			}
		});
	});
};

const performRowsProcessing = async (
	connection: Connection,
	startDate: Date,
	endDate: Date,
): Promise<readonly InternalArenaMatchStatsDbRow[]> => {
	return new Promise<readonly InternalArenaMatchStatsDbRow[]>((resolve) => {
		const queryStr = `
			SELECT playerClass, result, wins, losses, runId
			FROM arena_match_stats
			WHERE creationDate >= ?
			AND creationDate < ?
		`;
		console.log('running query', queryStr, [startDate, endDate]);
		const query = connection.query(queryStr, [startDate, endDate]);

		const rowsToProcess: InternalArenaMatchStatsDbRow[] = [];
		query
			.on('error', (err) => {
				console.error('error while fetching rows', err);
			})
			.on('fields', (fields) => {
				console.log('fields', fields);
			})
			.on('result', async (row: InternalArenaMatchStatsDbRow) => {
				rowsToProcess.push(row);
			})
			.on('end', async () => {
				console.log('end', rowsToProcess.length);
				resolve(rowsToProcess);
			});
	});
};

const getSecret = (secretRequest: GetSecretValueRequest) => {
	const secretsManager = new SecretsManager({ region: 'us-west-2' });
	return new Promise<SecretInfo>((resolve) => {
		secretsManager.getSecretValue(secretRequest, (err, data: GetSecretValueResponse) => {
			const secretInfo: SecretInfo = JSON.parse(data.SecretString);
			resolve(secretInfo);
		});
	});
};

interface SecretInfo {
	readonly username: string;
	readonly password: string;
	readonly host: string;
	readonly hostReadOnly: string;
	readonly port: number;
	readonly dbClusterIdentifier: string;
}

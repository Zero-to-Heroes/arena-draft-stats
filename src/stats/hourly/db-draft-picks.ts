import SecretsManager, { GetSecretValueRequest, GetSecretValueResponse } from 'aws-sdk/clients/secretsmanager';
import { Connection, createPool } from 'mysql';
import { InternalDraftPickDbRow } from '../../internal-model';

export const loadDraftPicks = async (runIds: readonly string[]): Promise<readonly InternalDraftPickDbRow[]> => {
	if (!runIds?.length) {
		return [];
	}

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
	return performRowProcessIngPool(pool, runIds);
};

const performRowProcessIngPool = async (
	pool: any,
	runIds: readonly string[],
): Promise<readonly InternalDraftPickDbRow[]> => {
	return new Promise<readonly InternalDraftPickDbRow[]>((resolve) => {
		pool.getConnection(async (err, connection) => {
			if (err) {
				console.log('error with connection', err);
				throw new Error('Could not connect to DB');
			} else {
				const result = await performRowsProcessing(connection, runIds);
				connection.release();
				resolve(result);
			}
		});
	});
};

const performRowsProcessing = async (
	connection: Connection,
	runIds: readonly string[],
): Promise<readonly InternalDraftPickDbRow[]> => {
	return new Promise<readonly InternalDraftPickDbRow[]>((resolve) => {
		const queryStr = `
			SELECT runId, playerClass, pickNumber, options, pick
			FROM arena_draft_pick
			WHERE runId in (?)
			ORDER BY runId, pickNumber
		`;
		console.log('running query', runIds.length, queryStr);
		const query = connection.query(queryStr, [runIds]);

		const rowsToProcess: InternalDraftPickDbRow[] = [];
		query
			.on('error', (err) => {
				console.error('error while fetching rows', err);
			})
			.on('fields', (fields) => {
				console.log('fields', fields);
			})
			.on('result', async (row: InternalDraftPickDbRow) => {
				// Filter out bogus data
				if (row.options?.includes(row.pick)) {
					rowsToProcess.push(row);
				}
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

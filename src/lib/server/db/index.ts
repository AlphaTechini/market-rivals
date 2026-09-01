import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

type Database = ReturnType<typeof drizzle<typeof schema>>;

let client: ReturnType<typeof postgres> | undefined;
let database: Database | undefined;

export function getDb(): Database {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
	if (!database) {
		client = postgres(env.DATABASE_URL, { max: 5, ssl: 'require' });
		database = drizzle(client, { schema });
	}

	return database;
}

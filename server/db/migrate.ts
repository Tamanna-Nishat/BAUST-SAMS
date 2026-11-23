import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type { Pool } from 'pg';
import { getPgPool } from './pool.ts';

dotenv.config();

export async function applyMigrations(pool: Pool): Promise<string[]> {
  const migrationsDir = path.resolve(process.cwd(), 'server/db/migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await pool.query(sql);
  }

  return files;
}

const isDirectRun =
  typeof process.argv[1] === 'string' &&
  path.resolve(process.argv[1]) === path.resolve(process.cwd(), 'server/db/migrate.ts');

if (isDirectRun) {
  (async () => {
    const pool = getPgPool();
    const applied = await applyMigrations(pool);
    console.log(`PostgreSQL migrations applied successfully: ${applied.join(', ')}`);
    await pool.end();
  })().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

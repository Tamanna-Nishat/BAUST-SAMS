import { Pool } from 'pg';

declare global {
  var _baustPgPool: Pool | undefined;
}

const REQUIRED_PG_VARS = ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'] as const;

export interface PostgresConfigStatus {
  configured: boolean;
  partial: boolean;
  missingVars: string[];
  invalidVars: string[];
  errorMessage: string | null;
}

export function getPostgresConfigStatus(): PostgresConfigStatus {
  const presentVars = REQUIRED_PG_VARS.filter((k) => Boolean(process.env[k]?.trim()));
  const missingVars = REQUIRED_PG_VARS.filter((k) => !process.env[k]?.trim());
  const invalidVars: string[] = [];

  const rawPort = process.env.PGPORT?.trim();
  if (rawPort) {
    const parsedPort = Number(rawPort);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      invalidVars.push('PGPORT');
    }
  }

  const partial = presentVars.length > 0 && missingVars.length > 0;
  const configured = missingVars.length === 0 && invalidVars.length === 0;

  let errorMessage: string | null = null;
  if (partial) {
    errorMessage = `Partial PostgreSQL configuration detected. Missing required environment variable(s): ${missingVars.join(', ')}.`;
  } else if (invalidVars.length > 0) {
    errorMessage = `Invalid PostgreSQL environment variable(s): ${invalidVars.join(', ')}.`;
  }

  return {
    configured,
    partial,
    missingVars,
    invalidVars,
    errorMessage,
  };
}

export function isPostgresConfigured(): boolean {
  return getPostgresConfigStatus().configured;
}

const DB_CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ETIMEDOUT',
  'EPIPE',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '28000',
  '28P01',
  '3D000',
  '57P01',
  '57P02',
  '57P03',
]);

export function isDatabaseConnectionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: unknown }).code;
  if (typeof code === 'string' && DB_CONNECTION_ERROR_CODES.has(code)) {
    return true;
  }
  const msg = err instanceof Error ? err.message : '';
  return (
    msg.includes('ECONNREFUSED') ||
    msg.includes('Connection terminated') ||
    msg.includes('timeout exceeded when trying to connect') ||
    msg.includes('PostgreSQL environment variables')
  );
}

export function getPgPool(): Pool {
  const status = getPostgresConfigStatus();
  if (!status.configured) {
    throw new Error(
      status.errorMessage ||
        'PostgreSQL environment variables (PGHOST, PGDATABASE, PGUSER, PGPASSWORD) are not configured.'
    );
  }

  if (!global._baustPgPool) {
    global._baustPgPool = new Pool({
      host: process.env.PGHOST!.trim(),
      port: process.env.PGPORT?.trim() ? Number(process.env.PGPORT.trim()) : 5432,
      database: process.env.PGDATABASE!.trim(),
      user: process.env.PGUSER!.trim(),
      password: process.env.PGPASSWORD!,
      ssl: ['true', 'require', '1'].includes((process.env.PGSSL ?? '').trim().toLowerCase())
        ? { rejectUnauthorized: false }
        : false,
      max: 10,
      connectionTimeoutMillis: 10000,
    });

    global._baustPgPool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });
  }

  return global._baustPgPool;
}

export async function checkPostgresConnection(): Promise<{ ok: boolean; error?: string }> {
  const status = getPostgresConfigStatus();
  if (!status.configured) {
    return { ok: false, error: status.errorMessage ?? 'PostgreSQL is not configured.' };
  }
  try {
    const pool = getPgPool();
    await pool.query('SELECT 1');
    return { ok: true };
  } catch (err) {
    console.error('PostgreSQL connectivity check failed:', err);
    return {
      ok: false,
      error: 'Unable to connect to PostgreSQL database. Verify PostgreSQL service status and credentials.',
    };
  }
}

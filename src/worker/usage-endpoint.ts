import { parseUsageReport } from '../app/domain/usage';

/**
 * `POST /api/usage` (#76): adds a device's anonymous day counts to the `counts` table.
 * Reads nothing about the sender: no IP, no header beyond Origin and Content-Length, no
 * logging. The table holds only `(day, event, n)` totals, never a row per device.
 *
 * A daily write budget (#78) keeps the endpoint from spending the account's D1 row-write
 * quota, which on the Free plan is shared by every database of the account: past the budget it
 * writes nothing and answers 503, and the app keeps its counts for another day. The same
 * `daily_intake` row counts the reports of the day, to spot made-up traffic.
 */

/** The largest body a real report needs (62 days of 5 events) with room to spare. */
export const MAX_BODY_BYTES = 8192;

/** Used when `USAGE_DAILY_ROW_BUDGET` is missing or not a positive integer. */
export const DEFAULT_DAILY_ROW_BUDGET = 20_000;

/** The part of a D1 database the endpoint uses; the real binding matches it. */
export interface CountsDatabase {
  prepare(query: string): { bind(...values: unknown[]): CountsStatement };
  batch(statements: CountsStatement[]): Promise<unknown>;
}

/** A bound statement: batched, or read on its own for the first row. */
export interface CountsStatement {
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

export const UPSERT_COUNT =
  'INSERT INTO counts (day, event, n) VALUES (?1, ?2, ?3) ' +
  'ON CONFLICT (day, event) DO UPDATE SET n = n + excluded.n';

export const READ_INTAKE = 'SELECT rows FROM daily_intake WHERE day = ?1';

export const UPSERT_INTAKE =
  'INSERT INTO daily_intake (day, reports, rows) VALUES (?1, 1, ?2) ' +
  'ON CONFLICT (day) DO UPDATE SET reports = reports + 1, rows = rows + excluded.rows';

/** The budget as configured, or the default when the setting is absent or not usable. */
export function dailyRowBudget(setting: unknown): number {
  const budget = Number(setting);
  return Number.isInteger(budget) && budget > 0 ? budget : DEFAULT_DAILY_ROW_BUDGET;
}

/** Seconds from `now` to the next midnight UTC, when D1 and the budget start a new day. */
function secondsToUtcMidnight(now: Date): number {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

const NO_STORE = { 'cache-control': 'no-store' };

function reply(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers: { ...NO_STORE, ...headers } });
}

export async function handleUsage(
  request: Request,
  db: CountsDatabase,
  now: Date,
  budget = DEFAULT_DAILY_ROW_BUDGET,
): Promise<Response> {
  if (request.method !== 'POST') {
    return reply(405, { allow: 'POST' });
  }
  // Browsers send Origin on every POST; the app only ever posts to its own origin.
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return reply(403);
  }
  // Checked before reading, when declared; the length of what arrives is checked again below.
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return reply(413);
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return reply(413);
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return reply(400);
  }
  const today = now.toISOString().slice(0, 10);
  const report = parseUsageReport(body, today);
  if (report === null) {
    return reply(400);
  }

  const statements = report.days.flatMap(({ day, counts }) =>
    Object.entries(counts).map(([event, n]) => db.prepare(UPSERT_COUNT).bind(day, event, n)),
  );
  if (statements.length === 0) {
    return reply(204);
  }

  // The counts plus the intake row itself. Concurrent reports may pass the budget by a few
  // rows; it is a guard for the quota, not an exact meter.
  const rows = statements.length + 1;
  const intake = await db.prepare(READ_INTAKE).bind(today).first<{ rows: number }>();
  if ((intake?.rows ?? 0) + rows > budget) {
    return reply(503, { 'retry-after': String(secondsToUtcMidnight(now)) });
  }
  await db.batch([...statements, db.prepare(UPSERT_INTAKE).bind(today, rows)]);
  return reply(204);
}

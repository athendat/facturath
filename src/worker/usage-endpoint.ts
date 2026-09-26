import { parseUsageReport } from '../app/domain/usage';

/**
 * `POST /api/usage` (#76): adds a device's anonymous day counts to the `counts` table.
 * Reads nothing about the sender: no IP, no header beyond Origin and Content-Length, no
 * logging. The table holds only `(day, event, n)` totals, never a row per device.
 */

/** The largest body a real report needs (62 days of 5 events) with room to spare. */
export const MAX_BODY_BYTES = 8192;

/** The part of a D1 database the endpoint uses; the real binding matches it. */
export interface CountsDatabase {
  prepare(query: string): { bind(...values: unknown[]): CountsStatement };
  batch(statements: CountsStatement[]): Promise<unknown>;
}

/** An opaque prepared statement. */
export type CountsStatement = object;

export const UPSERT_COUNT =
  'INSERT INTO counts (day, event, n) VALUES (?1, ?2, ?3) ' +
  'ON CONFLICT (day, event) DO UPDATE SET n = n + excluded.n';

const NO_STORE = { 'cache-control': 'no-store' };

function reply(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers: { ...NO_STORE, ...headers } });
}

export async function handleUsage(
  request: Request,
  db: CountsDatabase,
  now: Date,
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
  const report = parseUsageReport(body, now.toISOString().slice(0, 10));
  if (report === null) {
    return reply(400);
  }

  const statements = report.days.flatMap(({ day, counts }) =>
    Object.entries(counts).map(([event, n]) => db.prepare(UPSERT_COUNT).bind(day, event, n)),
  );
  if (statements.length > 0) {
    await db.batch(statements);
  }
  return reply(204);
}

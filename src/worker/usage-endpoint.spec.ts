import { MAX_BODY_BYTES, UPSERT_COUNT, handleUsage, type CountsDatabase } from './usage-endpoint';

const ORIGIN = 'https://facturath.athendat.site';
const NOW = new Date('2026-09-26T12:00:00Z');

/** Records the upserts the endpoint batches, as `[day, event, n]`. */
function fakeDatabase() {
  const rows: unknown[][] = [];
  const queries: string[] = [];
  const db: CountsDatabase = {
    prepare: (query) => ({
      bind: (...values) => {
        queries.push(query);
        return { values };
      },
    }),
    batch: (statements) => {
      rows.push(...statements.map((statement) => (statement as { values: unknown[] }).values));
      return Promise.resolve([]);
    },
  };
  return { db, rows, queries };
}

function post(body: string, headers: Record<string, string> = {}): Request {
  return new Request(`${ORIGIN}/api/usage`, {
    method: 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json', ...headers },
    body,
  });
}

const report = (days: unknown) => JSON.stringify({ days });

describe('POST /api/usage', () => {
  it('adds each day and event of a report to the totals and answers 204 without caching', async () => {
    const { db, rows, queries } = fakeDatabase();

    const response = await handleUsage(
      post(
        report([
          { day: '2026-09-25', counts: { invoice: 2, save: 1 } },
          { day: '2026-09-26', counts: { install: 1, 'active-day': 1, 'active-month': 1 } },
        ]),
      ),
      db,
      NOW,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(rows).toEqual([
      ['2026-09-25', 'invoice', 2],
      ['2026-09-25', 'save', 1],
      ['2026-09-26', 'install', 1],
      ['2026-09-26', 'active-day', 1],
      ['2026-09-26', 'active-month', 1],
    ]);
    expect(new Set(queries)).toEqual(new Set([UPSERT_COUNT]));
  });

  it('cuts counts to the daily caps and ignores unknown events and non-positive counts', async () => {
    const { db, rows } = fakeDatabase();

    await handleUsage(
      post(
        report([
          {
            day: '2026-09-26',
            counts: { install: 9, invoice: 5000, visits: 3, save: 0, 'active-day': -1 },
          },
        ]),
      ),
      db,
      NOW,
    );

    expect(rows).toEqual([
      ['2026-09-26', 'install', 1],
      ['2026-09-26', 'invoice', 200],
    ]);
  });

  it('ignores days older than 60 days or more than one day ahead, and still answers 204', async () => {
    const { db, rows } = fakeDatabase();

    const response = await handleUsage(
      post(
        report([
          { day: '2026-07-27', counts: { save: 1 } },
          { day: '2026-07-28', counts: { save: 1 } },
          { day: '2026-09-27', counts: { save: 1 } },
          { day: '2026-09-28', counts: { save: 1 } },
        ]),
      ),
      db,
      NOW,
    );

    expect(response.status).toBe(204);
    expect(rows).toEqual([
      ['2026-07-28', 'save', 1],
      ['2026-09-27', 'save', 1],
    ]);
  });

  it.each([
    ['not JSON', '{days:'],
    ['not a report', JSON.stringify({ hello: 'world' })],
    ['a day that is not a date', report([{ day: 'yesterday', counts: { save: 1 } }])],
    ['counts that are not an object', report([{ day: '2026-09-26', counts: 3 }])],
    [
      'too many days',
      report(Array.from({ length: 63 }, () => ({ day: '2026-09-26', counts: { save: 1 } }))),
    ],
  ])('refuses %s with 400 and writes nothing', async (_, body) => {
    const { db, rows } = fakeDatabase();

    const response = await handleUsage(post(body), db, NOW);

    expect(response.status).toBe(400);
    expect(rows).toEqual([]);
  });

  it('refuses a request from another origin, or with no origin at all', async () => {
    const { db, rows } = fakeDatabase();
    const body = report([{ day: '2026-09-26', counts: { save: 1 } }]);

    const foreign = await handleUsage(post(body, { origin: 'https://example.com' }), db, NOW);
    const bare = await handleUsage(
      new Request(`${ORIGIN}/api/usage`, { method: 'POST', body }),
      db,
      NOW,
    );

    expect([foreign.status, bare.status]).toEqual([403, 403]);
    expect(rows).toEqual([]);
  });

  it('refuses anything but POST', async () => {
    const { db } = fakeDatabase();

    const response = await handleUsage(
      new Request(`${ORIGIN}/api/usage`, { headers: { origin: ORIGIN } }),
      db,
      NOW,
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('refuses a body larger than a report can be', async () => {
    const { db, rows } = fakeDatabase();

    const response = await handleUsage(post(' '.repeat(MAX_BODY_BYTES + 1)), db, NOW);

    expect(response.status).toBe(413);
    expect(rows).toEqual([]);
  });
});

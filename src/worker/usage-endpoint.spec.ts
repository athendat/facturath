import {
  DEFAULT_DAILY_ROW_BUDGET,
  MAX_BODY_BYTES,
  READ_INTAKE,
  UPSERT_COUNT,
  UPSERT_INTAKE,
  dailyRowBudget,
  handleUsage,
  type CountsDatabase,
  type CountsStatement,
} from './usage-endpoint';

const ORIGIN = 'https://facturath.athendat.site';
const NOW = new Date('2026-09-26T12:00:00Z');

interface Bound extends CountsStatement {
  query: string;
  values: unknown[];
}

/**
 * A D1 stand-in. `rows` collects the count upserts the endpoint batches, as `[day, event, n]`;
 * `intake` the daily intake upserts, as `[day, rows]`; `reads` the budget reads. `writtenToday`
 * is what the intake row already holds for today, null when there is no row yet.
 */
function fakeDatabase(writtenToday: number | null = null) {
  const rows: unknown[][] = [];
  const intake: unknown[][] = [];
  const reads: unknown[][] = [];
  const queries: string[] = [];
  const db: CountsDatabase = {
    prepare: (query) => ({
      bind: (...values): Bound => ({
        query,
        values,
        first: <T>() => {
          reads.push(values);
          return Promise.resolve(
            (writtenToday === null ? null : { rows: writtenToday }) as T | null,
          );
        },
      }),
    }),
    batch: (statements) => {
      for (const { query, values } of statements as Bound[]) {
        queries.push(query);
        (query === UPSERT_INTAKE ? intake : rows).push(values);
      }
      return Promise.resolve([]);
    },
  };
  return { db, rows, intake, reads, queries };
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
    expect(new Set(queries)).toEqual(new Set([UPSERT_COUNT, UPSERT_INTAKE]));
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

  describe('daily write budget', () => {
    const oneDay = report([{ day: '2026-09-26', counts: { invoice: 1, save: 2 } }]);

    it('counts the report and the rows it writes for the UTC day, in the same batch', async () => {
      const { db, intake, reads } = fakeDatabase(40);

      const response = await handleUsage(post(oneDay), db, NOW);

      expect(response.status).toBe(204);
      expect(reads).toEqual([['2026-09-26']]);
      // Two counts and the intake row itself.
      expect(intake).toEqual([['2026-09-26', 3]]);
    });

    it('starts the day at zero when nothing has been written yet', async () => {
      const { db, rows } = fakeDatabase(null);

      const response = await handleUsage(post(oneDay), db, NOW, 3);

      expect(response.status).toBe(204);
      expect(rows).toHaveLength(2);
    });

    it('writes nothing past the budget and asks to come back after midnight UTC', async () => {
      const { db, rows, intake } = fakeDatabase(98);

      const response = await handleUsage(post(oneDay), db, NOW, 100);

      expect(response.status).toBe(503);
      expect(response.headers.get('retry-after')).toBe(String(12 * 60 * 60));
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect([rows, intake]).toEqual([[], []]);
    });

    it('takes a report that fits the budget exactly', async () => {
      const { db, rows } = fakeDatabase(97);

      const response = await handleUsage(post(oneDay), db, NOW, 100);

      expect(response.status).toBe(204);
      expect(rows).toHaveLength(2);
    });

    it('neither reads nor writes for a report left empty once out-of-window days are dropped', async () => {
      const { db, rows, intake, reads } = fakeDatabase(0);

      const response = await handleUsage(
        post(report([{ day: '2026-01-01', counts: { save: 1 } }])),
        db,
        NOW,
      );

      expect(response.status).toBe(204);
      expect([rows, intake, reads]).toEqual([[], [], []]);
    });

    it('reads the budget from the setting, falling back to the default when it is not usable', () => {
      expect(dailyRowBudget('5000')).toBe(5000);
      for (const setting of [undefined, '', 'mucho', '0', '-3', '2.5']) {
        expect(dailyRowBudget(setting)).toBe(DEFAULT_DAILY_ROW_BUDGET);
      }
    });

    it('reads today with the intake query', async () => {
      const { db } = fakeDatabase(0);
      const prepared: string[] = [];
      const spied: CountsDatabase = {
        ...db,
        prepare: (query) => (prepared.push(query), db.prepare(query)),
      };

      await handleUsage(post(oneDay), spied, NOW);

      expect(prepared).toContain(READ_INTAKE);
    });
  });
});

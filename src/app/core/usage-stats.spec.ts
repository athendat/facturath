import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { UsageReport } from '../domain/usage';
import {
  USAGE_CLOCK,
  USAGE_KEY,
  USAGE_TRANSPORT,
  UsageStats,
  type UsageSendResult,
} from './usage-stats';

/** Just enough of localStorage, kept per test so one test's counts never leak into another. */
class MemoryStorage {
  private readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

/** A window of its own per test: listeners from an earlier test never fire here. */
function fakeWindow(options: { gpc?: boolean; blocked?: boolean } = {}) {
  const view = new EventTarget() as EventTarget & {
    localStorage: MemoryStorage;
    navigator: object;
  };
  const storage = new MemoryStorage();
  Object.defineProperty(view, 'localStorage', {
    get: () => {
      if (options.blocked) {
        throw new DOMException('Access is denied for this document.', 'SecurityError');
      }
      return storage;
    },
  });
  view.navigator = options.gpc ? { globalPrivacyControl: true } : {};
  return { view, storage };
}

describe('UsageStats', () => {
  let window: ReturnType<typeof fakeWindow>;
  let now: Date;
  let result: UsageSendResult;
  let sent: UsageReport[];
  let invoiceId: string;
  /** How the transport answers; tests swap it to hold a report on its way. */
  let answer: (report: UsageReport) => Promise<UsageSendResult>;

  /** A fresh app start over the same window: what a reload does. */
  async function open(): Promise<UsageStats> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: { defaultView: window.view } },
        { provide: USAGE_CLOCK, useValue: () => now },
        {
          provide: USAGE_TRANSPORT,
          useValue: (report: UsageReport) => {
            sent.push(structuredClone(report));
            return answer(report);
          },
        },
      ],
    });
    const usage = TestBed.inject(UsageStats);
    usage.start({ currentInvoiceId: () => invoiceId });
    await usage.flush();
    return usage;
  }

  function stored(): Record<string, unknown> {
    return JSON.parse(window.storage.getItem(USAGE_KEY) ?? '{}') as Record<string, unknown>;
  }

  async function print(usage: UsageStats): Promise<void> {
    window.view.dispatchEvent(new Event('beforeprint'));
    await usage.flush();
  }

  beforeEach(() => {
    window = fakeWindow();
    now = new Date(2026, 8, 26, 10);
    result = 'sent';
    sent = [];
    invoiceId = 'invoice-1';
    answer = () => Promise.resolve(result);
  });

  it('counts the first open of a browser as an install, a daily and a monthly active device', async () => {
    await open();

    expect(sent).toEqual([
      { days: [{ day: '2026-09-26', counts: { install: 1, 'active-day': 1, 'active-month': 1 } }] },
    ]);
    expect(stored()['pending']).toEqual({});
  });

  it('counts a device once per day and once per month, however often it opens', async () => {
    await open();
    await open();
    now = new Date(2026, 8, 27, 9);
    await open();
    now = new Date(2026, 9, 1, 9);
    await open();

    expect(sent.slice(1)).toEqual([
      { days: [{ day: '2026-09-27', counts: { 'active-day': 1 } }] },
      { days: [{ day: '2026-10-01', counts: { 'active-day': 1, 'active-month': 1 } }] },
    ]);
  });

  it('counts an invoice the first time it is printed, not when it is printed again', async () => {
    const usage = await open();

    await print(usage);
    await print(usage);
    invoiceId = 'invoice-2';
    await print(usage);

    expect(sent.slice(1)).toEqual([
      { days: [{ day: '2026-09-26', counts: { invoice: 1 } }] },
      { days: [{ day: '2026-09-26', counts: { invoice: 1 } }] },
    ]);
  });

  it('remembers counted invoices across reloads, on the device only', async () => {
    const usage = await open();
    await print(usage);

    const reloaded = await open();
    await print(reloaded);

    expect(sent.filter((report) => report.days.some((day) => day.counts.invoice))).toHaveLength(1);
    expect(JSON.stringify(sent)).not.toContain('invoice-1');
    expect(stored()['counted']).toEqual(['invoice-1']);
  });

  it('sends nothing but days and event counts', async () => {
    const usage = await open();
    await print(usage);
    usage.invoiceSaved();
    await usage.flush();

    for (const report of sent) {
      expect(Object.keys(report)).toEqual(['days']);
      for (const day of report.days) {
        expect(Object.keys(day).sort()).toEqual(['counts', 'day']);
        for (const [event, count] of Object.entries(day.counts)) {
          expect(['install', 'active-day', 'active-month', 'invoice', 'save']).toContain(event);
          expect(typeof count).toBe('number');
        }
      }
    }
  });

  it('counts each save', async () => {
    const usage = await open();

    usage.invoiceSaved();
    await usage.flush();
    usage.invoiceSaved();
    await usage.flush();

    expect(sent.slice(1)).toEqual([
      { days: [{ day: '2026-09-26', counts: { save: 1 } }] },
      { days: [{ day: '2026-09-26', counts: { save: 1 } }] },
    ]);
  });

  it('keeps the counts while offline and sends them together when the network is back', async () => {
    result = 'failed';
    const usage = await open();
    await print(usage);
    now = new Date(2026, 8, 27, 9);
    usage.invoiceSaved();
    await usage.flush();

    result = 'sent';
    sent = [];
    window.view.dispatchEvent(new Event('online'));
    await usage.flush();

    expect(sent).toEqual([
      {
        days: [
          {
            day: '2026-09-26',
            counts: { install: 1, 'active-day': 1, 'active-month': 1, invoice: 1 },
          },
          { day: '2026-09-27', counts: { save: 1 } },
        ],
      },
    ]);
    expect(stored()['pending']).toEqual({});
  });

  it('never sends a report twice when the page reloads while it is on its way', async () => {
    const usage = await open();
    let arrive: (value: UsageSendResult) => void = () => undefined;
    answer = () => new Promise((resolve) => (arrive = resolve));

    usage.invoiceSaved();
    // The report is out and its answer has not come back when the page reloads.
    answer = () => Promise.resolve(result);
    await open();
    arrive('sent');

    expect(sent.slice(1)).toEqual([{ days: [{ day: '2026-09-26', counts: { save: 1 } }] }]);
  });

  it('keeps the counts of a report that failed while more were counted', async () => {
    const usage = await open();
    let arrive: (value: UsageSendResult) => void = () => undefined;
    answer = () => new Promise((resolve) => (arrive = resolve));

    usage.invoiceSaved();
    usage.invoiceSaved(); // counted while the first report is on its way
    answer = () => Promise.resolve('sent');
    arrive('failed');
    // The second save asked for another report once the first landed.
    await new Promise((resolve) => setTimeout(resolve));
    await usage.flush();

    expect(sent.at(-1)).toEqual({ days: [{ day: '2026-09-26', counts: { save: 2 } }] });
    expect(stored()['pending']).toEqual({});
  });

  it('drops counts the server refuses for good, so a bad report is not retried forever', async () => {
    result = 'rejected';
    const usage = await open();

    sent = [];
    await usage.flush();

    expect(sent).toEqual([]);
    expect(stored()['pending']).toEqual({});
  });

  it('forgets pending counts and stops counting when the user turns it off, across reloads', async () => {
    result = 'failed';
    const usage = await open();

    usage.setEnabled(false);
    await print(usage);
    result = 'sent';
    sent = [];
    const reloaded = await open();
    await print(reloaded);

    expect(reloaded.enabled()).toBe(false);
    expect(sent).toEqual([]);
    expect(stored()['pending']).toEqual({});
  });

  it('counts again once the user turns it back on', async () => {
    const usage = await open();
    usage.setEnabled(false);
    usage.setEnabled(true);

    await print(usage);

    expect(sent.at(-1)).toEqual({ days: [{ day: '2026-09-26', counts: { invoice: 1 } }] });
  });

  it('starts off when the browser sends Global Privacy Control, unless the user turns it on', async () => {
    window = fakeWindow({ gpc: true });

    const usage = await open();
    expect(usage.enabled()).toBe(false);
    expect(sent).toEqual([]);

    usage.setEnabled(true);
    await print(usage);
    const reloaded = await open();

    expect(reloaded.enabled()).toBe(true);
    expect(sent[0]).toEqual({ days: [{ day: '2026-09-26', counts: { invoice: 1 } }] });
  });

  it('counts nothing when localStorage is blocked, since every session would look like a new install', async () => {
    window = fakeWindow({ blocked: true });

    const usage = await open();
    await print(usage);

    expect(usage.enabled()).toBe(false);
    expect(sent).toEqual([]);
  });

  it('never counts before the app has started in a browser', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT, useValue: { defaultView: window.view } },
        { provide: USAGE_TRANSPORT, useValue: () => Promise.resolve(result) },
      ],
    });
    const usage = TestBed.inject(UsageStats);

    usage.invoiceSaved();
    await usage.flush();

    expect(window.storage.getItem(USAGE_KEY)).toBeNull();
  });
});

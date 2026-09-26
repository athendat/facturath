/**
 * Anonymous usage counters (#76): what the app counts, how a device keeps its counts until
 * they are sent, and the rules the server applies to a report. Shared by the browser and the
 * Worker, so both sides agree on events, caps and the date window.
 *
 * Nothing here identifies anyone. A report is a list of local days, each with how many times
 * an event happened that day on this device; the invoice ids that stop a reprint from counting
 * twice stay on the device.
 */

/** What is counted. */
export const USAGE_EVENTS = ['install', 'active-day', 'active-month', 'invoice', 'save'] as const;

export type UsageEvent = (typeof USAGE_EVENTS)[number];

/** How many times each event happened on one day. */
export type UsageCounts = Partial<Record<UsageEvent, number>>;

export interface UsageDay {
  /** Local date, `YYYY-MM-DD`. */
  day: string;
  counts: UsageCounts;
}

/** The body of `POST /api/usage`. */
export interface UsageReport {
  days: UsageDay[];
}

/**
 * The most one device can add to an event in one day. The first three happen at most once by
 * design; the other two are far above real use and stop a stuck client from inflating totals.
 */
export const USAGE_DAILY_CAPS: Readonly<Record<UsageEvent, number>> = {
  install: 1,
  'active-day': 1,
  'active-month': 1,
  invoice: 200,
  save: 500,
};

/** Days older than this are dropped by the device and ignored by the server. */
export const USAGE_MAX_AGE_DAYS = 60;

/** How many invoice ids a device remembers as already counted. Older ones may count again. */
export const COUNTED_INVOICES_LIMIT = 1000;

/** What a device keeps between sessions. */
export interface UsageState {
  /** Whether this browser already counted its `install`. */
  installed: boolean;
  /** The last local day that counted `active-day`. */
  lastActiveDay: string | null;
  /** The last month (`YYYY-MM`) that counted `active-month`. */
  lastActiveMonth: string | null;
  /** Invoice ids already counted, oldest first. */
  counted: string[];
  /** Counts not yet accepted by the server, by local day. */
  pending: Record<string, UsageCounts>;
}

export function createUsageState(): UsageState {
  return { installed: false, lastActiveDay: null, lastActiveMonth: null, counted: [], pending: {} };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function isUsageEvent(value: string): value is UsageEvent {
  return (USAGE_EVENTS as readonly string[]).includes(value);
}

/** Adds `amount` to `event` on `day`, within the daily cap. */
function add(state: UsageState, day: string, event: UsageEvent, amount = 1): UsageState {
  const counts = state.pending[day] ?? {};
  const next = Math.min((counts[event] ?? 0) + amount, USAGE_DAILY_CAPS[event]);
  return { ...state, pending: { ...state.pending, [day]: { ...counts, [event]: next } } };
}

/** Counts an app open: `install` the first time, then `active-day` and `active-month` once each. */
export function recordOpen(state: UsageState, day: string): UsageState {
  let next = state;
  if (!next.installed) {
    next = { ...add(next, day, 'install'), installed: true };
  }
  if (next.lastActiveDay !== day) {
    next = { ...add(next, day, 'active-day'), lastActiveDay: day };
  }
  const month = day.slice(0, 7);
  if (next.lastActiveMonth !== month) {
    next = { ...add(next, day, 'active-month'), lastActiveMonth: month };
  }
  return next;
}

/** Counts an issued invoice, once per id. */
export function recordInvoice(state: UsageState, day: string, invoiceId: string): UsageState {
  if (state.counted.includes(invoiceId)) {
    return state;
  }
  const counted = [...state.counted, invoiceId].slice(-COUNTED_INVOICES_LIMIT);
  return { ...add(state, day, 'invoice'), counted };
}

export function recordSave(state: UsageState, day: string): UsageState {
  return add(state, day, 'save');
}

/** The pending counts as a report, or null when there is nothing to send. */
export function pendingReport(state: UsageState): UsageReport | null {
  const days = Object.entries(state.pending)
    .filter(([, counts]) => Object.keys(counts).length > 0)
    .map(([day, counts]) => ({ day, counts }));
  return days.length === 0 ? null : { days };
}

/**
 * Puts the counts of a report that did not go through back into the pending counts, next to
 * anything counted meanwhile.
 */
export function withReportRestored(state: UsageState, report: UsageReport): UsageState {
  let next = state;
  for (const { day, counts } of report.days) {
    for (const event of USAGE_EVENTS) {
      const count = counts[event] ?? 0;
      if (count > 0) {
        next = add(next, day, event, count);
      }
    }
  }
  return next;
}

/**
 * Removes what `report` carries from the pending counts. Counts added while it is on its way
 * stay, so a report that crosses a new event loses nothing.
 */
export function withoutReported(state: UsageState, report: UsageReport): UsageState {
  const pending = { ...state.pending };
  for (const { day, counts } of report.days) {
    const left: UsageCounts = { ...pending[day] };
    for (const event of USAGE_EVENTS) {
      const remaining = (left[event] ?? 0) - (counts[event] ?? 0);
      if (remaining > 0) {
        left[event] = remaining;
      } else {
        delete left[event];
      }
    }
    if (Object.keys(left).length === 0) {
      delete pending[day];
    } else {
      pending[day] = left;
    }
  }
  return { ...state, pending };
}

/** `YYYY-MM-DD` `offset` days from `day`, in UTC arithmetic so no time zone shifts it. */
export function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/** Drops pending days the server would ignore as too old. */
export function withoutStaleDays(state: UsageState, today: string): UsageState {
  const oldest = shiftDay(today, -USAGE_MAX_AGE_DAYS);
  const pending = Object.fromEntries(
    Object.entries(state.pending).filter(([day]) => day >= oldest),
  );
  return { ...state, pending };
}

/**
 * The state read back from storage: every valid field is taken, anything else is the default,
 * so a damaged value never stops the app and never sends garbage.
 */
export function usageStateFrom(stored: Record<string, unknown>): UsageState {
  const state = createUsageState();
  if (stored['installed'] === true) {
    state.installed = true;
  }
  const lastDay = stored['lastActiveDay'];
  if (typeof lastDay === 'string' && DAY.test(lastDay)) {
    state.lastActiveDay = lastDay;
  }
  const lastMonth = stored['lastActiveMonth'];
  if (typeof lastMonth === 'string' && /^\d{4}-\d{2}$/.test(lastMonth)) {
    state.lastActiveMonth = lastMonth;
  }
  const counted = stored['counted'];
  if (Array.isArray(counted)) {
    state.counted = counted
      .filter((id): id is string => typeof id === 'string')
      .slice(-COUNTED_INVOICES_LIMIT);
  }
  const report = parseUsageReport({ days: pendingDays(stored['pending']) });
  if (report !== null) {
    for (const { day, counts } of report.days) {
      state.pending[day] = counts;
    }
  }
  return state;
}

function pendingDays(pending: unknown): unknown[] {
  if (typeof pending !== 'object' || pending === null || Array.isArray(pending)) {
    return [];
  }
  return Object.entries(pending).map(([day, counts]) => ({ day, counts }));
}

/** The most days one report may carry: the whole window plus a day of clock skew on each side. */
export const USAGE_REPORT_MAX_DAYS = USAGE_MAX_AGE_DAYS + 2;

/**
 * A report as the server accepts it, or null when `body` is not a report at all. Within a
 * well-formed report, unknown events and non-positive counts are dropped, counts are cut to
 * the daily cap, repeated days are merged, and, when `today` is given, days outside
 * `[today - USAGE_MAX_AGE_DAYS, today + 1]` are dropped (a device clock may run a day ahead).
 */
export function parseUsageReport(body: unknown, today?: string): UsageReport | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const days = (body as Record<string, unknown>)['days'];
  if (!Array.isArray(days) || days.length > USAGE_REPORT_MAX_DAYS) {
    return null;
  }
  const merged = new Map<string, UsageCounts>();
  for (const entry of days) {
    if (typeof entry !== 'object' || entry === null) {
      return null;
    }
    const { day, counts } = entry as Record<string, unknown>;
    if (
      typeof day !== 'string' ||
      !DAY.test(day) ||
      typeof counts !== 'object' ||
      counts === null
    ) {
      return null;
    }
    if (
      today !== undefined &&
      (day < shiftDay(today, -USAGE_MAX_AGE_DAYS) || day > shiftDay(today, 1))
    ) {
      continue;
    }
    const kept = merged.get(day) ?? {};
    for (const [event, value] of Object.entries(counts)) {
      if (
        !isUsageEvent(event) ||
        typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value <= 0
      ) {
        continue;
      }
      kept[event] = Math.min((kept[event] ?? 0) + value, USAGE_DAILY_CAPS[event]);
    }
    if (Object.keys(kept).length > 0) {
      merged.set(day, kept);
    }
  }
  return { days: [...merged].map(([day, counts]) => ({ day, counts })) };
}

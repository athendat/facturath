import { DOCUMENT, DestroyRef, InjectionToken, Service, inject, signal } from '@angular/core';
import { formatLocalIsoDate } from '../domain/dates';
import {
  createUsageState,
  pendingReport,
  recordInvoice,
  recordOpen,
  recordSave,
  usageStateFrom,
  withReportRestored,
  withoutReported,
  withoutStaleDays,
  type UsageReport,
  type UsageState,
} from '../domain/usage';

export const USAGE_KEY = 'facturath.usage';
export const USAGE_ENDPOINT = '/api/usage';

/**
 * How a report went: `sent` when the server took it, `rejected` when it refused it for good
 * (the counts are dropped so a bad report is never retried forever), `failed` when it may
 * work later (offline, server error, rate limit).
 */
export type UsageSendResult = 'sent' | 'rejected' | 'failed';

export type UsageTransport = (report: UsageReport) => Promise<UsageSendResult>;

/** Posts a report to the app's own origin. Replaced by a fake in tests. */
export const USAGE_TRANSPORT = new InjectionToken<UsageTransport>('USAGE_TRANSPORT', {
  providedIn: 'root',
  factory: () => {
    const view = inject(DOCUMENT).defaultView;
    return async (report) => {
      if (view === null) {
        return 'failed';
      }
      try {
        const response = await view.fetch(USAGE_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(report),
          credentials: 'omit',
          keepalive: true,
        });
        if (response.ok) {
          return 'sent';
        }
        return response.status >= 400 && response.status < 500 && response.status !== 429
          ? 'rejected'
          : 'failed';
      } catch {
        return 'failed';
      }
    };
  },
});

/** The current time. Replaced in tests. */
export const USAGE_CLOCK = new InjectionToken<() => Date>('USAGE_CLOCK', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

/** Where the currently open invoice's id comes from; `core` cannot reach the editor itself. */
export interface UsageContext {
  currentInvoiceId: () => string;
}

/**
 * Anonymous usage counters (#76). Counts app opens, issued invoices and saves on this device,
 * keeps the counts in localStorage until the server takes them, and sends only day totals:
 * no id, no invoice data, no cookie. The rules live in `domain/usage.ts`.
 *
 * Browser only: `start` runs after hydration. Nothing is counted when the user turned the
 * setting off, when the browser sends Global Privacy Control and the user never turned it on,
 * or when localStorage is blocked (every session would count as a new install).
 */
@Service()
export class UsageStats {
  private readonly document = inject(DOCUMENT);
  private readonly transport = inject(USAGE_TRANSPORT);
  private readonly now = inject(USAGE_CLOCK);
  /** Takes the window listeners away with the app. */
  private readonly listeners = new AbortController();

  private readonly enabledState = signal(true);
  /** Whether counting is on, as the settings panel shows it. */
  readonly enabled = this.enabledState.asReadonly();

  private state: UsageState = createUsageState();
  /** The user's own choice; null until they touch the setting. */
  private choice: boolean | null = null;
  private storage: Storage | null = null;
  private context: UsageContext | null = null;
  private sending: Promise<void> | null = null;
  /** Something was counted while a report was on its way: send again once it lands. */
  private sendAgain = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.listeners.abort());
  }

  /** Reads the stored counts, counts this open, and sends what is pending. */
  start(context: UsageContext): void {
    const view = this.document.defaultView;
    if (view === null || this.context !== null) {
      return;
    }
    this.context = context;
    this.storage = this.openStorage(view);
    const stored = this.read();
    this.choice = typeof stored?.['enabled'] === 'boolean' ? stored['enabled'] : null;
    this.state = stored === null ? createUsageState() : usageStateFrom(stored);
    this.enabledState.set(
      this.storage !== null && (this.choice ?? !sendsGlobalPrivacyControl(view)),
    );

    const options = { signal: this.listeners.signal };
    view.addEventListener(
      'beforeprint',
      () => this.invoiceIssued(context.currentInvoiceId()),
      options,
    );
    view.addEventListener('online', () => void this.flush(), options);

    this.record((state, day) => recordOpen(state, day));
  }

  /** Turns counting on or off for this browser; off also forgets what was not sent yet. */
  setEnabled(enabled: boolean): void {
    this.choice = enabled;
    this.enabledState.set(enabled && this.storage !== null);
    if (!enabled) {
      this.state = { ...this.state, pending: {} };
    }
    this.write();
  }

  /** The open invoice was printed or saved as PDF. Counts once per invoice id. */
  invoiceIssued(invoiceId: string): void {
    this.record((state, day) => recordInvoice(state, day, invoiceId));
  }

  /** An invoice was saved into history. */
  invoiceSaved(): void {
    this.record((state, day) => recordSave(state, day));
  }

  /** Sends the pending counts; one report at a time. Never rejects. */
  flush(): Promise<void> {
    if (this.sending !== null) {
      this.sendAgain = true;
      return this.sending;
    }
    this.sending = this.send().finally(() => {
      this.sending = null;
      if (this.sendAgain) {
        this.sendAgain = false;
        void this.flush();
      }
    });
    return this.sending;
  }

  private record(change: (state: UsageState, day: string) => UsageState): void {
    if (this.context === null || !this.enabledState()) {
      return;
    }
    const today = formatLocalIsoDate(this.now());
    this.state = withoutStaleDays(change(this.state, today), today);
    this.write();
    void this.flush();
  }

  private async send(): Promise<void> {
    const report = pendingReport(this.state);
    if (report === null || !this.enabledState()) {
      return;
    }
    // At most once: the counts leave the pending list before the report goes out and come back
    // only if it failed. A page closed or reloaded while the report is on its way would
    // otherwise send it again from storage and count it twice.
    this.state = withoutReported(this.state, report);
    this.write();
    // Turned off while the report was on its way: what it carried is forgotten, not restored.
    if ((await this.transport(report)) === 'failed' && this.enabledState()) {
      this.state = withReportRestored(this.state, report);
      this.write();
    }
  }

  private read(): Record<string, unknown> | null {
    try {
      const raw = this.storage?.getItem(USAGE_KEY) ?? null;
      const parsed: unknown = raw === null ? null : JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private write(): void {
    const stored = this.choice === null ? this.state : { ...this.state, enabled: this.choice };
    try {
      this.storage?.setItem(USAGE_KEY, JSON.stringify(stored));
    } catch {
      // Quota or a revoked permission: the counts live on in memory for this session.
    }
  }

  /** The window's localStorage, or null when the browser refuses it. Reading it can throw. */
  private openStorage(view: Window): Storage | null {
    try {
      return view.localStorage ?? null;
    } catch {
      return null;
    }
  }
}

/** Global Privacy Control (https://globalprivacycontrol.org): the browser asks sites not to share data. */
function sendsGlobalPrivacyControl(view: Window): boolean {
  return (
    (view.navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

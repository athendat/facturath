import { Service, effect, inject } from '@angular/core';
import { SettingsStore } from '../../core/settings-store';
import { INVOICE_REPOSITORY } from '../../core/storage/ports';
import { QUOTA_FULL_MESSAGE, isQuotaExceeded } from '../../core/storage/quota';
import { ToastService } from '../../core/toast';
import type { Invoice } from '../../domain/invoice';
import { InvoiceStore } from './invoice-store';

/** Milliseconds of quiet after the last change before the draft is written. */
export const DRAFT_DELAY_MS = 500;

/**
 * Keeps the open invoice in the repository's single draft slot so closing the tab
 * mid-invoice loses nothing, and opens the draft again at startup. Nothing is written
 * until `start` runs, so the prerender never touches storage.
 */
@Service()
export class DraftAutosave {
  private readonly store = inject(InvoiceStore);
  private readonly settings = inject(SettingsStore);
  private readonly repository = inject(INVOICE_REPOSITORY);
  private readonly toasts = inject(ToastService);
  private watching = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private quotaReported = false;

  constructor() {
    // Every change of the open invoice restarts the timer, so rapid typing ends in one
    // write after the pause. `watching` is a plain field on purpose: the first run (during
    // prerender or before `start`) must only subscribe to the invoice, never schedule.
    effect(() => {
      const invoice = this.store.invoice();
      if (!this.watching) {
        return;
      }
      this.cancelPending();
      this.timer = setTimeout(() => {
        this.timer = null;
        void this.write(invoice);
      }, DRAFT_DELAY_MS);
    });
  }

  /**
   * Opens the invoice the editor shows at startup; browser only, after hydration. The
   * profile loads first, then the draft slot is read: a draft replaces the open invoice;
   * without one the open invoice becomes a new invoice from the profile, dated `today`
   * and numbered by `nextNumber` (the caller has the saved invoices loaded by then).
   * From then on every change is autosaved.
   *
   * Known gap #37: text typed before hydration completes is lost. What the user typed
   * after it, while the draft was still being read, wins instead: an edited invoice is
   * never replaced, neither by the draft nor by a new invoice; it is dated, filled from
   * the profile and numbered like a new one, so saving it cannot overwrite a saved invoice.
   */
  async start(today: Date, nextNumber: (series: string) => string): Promise<void> {
    this.store.setIssueDateIfEmpty(today);
    this.store.applyProfile(await this.settings.load());
    const draft = await this.readDraft();
    if (this.store.edited()) {
      this.store.setField('number', nextNumber(this.store.invoice().series));
    } else if (draft !== null) {
      this.store.load(draft);
    } else {
      this.store.startNew(nextNumber(this.store.invoice().series));
    }
    this.watching = true;
  }

  /**
   * Writes the open invoice to the draft slot right away, dropping any pending debounced
   * write: what a save into history and Nueva do, so the slot never lags behind them.
   */
  writeNow(): Promise<void> {
    this.cancelPending();
    return this.write(this.store.invoice());
  }

  /** A draft that cannot be read counts as no draft. */
  private async readDraft(): Promise<Invoice | null> {
    try {
      return await this.repository.getDraft();
    } catch {
      return null;
    }
  }

  /**
   * A draft write that fails is swallowed: it would otherwise toast on every pause of
   * typing. A full quota is the one failure the user can act on, so it shows once per
   * session, with the same message the save into history uses.
   */
  private async write(invoice: Invoice): Promise<void> {
    try {
      await this.repository.saveDraft(invoice);
    } catch (error) {
      if (isQuotaExceeded(error) && !this.quotaReported) {
        this.quotaReported = true;
        this.toasts.show(QUOTA_FULL_MESSAGE);
      }
    }
  }

  private cancelPending(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

import { Service, effect, inject } from '@angular/core';
import { SettingsStore } from '../../core/settings-store';
import { INVOICE_REPOSITORY } from '../../core/storage/ports';
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
  private watching = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

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
   */
  async start(today: Date, nextNumber: (series: string) => string): Promise<void> {
    this.store.setIssueDateIfEmpty(today);
    this.store.applyProfile(await this.settings.load());
    const draft = await this.readDraft();
    if (draft !== null) {
      this.store.load(draft);
    } else {
      this.store.startNew(nextNumber(this.store.invoice().series));
    }
    this.watching = true;
  }

  /** A draft that cannot be read counts as no draft. */
  private async readDraft(): Promise<Invoice | null> {
    try {
      return await this.repository.getDraft();
    } catch {
      return null;
    }
  }

  private async write(invoice: Invoice): Promise<void> {
    await this.repository.saveDraft(invoice);
  }

  private cancelPending(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

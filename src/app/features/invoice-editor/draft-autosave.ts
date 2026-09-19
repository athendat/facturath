import { Service, inject } from '@angular/core';
import { SettingsStore } from '../../core/settings-store';
import { INVOICE_REPOSITORY } from '../../core/storage/ports';
import type { Invoice } from '../../domain/invoice';
import { InvoiceStore } from './invoice-store';

/**
 * Keeps the open invoice in the repository's single draft slot so closing the tab
 * mid-invoice loses nothing, and opens the draft again at startup.
 */
@Service()
export class DraftAutosave {
  private readonly store = inject(InvoiceStore);
  private readonly settings = inject(SettingsStore);
  private readonly repository = inject(INVOICE_REPOSITORY);

  /**
   * Opens the invoice the editor shows at startup; browser only, after hydration. The
   * profile loads first, then the draft slot is read: a draft replaces the open invoice.
   */
  async start(today: Date, nextNumber: (series: string) => string): Promise<void> {
    this.store.setIssueDateIfEmpty(today);
    this.store.applyProfile(await this.settings.load());
    const draft = await this.readDraft();
    if (draft !== null) {
      this.store.load(draft);
    }
  }

  /** A draft that cannot be read counts as no draft. */
  private async readDraft(): Promise<Invoice | null> {
    try {
      return await this.repository.getDraft();
    } catch {
      return null;
    }
  }
}

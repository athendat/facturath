import { Service, computed, inject, signal } from '@angular/core';
import { INVOICE_REPOSITORY, type InvoiceSummary } from '../../core/storage/ports';
import { ToastService } from '../../core/toast';
import type { Invoice } from '../../domain/invoice';
import { nextNumber } from '../../domain/numbering';

export const QUOTA_FULL_MESSAGE = 'No hay espacio para guardar. Exporta y elimina facturas antiguas.';
export const SAVE_FAILED_MESSAGE = 'No se pudo guardar la factura.';

/** IndexedDB rejects with this DOMException when the origin has run out of storage. */
function isQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
}

/** The saved invoices as the drawer lists them; persistence goes through the repository port. */
@Service()
export class SavedInvoicesStore {
  private readonly repository = inject(INVOICE_REPOSITORY);
  private readonly toasts = inject(ToastService);
  private readonly state = signal<InvoiceSummary[]>([]);

  /** Newest first, as the repository orders them. */
  readonly summaries = this.state.asReadonly();

  readonly count = computed(() => this.state().length);

  /** The number a new invoice in `series` gets; see `nextNumber` in the domain. */
  nextNumber(series: string): string {
    return nextNumber(this.state(), series);
  }

  /** Reads the saved invoices; browser only, after hydration. */
  async load(): Promise<void> {
    this.state.set(await this.repository.listSummaries());
  }

  /** Stores the invoice and confirms with its reference; a failure is reported the same way. */
  async save(invoice: Invoice): Promise<void> {
    try {
      await this.repository.save(invoice);
    } catch (error) {
      this.toasts.show(isQuotaExceeded(error) ? QUOTA_FULL_MESSAGE : SAVE_FAILED_MESSAGE);
      return;
    }
    await this.load();
    this.toasts.show(`Factura ${invoice.series}-${invoice.number} guardada.`);
  }

  get(id: string): Promise<Invoice | null> {
    return this.repository.get(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
    await this.load();
  }
}

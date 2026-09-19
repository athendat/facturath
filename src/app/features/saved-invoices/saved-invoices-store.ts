import { Service, computed, inject, signal } from '@angular/core';
import { INVOICE_REPOSITORY, type InvoiceSummary } from '../../core/storage/ports';
import { QUOTA_FULL_MESSAGE, isQuotaExceeded } from '../../core/storage/quota';
import { ToastService } from '../../core/toast';
import { formatReference } from '../../domain/format';
import type { Invoice } from '../../domain/invoice';
import { nextNumber } from '../../domain/numbering';

export const SAVE_FAILED_MESSAGE = 'No se pudo guardar la factura.';
export const DELETE_FAILED_MESSAGE = 'No se pudo eliminar la factura.';
export const LOAD_FAILED_MESSAGE = 'No se pudieron leer las facturas guardadas.';

/**
 * The saved invoices as the drawer lists them; persistence goes through the repository
 * port. Every write reports its failure as a toast and resolves, so the click handlers
 * that call these methods never leave a rejected promise behind.
 */
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
    try {
      this.state.set(await this.repository.listSummaries());
    } catch {
      this.toasts.show(LOAD_FAILED_MESSAGE);
    }
  }

  /** Stores the invoice and confirms with its reference. */
  async save(invoice: Invoice): Promise<void> {
    try {
      await this.repository.save(invoice);
    } catch (error) {
      this.toasts.show(isQuotaExceeded(error) ? QUOTA_FULL_MESSAGE : SAVE_FAILED_MESSAGE);
      return;
    }
    await this.load();
    this.toasts.show(`Factura ${formatReference(invoice.series, invoice.number)} guardada.`);
  }

  get(id: string): Promise<Invoice | null> {
    return this.repository.get(id);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
    } catch {
      this.toasts.show(DELETE_FAILED_MESSAGE);
      return;
    }
    await this.load();
  }
}

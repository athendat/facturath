import type { Invoice } from '../../domain/invoice';
import type { InvoiceRepository, InvoiceSummary } from './ports';
import { newestFirst, summarize } from './summaries';

/** Holds invoices for the session only: the test fake and the fallback when IndexedDB is unavailable. */
export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly invoices = new Map<string, Invoice>();
  private draft: Invoice | null = null;

  listSummaries(): Promise<InvoiceSummary[]> {
    return Promise.resolve(newestFirst(Array.from(this.invoices.values(), summarize)));
  }

  get(id: string): Promise<Invoice | null> {
    return Promise.resolve(this.invoices.get(id) ?? null);
  }

  save(invoice: Invoice): Promise<Invoice> {
    for (const existing of this.invoices.values()) {
      if (
        existing.id !== invoice.id &&
        existing.series === invoice.series &&
        existing.number === invoice.number
      ) {
        this.invoices.delete(existing.id);
      }
    }
    this.invoices.set(invoice.id, invoice);
    return Promise.resolve(invoice);
  }

  delete(id: string): Promise<void> {
    this.invoices.delete(id);
    return Promise.resolve();
  }

  getDraft(): Promise<Invoice | null> {
    return Promise.resolve(this.draft);
  }

  saveDraft(invoice: Invoice): Promise<void> {
    this.draft = invoice;
    return Promise.resolve();
  }
}

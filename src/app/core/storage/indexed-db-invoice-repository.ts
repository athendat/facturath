import { Service, inject } from '@angular/core';
import type { Invoice } from '../../domain/invoice';
import { InMemoryInvoiceRepository } from './in-memory-invoice-repository';
import { requestToPromise, transactionDone } from './indexed-db';
import {
  DRAFT_KEY,
  DRAFT_STORE,
  INVOICES_STORE,
  IndexedDbConnection,
  SERIES_NUMBER_INDEX,
} from './indexed-db-connection';
import { newestFirst, summarize } from './invoice-summaries';
import type { InvoiceRepository, InvoiceSummary } from './ports';

/**
 * Saved invoices and the draft in IndexedDB. Delegates to the open database,
 * or to the in-memory twin for the session when it could not be opened.
 */
@Service()
export class IndexedDbInvoiceRepository implements InvoiceRepository {
  private readonly connection = inject(IndexedDbConnection);
  private readonly backend: Promise<InvoiceRepository> = this.connection
    .open()
    .then((database) =>
      database ? new DatabaseInvoiceRepository(database) : new InMemoryInvoiceRepository(),
    );

  async listSummaries(): Promise<InvoiceSummary[]> {
    return (await this.backend).listSummaries();
  }

  async get(id: string): Promise<Invoice | null> {
    return (await this.backend).get(id);
  }

  async save(invoice: Invoice): Promise<Invoice> {
    return (await this.backend).save(invoice);
  }

  async delete(id: string): Promise<void> {
    return (await this.backend).delete(id);
  }

  async getDraft(): Promise<Invoice | null> {
    return (await this.backend).getDraft();
  }

  async saveDraft(invoice: Invoice): Promise<void> {
    return (await this.backend).saveDraft(invoice);
  }
}

/** The repository over an open database. */
class DatabaseInvoiceRepository implements InvoiceRepository {
  constructor(private readonly database: IDBDatabase) {}

  async listSummaries(): Promise<InvoiceSummary[]> {
    const invoices = await requestToPromise<Invoice[]>(
      this.database.transaction(INVOICES_STORE).objectStore(INVOICES_STORE).getAll(),
    );
    return newestFirst(invoices.map(summarize));
  }

  async get(id: string): Promise<Invoice | null> {
    const found = await requestToPromise<Invoice | undefined>(
      this.database.transaction(INVOICES_STORE).objectStore(INVOICES_STORE).get(id),
    );
    return found ?? null;
  }

  async save(invoice: Invoice): Promise<Invoice> {
    const transaction = this.database.transaction(INVOICES_STORE, 'readwrite');
    const store = transaction.objectStore(INVOICES_STORE);
    const sameNumber = await requestToPromise<Invoice | undefined>(
      store.index(SERIES_NUMBER_INDEX).get([invoice.series, invoice.number]),
    );
    if (sameNumber && sameNumber.id !== invoice.id) {
      store.delete(sameNumber.id);
    }
    store.put(invoice);
    const stored = await requestToPromise<Invoice>(store.get(invoice.id));
    await transactionDone(transaction);
    return stored;
  }

  async delete(id: string): Promise<void> {
    const transaction = this.database.transaction(INVOICES_STORE, 'readwrite');
    transaction.objectStore(INVOICES_STORE).delete(id);
    await transactionDone(transaction);
  }

  async getDraft(): Promise<Invoice | null> {
    const found = await requestToPromise<Invoice | undefined>(
      this.database.transaction(DRAFT_STORE).objectStore(DRAFT_STORE).get(DRAFT_KEY),
    );
    return found ?? null;
  }

  async saveDraft(invoice: Invoice): Promise<void> {
    const transaction = this.database.transaction(DRAFT_STORE, 'readwrite');
    transaction.objectStore(DRAFT_STORE).put(invoice, DRAFT_KEY);
    await transactionDone(transaction);
  }
}

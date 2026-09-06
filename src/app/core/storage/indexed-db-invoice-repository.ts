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
import type { InvoiceRepository, InvoiceSummary } from './ports';
import { newestFirst, summarize } from './summaries';

/**
 * Saved invoices and the draft in IndexedDB. Every method falls back to the
 * in-memory twin when the connection could not be opened.
 */
@Service()
export class IndexedDbInvoiceRepository implements InvoiceRepository {
  private readonly connection = inject(IndexedDbConnection);
  private readonly memory = new InMemoryInvoiceRepository();

  async listSummaries(): Promise<InvoiceSummary[]> {
    const database = await this.connection.database();
    if (!database) {
      return this.memory.listSummaries();
    }
    const invoices = await requestToPromise<Invoice[]>(
      database.transaction(INVOICES_STORE).objectStore(INVOICES_STORE).getAll(),
    );
    return newestFirst(invoices.map(summarize));
  }

  async get(id: string): Promise<Invoice | null> {
    const database = await this.connection.database();
    if (!database) {
      return this.memory.get(id);
    }
    const found = await requestToPromise<Invoice | undefined>(
      database.transaction(INVOICES_STORE).objectStore(INVOICES_STORE).get(id),
    );
    return found ?? null;
  }

  async save(invoice: Invoice): Promise<Invoice> {
    const database = await this.connection.database();
    if (!database) {
      return this.memory.save(invoice);
    }
    const transaction = database.transaction(INVOICES_STORE, 'readwrite');
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
    const database = await this.connection.database();
    if (!database) {
      return this.memory.delete(id);
    }
    const transaction = database.transaction(INVOICES_STORE, 'readwrite');
    transaction.objectStore(INVOICES_STORE).delete(id);
    await transactionDone(transaction);
  }

  async getDraft(): Promise<Invoice | null> {
    const database = await this.connection.database();
    if (!database) {
      return this.memory.getDraft();
    }
    const found = await requestToPromise<Invoice | undefined>(
      database.transaction(DRAFT_STORE).objectStore(DRAFT_STORE).get(DRAFT_KEY),
    );
    return found ?? null;
  }

  async saveDraft(invoice: Invoice): Promise<void> {
    const database = await this.connection.database();
    if (!database) {
      return this.memory.saveDraft(invoice);
    }
    const transaction = database.transaction(DRAFT_STORE, 'readwrite');
    transaction.objectStore(DRAFT_STORE).put(invoice, DRAFT_KEY);
    await transactionDone(transaction);
  }
}

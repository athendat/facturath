import { DOCUMENT, InjectionToken, Service, inject } from '@angular/core';
import { openDatabase } from './indexed-db';
import { StorageStatus } from './storage-status';

export const DATABASE_NAME = 'facturath';
export const DATABASE_VERSION = 1;

/** Saved invoices, keyed by id, with a unique index on series plus number. */
export const INVOICES_STORE = 'invoices';
export const SERIES_NUMBER_INDEX = 'seriesNumber';
/** Images, keyed by asset id. */
export const ASSETS_STORE = 'assets';
/**
 * The single autosaved draft, under a fixed key. A store of its own keeps
 * the draft out of the saved list and away from the series+number index.
 */
export const DRAFT_STORE = 'draft';
export const DRAFT_KEY = 'current';

/**
 * Where the IndexedDB factory comes from. Read lazily, in the browser, after
 * hydration; tests bind a fake factory or none at all.
 */
export const INDEXED_DB_FACTORY = new InjectionToken<() => IDBFactory | undefined>(
  'INDEXED_DB_FACTORY',
  {
    providedIn: 'root',
    factory: () => {
      const document = inject(DOCUMENT);
      return () => document.defaultView?.indexedDB;
    },
  },
);

/**
 * One lazily opened database shared by the IndexedDB adapters. When the
 * browser has no IndexedDB or refuses to open it (private mode in some
 * browsers), it flags the status and resolves to null for the whole
 * session, and the adapters work from memory.
 */
@Service()
export class IndexedDbConnection {
  private readonly factory = inject(INDEXED_DB_FACTORY);
  private readonly status = inject(StorageStatus);
  private opening: Promise<IDBDatabase | null> | null = null;

  database(): Promise<IDBDatabase | null> {
    this.opening ??= this.open();
    return this.opening;
  }

  private async open(): Promise<IDBDatabase | null> {
    const factory = this.factory();
    if (!factory) {
      this.status.disable('indexeddb-missing');
      return null;
    }
    try {
      return await openDatabase(factory, DATABASE_NAME, DATABASE_VERSION, createStores);
    } catch {
      this.status.disable('indexeddb-open-failed');
      return null;
    }
  }
}

function createStores(database: IDBDatabase): void {
  const invoices = database.createObjectStore(INVOICES_STORE, { keyPath: 'id' });
  invoices.createIndex(SERIES_NUMBER_INDEX, ['series', 'number'], { unique: true });
  database.createObjectStore(ASSETS_STORE, { keyPath: 'id' });
  database.createObjectStore(DRAFT_STORE);
}

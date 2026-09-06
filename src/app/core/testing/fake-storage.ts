import type { Provider } from '@angular/core';
import { IDBFactory } from 'fake-indexeddb';
import { INDEXED_DB_FACTORY } from '../storage/indexed-db-connection';

/**
 * Binds a fake IndexedDB for the adapters to open: a fresh database per test
 * by default, or a shared factory to test persistence across connections.
 */
export function provideFakeIndexedDb(factory = new IDBFactory()): Provider {
  return { provide: INDEXED_DB_FACTORY, useValue: () => factory };
}

/** Stands in for a browser without IndexedDB. */
export function provideNoIndexedDb(): Provider {
  return { provide: INDEXED_DB_FACTORY, useValue: () => undefined };
}

/** Binds a factory of your own, e.g. one whose `open` throws or fails. */
export function provideIndexedDbFactory(factory: IDBFactory): Provider {
  return { provide: INDEXED_DB_FACTORY, useValue: () => factory };
}

/** A document whose window refuses access to localStorage, as a blocked or private browser does. */
export const blockedDocument = {
  defaultView: {
    get localStorage(): Storage {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    },
  },
};

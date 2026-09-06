import { isPlatformBrowser } from '@angular/common';
import {
  PLATFORM_ID,
  afterNextRender,
  inject,
  makeEnvironmentProviders,
  provideEnvironmentInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { InMemoryAssetStore } from './in-memory-asset-store';
import { InMemoryInvoiceRepository } from './in-memory-invoice-repository';
import { InMemoryPreferencesStore } from './in-memory-preferences-store';
import { IndexedDbAssetStore } from './indexed-db-asset-store';
import { IndexedDbConnection } from './indexed-db-connection';
import { IndexedDbInvoiceRepository } from './indexed-db-invoice-repository';
import { LocalStoragePreferencesStore } from './local-storage-preferences-store';
import { ASSET_STORE, INVOICE_REPOSITORY, PREFERENCES_STORE } from './ports';

/**
 * Binds the storage ports: IndexedDB and localStorage in the browser, memory
 * during prerender. In the browser it also opens the database right after
 * hydration, so a browser that cannot save is reported at startup rather
 * than on the first save.
 */
export function provideStorage(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: INVOICE_REPOSITORY,
      useFactory: () =>
        inBrowser() ? inject(IndexedDbInvoiceRepository) : new InMemoryInvoiceRepository(),
    },
    {
      provide: ASSET_STORE,
      useFactory: () => (inBrowser() ? inject(IndexedDbAssetStore) : new InMemoryAssetStore()),
    },
    {
      provide: PREFERENCES_STORE,
      useFactory: () =>
        inBrowser() ? inject(LocalStoragePreferencesStore) : new InMemoryPreferencesStore(),
    },
    provideEnvironmentInitializer(() => {
      if (inBrowser()) {
        const connection = inject(IndexedDbConnection);
        afterNextRender(() => void connection.database());
      }
    }),
  ]);
}

function inBrowser(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}

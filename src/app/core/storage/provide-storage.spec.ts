import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InMemoryAssetStore } from './in-memory-asset-store';
import { InMemoryInvoiceRepository } from './in-memory-invoice-repository';
import { InMemoryPreferencesStore } from './in-memory-preferences-store';
import { IndexedDbAssetStore } from './indexed-db-asset-store';
import { IndexedDbInvoiceRepository } from './indexed-db-invoice-repository';
import { LocalStoragePreferencesStore } from './local-storage-preferences-store';
import { ASSET_STORE, INVOICE_REPOSITORY, PREFERENCES_STORE } from './ports';
import { provideStorage } from './provide-storage';

describe('provideStorage', () => {
  it('binds the in-memory adapters when prerendering on the server', () => {
    TestBed.configureTestingModule({
      providers: [provideStorage(), { provide: PLATFORM_ID, useValue: 'server' }],
    });

    expect(TestBed.inject(INVOICE_REPOSITORY)).toBeInstanceOf(InMemoryInvoiceRepository);
    expect(TestBed.inject(ASSET_STORE)).toBeInstanceOf(InMemoryAssetStore);
    expect(TestBed.inject(PREFERENCES_STORE)).toBeInstanceOf(InMemoryPreferencesStore);
  });

  it('binds the IndexedDB and localStorage adapters in the browser', () => {
    TestBed.configureTestingModule({ providers: [provideStorage()] });

    expect(TestBed.inject(INVOICE_REPOSITORY)).toBeInstanceOf(IndexedDbInvoiceRepository);
    expect(TestBed.inject(ASSET_STORE)).toBeInstanceOf(IndexedDbAssetStore);
    expect(TestBed.inject(PREFERENCES_STORE)).toBeInstanceOf(LocalStoragePreferencesStore);
  });

  it('binds the in-memory adapters when nothing provides storage', () => {
    expect(TestBed.inject(INVOICE_REPOSITORY)).toBeInstanceOf(InMemoryInvoiceRepository);
    expect(TestBed.inject(ASSET_STORE)).toBeInstanceOf(InMemoryAssetStore);
    expect(TestBed.inject(PREFERENCES_STORE)).toBeInstanceOf(InMemoryPreferencesStore);
  });
});

import { InjectionToken } from '@angular/core';
import type { Currency, Invoice } from '../../domain/invoice';
import type { SellerProfile } from '../../domain/seller-profile';
import { InMemoryPreferencesStore } from './in-memory-preferences-store';

/**
 * Storage ports. Features depend on these interfaces through the injection
 * tokens below and never on an adapter. `provideStorage()` binds the browser
 * adapters; without it (prerender, TestBed) every token resolves to its
 * in-memory twin, which is also the fallback when the browser blocks storage.
 */

/** What the saved invoices list needs without loading whole invoices. */
export interface InvoiceSummary {
  id: string;
  series: string;
  number: string;
  issueDate: string;
  buyerName: string;
  currency: Currency;
  /** Total in integer cents. */
  total: number;
}

export interface InvoiceRepository {
  /** Newest first: by issue date, then by number. */
  listSummaries(): Promise<InvoiceSummary[]>;
  get(id: string): Promise<Invoice | null>;
  /** Stores the invoice; an existing invoice with the same series and number is replaced. */
  save(invoice: Invoice): Promise<Invoice>;
  delete(id: string): Promise<void>;
  /** The single autosaved draft, kept apart from the saved invoices. */
  getDraft(): Promise<Invoice | null>;
  saveDraft(invoice: Invoice): Promise<void>;
}

export interface AssetStore {
  put(id: string, blob: Blob): Promise<void>;
  get(id: string): Promise<Blob | null>;
  delete(id: string): Promise<void>;
}

export interface PreferencesStore {
  loadProfile(): Promise<SellerProfile | null>;
  saveProfile(profile: SellerProfile): Promise<void>;
}

export const PREFERENCES_STORE = new InjectionToken<PreferencesStore>('PREFERENCES_STORE', {
  providedIn: 'root',
  factory: () => new InMemoryPreferencesStore(),
});

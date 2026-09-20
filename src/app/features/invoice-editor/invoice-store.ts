import { Service, computed, effect, inject, signal } from '@angular/core';
import { SettingsStore } from '../../core/settings-store';
import { formatLocalIsoDate } from '../../domain/dates';
import { formatAmount, formatHeaderReference, formatTotals } from '../../domain/format';
import {
  createEmptyLine,
  createFollowingInvoice,
  createInvoice,
  needsExchangeRate,
  type Carrier,
  type Invoice,
  type LineItem,
  type Party,
  type PartyRole,
  type Signatures,
  type Tax,
} from '../../domain/invoice';
import {
  applyAssetIdsToInvoice,
  applyProfileToInvoice,
  isProfileTextField,
  matchesProfile,
  type SellerProfile,
} from '../../domain/seller-profile';
import { computeTotals } from '../../domain/totals';

/** Holds the open invoice and derives everything the editor displays from it. */
@Service()
export class InvoiceStore {
  private readonly settings = inject(SettingsStore);
  // randomUUID exists in Node (prerender) and browsers alike, and the id is never rendered,
  // so it cannot cause a hydration mismatch. This id only lives until the startup settles the
  // open invoice (`DraftAutosave.start`): a restored draft brings its own, a new invoice gets one.
  private readonly state = signal<Invoice>(createInvoice(crypto.randomUUID()));
  private readonly userEdited = signal(false);

  private readonly rawTotals = computed(() => computeTotals(this.state()));

  readonly invoice = this.state.asReadonly();

  /**
   * Whether the user changed the open invoice since it was opened (`load`, `startNew`).
   * Filling it from the profile or dating it does not count; only the editing methods do.
   */
  readonly edited = this.userEdited.asReadonly();

  constructor() {
    // The seller data and the images belong to the profile and show on every invoice, so the
    // open invoice follows the profile: the images store writes the asset ids there and the
    // settings panel the text fields (#12); a seller edit in the document itself reaches the
    // profile through `updateParty` and comes back unchanged. Only the profile is tracked here
    // (`update` reads the invoice untracked), so replacing the invoice through `load` does not
    // re-run it and a saved invoice keeps its own seller and images until the profile changes
    // again (#10).
    effect(() => {
      const profile = this.settings.profile();
      this.state.update((invoice) =>
        matchesProfile(invoice, profile) ? invoice : applyProfileToInvoice(invoice, profile),
      );
    });
  }

  /** Formatted amount of each line, in the same order as `invoice().lines`. */
  readonly lineAmounts = computed(() => this.rawTotals().lineAmounts.map(formatAmount));

  readonly totals = computed(() => formatTotals(this.rawTotals(), this.state().currency));

  /** Whether the exchange rate field is shown. */
  readonly needsExchangeRate = computed(() => needsExchangeRate(this.state().currency));

  /** Whether the CUP equivalent line is shown: a non-CUP currency with a positive rate typed. */
  readonly showsCupEquivalent = computed(() => this.rawTotals().cupEquivalent !== null);

  /** `A-0001 · 1,234.50 CUP`, shown next to the wordmark. */
  readonly headerReference = computed(() => {
    const { series, number, currency } = this.state();
    return formatHeaderReference(series, number, this.rawTotals().total, currency);
  });

  setField<K extends keyof Invoice>(field: K, value: Invoice[K]): void {
    this.state.update((invoice) => ({ ...invoice, [field]: value }));
    this.userEdited.set(true);
  }

  /**
   * Dates an undated invoice with the local calendar day of `date`. Callers pass `new Date()`
   * from a browser-only hook so the prerendered document stays undated and hydration matches.
   */
  setIssueDateIfEmpty(date: Date): void {
    this.state.update((invoice) =>
      invoice.issueDate === '' ? { ...invoice, issueDate: formatLocalIsoDate(date) } : invoice,
    );
  }

  /**
   * Opens a saved invoice as it was stored, its own images included: the profile's images
   * replace them only when the profile changes afterwards (see the effect above).
   */
  load(invoice: Invoice): void {
    this.state.set(invoice);
    this.userEdited.set(false);
  }

  /**
   * Starts the next invoice, numbered `number`: the seller block, series, date, currency and
   * exchange rate, tax and terms carry over, the images come from the profile, the rest clears.
   */
  startNew(number: string): void {
    this.state.update((invoice) =>
      applyAssetIdsToInvoice(
        createFollowingInvoice(invoice, crypto.randomUUID(), number),
        this.settings.profile(),
      ),
    );
    this.userEdited.set(false);
  }

  /** Seller edits are also remembered in the profile; buyer data never leaves the invoice. */
  updateParty(role: PartyRole, field: keyof Party, value: string): void {
    this.patchSection(role, field, value);
    if (role === 'seller' && isProfileTextField(field)) {
      this.settings.updateProfile(field, value);
    }
  }

  /**
   * Copies the remembered seller data into the open invoice, e.g. once the profile has loaded.
   * It copies the asset ids too, which the effect above already mirrors: the effect keeps them
   * in sync afterwards, while this call also brings in the text fields, which never sync back.
   */
  applyProfile(profile: SellerProfile): void {
    this.state.update((invoice) => applyProfileToInvoice(invoice, profile));
  }

  updateCarrier(field: keyof Carrier, value: string): void {
    this.patchSection('carrier', field, value);
  }

  updateSignature(field: keyof Signatures, value: string): void {
    this.patchSection('signatures', field, value);
  }

  updateTax(field: keyof Tax, value: string): void {
    this.patchSection('tax', field, value);
  }

  /** Replaces one string field inside a nested section of the invoice, immutably. */
  private patchSection<K extends PartyRole | 'carrier' | 'signatures' | 'tax'>(
    section: K,
    field: keyof Invoice[K],
    value: string,
  ): void {
    this.state.update((invoice) => ({
      ...invoice,
      [section]: { ...invoice[section], [field]: value },
    }));
    this.userEdited.set(true);
  }

  updateLine(index: number, field: keyof LineItem, value: string): void {
    this.state.update((invoice) => ({
      ...invoice,
      lines: invoice.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    }));
    this.userEdited.set(true);
  }

  addLine(): void {
    this.state.update((invoice) => ({ ...invoice, lines: [...invoice.lines, createEmptyLine()] }));
    this.userEdited.set(true);
  }

  /** Removes the line; the last remaining line is reset to empty so the table never becomes empty. */
  removeLine(index: number): void {
    this.state.update((invoice) => {
      const lines = invoice.lines.filter((_, i) => i !== index);
      return { ...invoice, lines: lines.length > 0 ? lines : [createEmptyLine()] };
    });
    this.userEdited.set(true);
  }
}

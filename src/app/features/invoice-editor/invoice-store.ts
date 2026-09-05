import { Service, computed, signal } from '@angular/core';
import { formatLocalIsoDate } from '../../domain/dates';
import { formatAmount, formatHeaderReference, formatTotals } from '../../domain/format';
import {
  createEmptyLine,
  createInvoice,
  needsExchangeRate,
  type Invoice,
  type LineItem,
  type Tax,
} from '../../domain/invoice';
import { computeTotals } from '../../domain/totals';

/** Holds the open invoice and derives everything the editor displays from it. */
@Service()
export class InvoiceStore {
  // randomUUID exists in Node (prerender) and browsers alike, and the id is never rendered,
  // so it cannot cause a hydration mismatch. Draft persistence (a later ticket) owns ids for real.
  private readonly state = signal<Invoice>(createInvoice(crypto.randomUUID()));

  private readonly rawTotals = computed(() => computeTotals(this.state()));

  readonly invoice = this.state.asReadonly();

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

  updateTax(field: keyof Tax, value: string): void {
    this.state.update((invoice) => ({ ...invoice, tax: { ...invoice.tax, [field]: value } }));
  }

  updateLine(index: number, field: keyof LineItem, value: string): void {
    this.state.update((invoice) => ({
      ...invoice,
      lines: invoice.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    }));
  }

  addLine(): void {
    this.state.update((invoice) => ({ ...invoice, lines: [...invoice.lines, createEmptyLine()] }));
  }

  /** Removes the line; the last remaining line is reset to empty so the table never becomes empty. */
  removeLine(index: number): void {
    this.state.update((invoice) => {
      const lines = invoice.lines.filter((_, i) => i !== index);
      return { ...invoice, lines: lines.length > 0 ? lines : [createEmptyLine()] };
    });
  }
}

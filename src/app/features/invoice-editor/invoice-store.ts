import { Injectable, computed, signal } from '@angular/core';
import { formatAmount, formatHeaderReference } from '../../domain/format';
import {
  createEmptyLine,
  createInvoice,
  needsExchangeRate,
  type Invoice,
  type LineItem,
} from '../../domain/invoice';
import { computeTotals } from '../../domain/totals';

/** Totals as the editor displays them: formatted amounts plus the parsed tax percent. */
export interface FormattedTotals {
  subtotal: string;
  discount: string;
  shipping: string;
  taxPercent: number;
  tax: string;
  total: string;
  cupEquivalent: string | null;
}

/** Holds the open invoice and derives everything the editor displays from it. */
@Injectable({ providedIn: 'root' })
export class InvoiceStore {
  private readonly state = signal<Invoice>(createInvoice(crypto.randomUUID()));

  private readonly cents = computed(() => computeTotals(this.state()));

  readonly invoice = this.state.asReadonly();

  /** Formatted amount of each line, in the same order as `invoice().lines`. */
  readonly lineAmounts = computed(() => this.cents().lineAmounts.map(formatAmount));

  readonly totals = computed<FormattedTotals>(() => {
    const totals = this.cents();
    return {
      subtotal: formatAmount(totals.subtotal),
      discount: formatAmount(totals.discount),
      shipping: formatAmount(totals.shipping),
      taxPercent: totals.taxPercent,
      tax: formatAmount(totals.tax),
      total: formatAmount(totals.total),
      cupEquivalent: totals.cupEquivalent === null ? null : formatAmount(totals.cupEquivalent),
    };
  });

  /** Whether the exchange rate field and the CUP equivalent are shown. */
  readonly needsExchangeRate = computed(() => needsExchangeRate(this.state().currency));

  /** `A-0001 · 1,234.50 CUP`, shown next to the wordmark. */
  readonly headerReference = computed(() => {
    const { series, number, currency } = this.state();
    return formatHeaderReference(series, number, this.cents().total, currency);
  });

  setField<K extends keyof Invoice>(field: K, value: Invoice[K]): void {
    this.state.update((invoice) => ({ ...invoice, [field]: value }));
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

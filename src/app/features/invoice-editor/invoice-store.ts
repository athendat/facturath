import { Injectable, computed, signal } from '@angular/core';
import { formatAmount } from '../../domain/format';
import { createInvoice, type Invoice, type LineItem } from '../../domain/invoice';
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

  setField<K extends keyof Invoice>(field: K, value: Invoice[K]): void {
    this.state.update((invoice) => ({ ...invoice, [field]: value }));
  }

  updateLine(index: number, field: keyof LineItem, value: string): void {
    this.state.update((invoice) => ({
      ...invoice,
      lines: invoice.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    }));
  }
}

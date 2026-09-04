import { Injectable, computed, signal } from '@angular/core';
import { formatAmount } from '../../domain/format';
import { createInvoice, type Invoice, type LineItem } from '../../domain/invoice';
import { lineAmountCents } from '../../domain/money';

/** Holds the open invoice and derives everything the editor displays from it. */
@Injectable({ providedIn: 'root' })
export class InvoiceStore {
  private readonly state = signal<Invoice>(createInvoice(crypto.randomUUID()));

  readonly invoice = this.state.asReadonly();

  /** Formatted amount of each line, in the same order as `invoice().lines`. */
  readonly lineAmounts = computed(() =>
    this.state().lines.map((line) => formatAmount(lineAmountCents(line.quantity, line.unitPrice))),
  );

  updateLine(index: number, field: keyof LineItem, value: string): void {
    this.state.update((invoice) => ({
      ...invoice,
      lines: invoice.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    }));
  }
}

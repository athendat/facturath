import type { Currency } from './invoice';
import type { InvoiceTotals } from './totals';

const amountFormat = new Intl.NumberFormat('es-CU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats integer cents as an amount with two decimals in the es-CU locale. */
export function formatAmount(cents: number): string {
  return amountFormat.format(cents / 100);
}

/** Formats integer cents followed by the currency code, e.g. `1,234.50 CUP`. */
export function formatMoney(cents: number, currency: Currency): string {
  return `${formatAmount(cents)} ${currency}`;
}

/** Totals as the document displays them. The total and the CUP equivalent carry their currency. */
export interface FormattedTotals {
  subtotal: string;
  discount: string;
  shipping: string;
  tax: string;
  total: string;
  cupEquivalent: string | null;
}

export function formatTotals(totals: InvoiceTotals, currency: Currency): FormattedTotals {
  return {
    subtotal: formatAmount(totals.subtotal),
    discount: formatAmount(totals.discount),
    shipping: formatAmount(totals.shipping),
    tax: formatAmount(totals.tax),
    total: formatMoney(totals.total, currency),
    cupEquivalent: totals.cupEquivalent === null ? null : formatMoney(totals.cupEquivalent, 'CUP'),
  };
}

/** The reference shown in the app header, e.g. `A-0001 · 1,234.50 CUP`. */
export function formatHeaderReference(
  series: string,
  number: string,
  totalCents: number,
  currency: Currency,
): string {
  return `${series}-${number} · ${formatMoney(totalCents, currency)}`;
}

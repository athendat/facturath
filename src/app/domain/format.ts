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

const dateFormat = new Intl.DateTimeFormat('es-CU');

/**
 * Formats a stored `YYYY-MM-DD` date for es-CU, e.g. `12/9/2026`, reading the parts as a
 * local calendar day so no time zone shifts it. Anything else is shown as typed.
 */
export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return iso;
  }
  const [, year, month, day] = match;
  return dateFormat.format(new Date(Number(year), Number(month) - 1, Number(day)));
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

/** The invoice reference, series and number joined: `A-0001`. */
export function formatReference(series: string, number: string): string {
  return `${series}-${number}`;
}

/** The reference shown in the app header, e.g. `A-0001 · 1,234.50 CUP`. */
export function formatHeaderReference(
  series: string,
  number: string,
  totalCents: number,
  currency: Currency,
): string {
  return `${formatReference(series, number)} · ${formatMoney(totalCents, currency)}`;
}

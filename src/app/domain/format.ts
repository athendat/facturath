import type { Currency } from './invoice';

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

/** The reference shown in the app header, e.g. `A-0001 · 1,234.50 CUP`. */
export function formatHeaderReference(
  series: string,
  number: string,
  totalCents: number,
  currency: Currency,
): string {
  return `${series}-${number} · ${formatMoney(totalCents, currency)}`;
}

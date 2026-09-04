import { needsExchangeRate, type Invoice } from './invoice';
import {
  isPositiveNumber,
  lineAmountCents,
  multiplyCents,
  parseCents,
  percentOfCents,
} from './money';

/** Invoice totals in integer cents. `cupEquivalent` is null unless the invoice is in another currency with a positive rate. */
export interface InvoiceTotals {
  lineAmounts: number[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  cupEquivalent: number | null;
}

/**
 * Each line rounds once; the subtotal sums the rounded lines; the taxable
 * base never goes below zero; tax applies to the base only; shipping is
 * added after tax; the CUP equivalent rounds once.
 */
export function computeTotals(invoice: Invoice): InvoiceTotals {
  const lineAmounts = invoice.lines.map((line) => lineAmountCents(line.quantity, line.unitPrice));
  const subtotal = lineAmounts.reduce((sum, amount) => sum + amount, 0);
  const discount = parseCents(invoice.discount);
  const shipping = parseCents(invoice.shipping);
  const base = Math.max(subtotal - discount, 0);
  const tax = percentOfCents(base, invoice.tax.percent);
  const total = base + tax + shipping;
  const cupEquivalent =
    needsExchangeRate(invoice.currency) && isPositiveNumber(invoice.exchangeRate)
      ? multiplyCents(total, invoice.exchangeRate)
      : null;

  return { lineAmounts, subtotal, discount, shipping, tax, total, cupEquivalent };
}

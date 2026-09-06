import type { Invoice } from '../../domain/invoice';
import { computeTotals } from '../../domain/totals';
import type { InvoiceSummary } from './ports';

export function summarize(invoice: Invoice): InvoiceSummary {
  return {
    id: invoice.id,
    series: invoice.series,
    number: invoice.number,
    issueDate: invoice.issueDate,
    buyerName: invoice.buyer.name,
    currency: invoice.currency,
    total: computeTotals(invoice).total,
  };
}

/** Newest first: by issue date, then by number (numerically, so `0010` follows `0009`). */
export function newestFirst(summaries: InvoiceSummary[]): InvoiceSummary[] {
  return [...summaries].sort(
    (a, b) =>
      b.issueDate.localeCompare(a.issueDate) ||
      b.number.localeCompare(a.number, undefined, { numeric: true }),
  );
}

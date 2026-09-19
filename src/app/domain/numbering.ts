/** What per-series numbering needs from a saved invoice. */
export interface SeriesNumber {
  series: string;
  number: string;
}

const NUMBER_WIDTH = 4;

/**
 * The number the next invoice of `series` gets: the highest numeric number saved in that
 * series plus one, zero-padded to four digits (`0001` for a series with no invoices).
 * Each series counts on its own; non-numeric numbers do not take part.
 */
export function nextNumber(saved: readonly SeriesNumber[], series: string): string {
  let highest = 0;
  for (const invoice of saved) {
    if (invoice.series !== series || !/^\d+$/.test(invoice.number)) {
      continue;
    }
    highest = Math.max(highest, Number(invoice.number));
  }
  return String(highest + 1).padStart(NUMBER_WIDTH, '0');
}

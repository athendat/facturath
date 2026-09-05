import { formatLocalIsoDate } from './dates';

describe('formatLocalIsoDate', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(formatLocalIsoDate(new Date(2026, 8, 4, 10, 15))).toBe('2026-09-04');
  });

  it('keeps the local calendar day late at night instead of the UTC one', () => {
    expect(formatLocalIsoDate(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
    expect(formatLocalIsoDate(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
  });
});

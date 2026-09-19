import { nextNumber } from './numbering';

describe('nextNumber', () => {
  it('starts a series that has no invoices at 0001', () => {
    expect(nextNumber([], 'A')).toBe('0001');
    expect(nextNumber([{ series: 'B', number: '0007' }], 'A')).toBe('0001');
  });

  it('follows the highest number of the series, zero-padded to four digits', () => {
    const saved = [
      { series: 'A', number: '0002' },
      { series: 'A', number: '0010' },
      { series: 'A', number: '0003' },
      { series: 'B', number: '0042' },
    ];

    expect(nextNumber(saved, 'A')).toBe('0011');
    expect(nextNumber(saved, 'B')).toBe('0043');
  });

  it('ignores numbers that are not numeric and keeps growing past four digits', () => {
    expect(nextNumber([{ series: 'A', number: 'borrador' }], 'A')).toBe('0001');
    expect(nextNumber([{ series: 'A', number: '9999' }], 'A')).toBe('10000');
  });
});

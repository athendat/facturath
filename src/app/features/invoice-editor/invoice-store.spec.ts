import { TestBed } from '@angular/core/testing';
import { InvoiceStore } from './invoice-store';

describe('InvoiceStore', () => {
  let store: InvoiceStore;

  beforeEach(() => {
    store = TestBed.inject(InvoiceStore);
  });

  describe('line amounts', () => {
    it('shows the rounded line amount as quantity and price are typed', () => {
      store.updateLine(0, 'quantity', '3');
      store.updateLine(0, 'unitPrice', '0.1');

      expect(store.lineAmounts()).toEqual(['0.30']);
    });

    it('parses a comma and a point as the same decimal separator', () => {
      store.updateLine(0, 'unitPrice', '2');

      store.updateLine(0, 'quantity', '1,5');
      const withComma = store.lineAmounts()[0];
      store.updateLine(0, 'quantity', '1.5');
      const withPoint = store.lineAmounts()[0];

      expect(withComma).toBe('3.00');
      expect(withPoint).toBe('3.00');
    });

    it('counts empty or invalid input as zero', () => {
      store.updateLine(0, 'quantity', '2');

      store.updateLine(0, 'unitPrice', '');
      expect(store.lineAmounts()[0]).toBe('0.00');

      store.updateLine(0, 'unitPrice', 'abc');
      expect(store.lineAmounts()[0]).toBe('0.00');

      store.updateLine(0, 'unitPrice', '1.2.3');
      expect(store.lineAmounts()[0]).toBe('0.00');
    });

    it('rounds half up to cents once per line', () => {
      store.updateLine(0, 'quantity', '1');
      store.updateLine(0, 'unitPrice', '1.005');

      expect(store.lineAmounts()[0]).toBe('1.01');
    });
  });

  describe('totals', () => {
    it('applies the discount, taxes the base only and adds shipping after tax', () => {
      store.updateLine(0, 'quantity', '2');
      store.updateLine(0, 'unitPrice', '10');
      store.setField('discount', '5');
      store.setField('shipping', '3');
      store.setField('tax', { name: 'Impuesto', percent: '10' });

      expect(store.totals()).toEqual({
        subtotal: '20.00',
        discount: '5.00',
        shipping: '3.00',
        taxPercent: 10,
        tax: '1.50',
        total: '19.50',
        cupEquivalent: null,
      });
    });

    it('caps the discount so the taxable base is never negative', () => {
      store.updateLine(0, 'quantity', '2');
      store.updateLine(0, 'unitPrice', '10');
      store.setField('discount', '30');
      store.setField('shipping', '3');
      store.setField('tax', { name: 'Impuesto', percent: '10' });

      const totals = store.totals();
      expect(totals.subtotal).toBe('20.00');
      expect(totals.tax).toBe('0.00');
      expect(totals.total).toBe('3.00');
    });
  });
});

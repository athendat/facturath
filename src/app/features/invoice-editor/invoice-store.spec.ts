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

    it('does not accept thousands separators', () => {
      store.updateLine(0, 'quantity', '1');
      store.updateLine(0, 'unitPrice', '1,000.50');

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
      store.updateTax('name', 'Impuesto');
      store.updateTax('percent', '10');

      expect(store.totals()).toEqual({
        subtotal: '20.00',
        discount: '5.00',
        shipping: '3.00',
        tax: '1.50',
        total: '19.50 CUP',
        cupEquivalent: null,
      });
    });

    it('accepts a decimal tax percent', () => {
      store.updateLine(0, 'quantity', '2');
      store.updateLine(0, 'unitPrice', '10');
      store.updateTax('percent', '10,5');

      expect(store.totals().tax).toBe('2.10');
      expect(store.totals().total).toBe('22.10 CUP');
    });

    it('caps the discount so the taxable base is never negative', () => {
      store.updateLine(0, 'quantity', '2');
      store.updateLine(0, 'unitPrice', '10');
      store.setField('discount', '30');
      store.setField('shipping', '3');
      store.updateTax('percent', '10');

      const totals = store.totals();
      expect(totals.subtotal).toBe('20.00');
      expect(totals.tax).toBe('0.00');
      expect(totals.total).toBe('3.00 CUP');
    });
  });

  describe('currency', () => {
    it('needs an exchange rate only when the currency is not CUP', () => {
      expect(store.needsExchangeRate()).toBe(false);

      store.setField('currency', 'USD');
      expect(store.needsExchangeRate()).toBe(true);

      store.setField('currency', 'CUP');
      expect(store.needsExchangeRate()).toBe(false);
    });

    it('shows the CUP equivalent only once a positive exchange rate is typed', () => {
      store.updateLine(0, 'quantity', '1');
      store.updateLine(0, 'unitPrice', '10');
      store.setField('currency', 'USD');

      expect(store.invoice().exchangeRate).toBe('');
      expect(store.showsCupEquivalent()).toBe(false);
      expect(store.totals().cupEquivalent).toBeNull();

      store.setField('exchangeRate', '0');
      expect(store.showsCupEquivalent()).toBe(false);
      expect(store.totals().cupEquivalent).toBeNull();

      store.setField('exchangeRate', '120');
      expect(store.showsCupEquivalent()).toBe(true);
      expect(store.totals().cupEquivalent).toBe('1,200.00 CUP');

      store.setField('currency', 'CUP');
      expect(store.showsCupEquivalent()).toBe(false);
      expect(store.totals().cupEquivalent).toBeNull();
    });

    it('rounds the CUP equivalent once from the total', () => {
      store.updateLine(0, 'quantity', '1');
      store.updateLine(0, 'unitPrice', '0.01');
      store.setField('currency', 'EUR');
      store.setField('exchangeRate', '120,5');

      expect(store.totals().cupEquivalent).toBe('1.21 CUP');
    });
  });

  describe('issue date', () => {
    it('starts empty so the prerendered document carries no date', () => {
      expect(store.invoice().issueDate).toBe('');
    });

    it('dates the invoice with the local ISO day when it has no date yet', () => {
      store.setIssueDateIfEmpty(new Date(2026, 8, 4, 23, 30));

      expect(store.invoice().issueDate).toBe('2026-09-04');
    });

    it('does not overwrite a date the user already typed', () => {
      store.setField('issueDate', '2026-01-15');

      store.setIssueDateIfEmpty(new Date(2026, 8, 4));

      expect(store.invoice().issueDate).toBe('2026-01-15');
    });
  });

  describe('parties', () => {
    const emptyParty = {
      name: '',
      address: '',
      nit: '',
      identityCard: '',
      commercialRegistry: '',
      bankAccount: '',
      bankBranch: '',
    };

    it('starts with an empty seller and buyer', () => {
      expect(store.invoice().seller).toEqual(emptyParty);
      expect(store.invoice().buyer).toEqual(emptyParty);
    });

    it('updates each seller field without touching the buyer', () => {
      store.updateParty('seller', 'name', 'Taller Rodríguez');
      store.updateParty('seller', 'address', 'Calle 23 #456, La Habana');
      store.updateParty('seller', 'nit', '12345678901');
      store.updateParty('seller', 'commercialRegistry', 'REEUP 123');
      store.updateParty('seller', 'bankAccount', '0598 1234 5678');
      store.updateParty('seller', 'bankBranch', 'BANDEC 4321');

      expect(store.invoice().seller).toEqual({
        name: 'Taller Rodríguez',
        address: 'Calle 23 #456, La Habana',
        nit: '12345678901',
        identityCard: '',
        commercialRegistry: 'REEUP 123',
        bankAccount: '0598 1234 5678',
        bankBranch: 'BANDEC 4321',
      });
      expect(store.invoice().buyer).toEqual(emptyParty);
    });

    it('updates each buyer field without touching the seller', () => {
      store.updateParty('buyer', 'name', 'Ana Pérez');
      store.updateParty('buyer', 'address', 'Ave. 51, Marianao');
      store.updateParty('buyer', 'nit', '98765432109');
      store.updateParty('buyer', 'identityCard', '85010112345');
      store.updateParty('buyer', 'commercialRegistry', 'RC 77');
      store.updateParty('buyer', 'bankAccount', '0300 9876 5432');

      expect(store.invoice().buyer).toEqual({
        name: 'Ana Pérez',
        address: 'Ave. 51, Marianao',
        nit: '98765432109',
        identityCard: '85010112345',
        commercialRegistry: 'RC 77',
        bankAccount: '0300 9876 5432',
        bankBranch: '',
      });
      expect(store.invoice().seller).toEqual(emptyParty);
    });
  });

  describe('text blocks', () => {
    it('start empty', () => {
      expect(store.invoice().concept).toBe('');
      expect(store.invoice().notes).toBe('');
      expect(store.invoice().terms).toBe('');
    });

    it('hold the concept, notes and terms typed by the user', () => {
      store.setField('concept', 'Venta de mercancías');
      store.setField('notes', 'Entrega parcial');
      store.setField('terms', 'Pago a 30 días');

      expect(store.invoice().concept).toBe('Venta de mercancías');
      expect(store.invoice().notes).toBe('Entrega parcial');
      expect(store.invoice().terms).toBe('Pago a 30 días');
    });
  });

  describe('carrier', () => {
    it('starts empty', () => {
      expect(store.invoice().carrier).toEqual({
        name: '',
        identityCard: '',
        plate: '',
        waybill: '',
        railwayBox: '',
      });
    });

    it('updates each carrier field', () => {
      store.updateCarrier('name', 'Luis Gómez');
      store.updateCarrier('identityCard', '90020254321');
      store.updateCarrier('plate', 'P123456');
      store.updateCarrier('waybill', 'CP-0099');
      store.updateCarrier('railwayBox', 'F-12');

      expect(store.invoice().carrier).toEqual({
        name: 'Luis Gómez',
        identityCard: '90020254321',
        plate: 'P123456',
        waybill: 'CP-0099',
        railwayBox: 'F-12',
      });
    });
  });

  describe('signatures', () => {
    it('start empty', () => {
      expect(store.invoice().signatures).toEqual({
        delivers: '',
        receives: '',
        carrier: '',
        books: '',
      });
    });

    it('updates each signature line', () => {
      store.updateSignature('delivers', 'Marta');
      store.updateSignature('receives', 'Ana');
      store.updateSignature('carrier', 'Luis');
      store.updateSignature('books', 'Pedro');

      expect(store.invoice().signatures).toEqual({
        delivers: 'Marta',
        receives: 'Ana',
        carrier: 'Luis',
        books: 'Pedro',
      });
    });
  });

  describe('header reference', () => {
    it('combines series, number and the formatted total with its currency', () => {
      store.updateLine(0, 'quantity', '1');
      store.updateLine(0, 'unitPrice', '1234.5');

      expect(store.headerReference()).toBe('A-0001 · 1,234.50 CUP');

      store.setField('series', 'B');
      store.setField('number', '0042');
      store.setField('currency', 'MLC');
      expect(store.headerReference()).toBe('B-0042 · 1,234.50 MLC');
    });
  });

  describe('lines', () => {
    it('starts with one empty line', () => {
      expect(store.invoice().lines).toEqual([
        { code: '', description: '', detail: '', unit: 'u', quantity: '1', unitPrice: '' },
      ]);
    });

    it('appends an empty line', () => {
      store.updateLine(0, 'description', 'Primera');

      store.addLine();

      expect(store.invoice().lines.map((line) => line.description)).toEqual(['Primera', '']);
      expect(store.lineAmounts()).toEqual(['0.00', '0.00']);
    });

    it('removes the line at the given index', () => {
      store.addLine();
      store.updateLine(0, 'description', 'Primera');
      store.updateLine(1, 'description', 'Segunda');

      store.removeLine(0);

      expect(store.invoice().lines.map((line) => line.description)).toEqual(['Segunda']);
    });

    it('resets the last remaining line to empty instead of removing it', () => {
      store.updateLine(0, 'description', 'Unica');
      store.updateLine(0, 'quantity', '3');
      store.updateLine(0, 'unitPrice', '5');

      store.removeLine(0);

      expect(store.invoice().lines).toEqual([
        { code: '', description: '', detail: '', unit: 'u', quantity: '1', unitPrice: '' },
      ]);
      expect(store.lineAmounts()).toEqual(['0.00']);
    });

    it('sums the rounded line amounts into the subtotal', () => {
      store.addLine();
      store.addLine();
      for (const index of [0, 1, 2]) {
        store.updateLine(index, 'quantity', '1');
        store.updateLine(index, 'unitPrice', '0.005');
      }

      expect(store.lineAmounts()).toEqual(['0.01', '0.01', '0.01']);
      expect(store.totals().subtotal).toBe('0.03');
    });
  });
});

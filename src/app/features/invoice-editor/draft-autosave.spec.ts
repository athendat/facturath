import { TestBed } from '@angular/core/testing';
import { INVOICE_REPOSITORY, PREFERENCES_STORE } from '../../core/storage/ports';
import { createInvoice, type Invoice } from '../../domain/invoice';
import { createEmptyProfile } from '../../domain/seller-profile';
import { DraftAutosave } from './draft-autosave';
import { InvoiceStore } from './invoice-store';

const TODAY = new Date(2026, 8, 19);

function draftInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    ...createInvoice('draft-1'),
    number: '0004',
    issueDate: '2026-09-18',
    concept: 'Venta pendiente',
    ...overrides,
  };
}

describe('DraftAutosave', () => {
  let autosave: DraftAutosave;
  let store: InvoiceStore;

  beforeEach(() => {
    autosave = TestBed.inject(DraftAutosave);
    store = TestBed.inject(InvoiceStore);
  });

  it('restores the draft as the open invoice on start', async () => {
    const draft = draftInvoice();
    await TestBed.inject(INVOICE_REPOSITORY).saveDraft(draft);

    await autosave.start(TODAY, () => '0001');

    expect(store.invoice()).toEqual(draft);
  });

  it('opens a new invoice from the profile, the next number and today when there is no draft', async () => {
    await TestBed.inject(PREFERENCES_STORE).saveProfile({
      ...createEmptyProfile(),
      name: 'Taller Rodríguez',
      nit: '12345678901',
    });

    await autosave.start(TODAY, (series) => (series === 'A' ? '0008' : '0001'));

    const invoice = store.invoice();
    expect(invoice.number).toBe('0008');
    expect(invoice.issueDate).toBe('2026-09-19');
    expect(invoice.seller.name).toBe('Taller Rodríguez');
    expect(invoice.seller.nit).toBe('12345678901');
  });
});

import { TestBed } from '@angular/core/testing';
import { INVOICE_REPOSITORY, type InvoiceRepository } from '../../core/storage/ports';
import { ToastService } from '../../core/toast';
import { createInvoice, type Invoice } from '../../domain/invoice';
import { SavedInvoicesStore } from './saved-invoices-store';

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    ...createInvoice(crypto.randomUUID()),
    issueDate: '2026-09-10',
    buyer: { ...createInvoice('').buyer, name: 'Ana Pérez' },
    lines: [{ code: '', description: 'Servicio', detail: '', unit: 'u', quantity: '2', unitPrice: '10' }],
    ...overrides,
  };
}

describe('SavedInvoicesStore', () => {
  let store: SavedInvoicesStore;
  let toasts: ToastService;

  beforeEach(() => {
    store = TestBed.inject(SavedInvoicesStore);
    toasts = TestBed.inject(ToastService);
  });

  it('starts empty', () => {
    expect(store.summaries()).toEqual([]);
    expect(store.count()).toBe(0);
  });

  it('saves the invoice, lists it and confirms with its reference', async () => {
    await store.save(invoice({ series: 'A', number: '0001' }));

    expect(toasts.current()?.message).toBe('Factura A-0001 guardada.');
    expect(store.count()).toBe(1);
    expect(store.summaries()).toEqual([
      expect.objectContaining({
        series: 'A',
        number: '0001',
        issueDate: '2026-09-10',
        buyerName: 'Ana Pérez',
        currency: 'CUP',
        total: 2000,
      }),
    ]);
  });

  it('replaces the record with the same series and number instead of duplicating it', async () => {
    const first = invoice({ series: 'A', number: '0001' });
    await store.save(first);

    await store.save(invoice({ series: 'A', number: '0001', issueDate: '2026-09-11' }));

    expect(store.count()).toBe(1);
    expect(store.summaries()[0]?.issueDate).toBe('2026-09-11');
    await expect(TestBed.inject(INVOICE_REPOSITORY).get(first.id)).resolves.toBeNull();
  });

  it('numbers each series on its own from the saved invoices', async () => {
    expect(store.nextNumber('A')).toBe('0001');

    await store.save(invoice({ series: 'A', number: '0001' }));
    await store.save(invoice({ series: 'A', number: '0007' }));
    await store.save(invoice({ series: 'B', number: '0002' }));

    expect(store.nextNumber('A')).toBe('0008');
    expect(store.nextNumber('B')).toBe('0003');
    expect(store.nextNumber('C')).toBe('0001');
  });

  it('lists what the repository already holds once loaded', async () => {
    const repository = TestBed.inject(INVOICE_REPOSITORY);
    await repository.save(invoice({ series: 'A', number: '0003' }));
    await repository.save(invoice({ series: 'A', number: '0004' }));
    expect(store.count()).toBe(0);

    await store.load();

    expect(store.count()).toBe(2);
    expect(store.summaries().map((summary) => summary.number)).toEqual(['0004', '0003']);
  });

  it('hands back a saved invoice by id', async () => {
    const saved = invoice({ series: 'A', number: '0001', concept: 'Venta' });
    await store.save(saved);

    await expect(store.get(saved.id)).resolves.toEqual(saved);
    await expect(store.get('missing')).resolves.toBeNull();
  });

  it('deletes the invoice from the list and the repository', async () => {
    const first = invoice({ series: 'A', number: '0001' });
    const second = invoice({ series: 'A', number: '0002' });
    await store.save(first);
    await store.save(second);

    await store.delete(first.id);

    expect(store.summaries().map((summary) => summary.id)).toEqual([second.id]);
    expect(store.count()).toBe(1);
    await expect(TestBed.inject(INVOICE_REPOSITORY).get(first.id)).resolves.toBeNull();
  });
});

describe('SavedInvoicesStore when the repository cannot write', () => {
  function configure(error: unknown, failing: Partial<InvoiceRepository> = {}): SavedInvoicesStore {
    const repository: InvoiceRepository = {
      listSummaries: () => Promise.resolve([]),
      get: () => Promise.resolve(null),
      save: () => Promise.reject(error),
      delete: () => Promise.resolve(),
      getDraft: () => Promise.resolve(null),
      saveDraft: () => Promise.resolve(),
      ...failing,
    };
    TestBed.configureTestingModule({
      providers: [{ provide: INVOICE_REPOSITORY, useValue: repository }],
    });
    return TestBed.inject(SavedInvoicesStore);
  }

  it('reports a delete that fails instead of rejecting', async () => {
    const store = configure(new Error('boom'), { delete: () => Promise.reject(new Error('boom')) });

    await expect(store.delete('any')).resolves.toBeUndefined();

    expect(TestBed.inject(ToastService).current()?.message).toBe('No se pudo eliminar la factura.');
  });

  it('reports a load that fails instead of rejecting', async () => {
    const store = configure(new Error('boom'), {
      listSummaries: () => Promise.reject(new Error('boom')),
    });

    await expect(store.load()).resolves.toBeUndefined();

    expect(TestBed.inject(ToastService).current()?.message).toBe(
      'No se pudieron leer las facturas guardadas.',
    );
  });

  it('tells the user storage is full and stops there', async () => {
    const store = configure(new DOMException('Quota exceeded', 'QuotaExceededError'));

    await store.save(invoice());

    expect(TestBed.inject(ToastService).current()?.message).toBe(
      'No hay espacio para guardar. Exporta y elimina facturas antiguas.',
    );
    expect(store.count()).toBe(0);
  });

  it('shows a generic failure for any other error', async () => {
    const store = configure(new Error('boom'));

    await store.save(invoice());

    expect(TestBed.inject(ToastService).current()?.message).toBe('No se pudo guardar la factura.');
  });
});

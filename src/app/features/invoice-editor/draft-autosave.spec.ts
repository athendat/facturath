import { TestBed } from '@angular/core/testing';
import { InMemoryInvoiceRepository } from '../../core/storage/in-memory-invoice-repository';
import {
  INVOICE_REPOSITORY,
  PREFERENCES_STORE,
  type InvoiceRepository,
} from '../../core/storage/ports';
import { ToastService } from '../../core/toast';
import { createInvoice, type Invoice } from '../../domain/invoice';
import { createEmptyProfile } from '../../domain/seller-profile';
import { DRAFT_DELAY_MS, DraftAutosave } from './draft-autosave';
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

  // Known gap #37: text typed before hydration is lost; but what the user typed after it,
  // while the draft was still being read, must not be overwritten by the draft.
  it('keeps what the user already edited over a draft that arrives later', async () => {
    await TestBed.inject(INVOICE_REPOSITORY).saveDraft(draftInvoice());
    store.setField('concept', 'Lo que escribí');

    await autosave.start(TODAY, () => '0008');

    expect(store.invoice().concept).toBe('Lo que escribí');
    expect(store.invoice().id).not.toBe('draft-1');
    expect(store.invoice().number).toBe('0008');
    expect(store.invoice().issueDate).toBe('2026-09-19');
  });

  it('keeps what the user already edited when there is no draft, numbering it only', async () => {
    store.setField('concept', 'Lo que escribí');

    await autosave.start(TODAY, () => '0008');

    expect(store.invoice().concept).toBe('Lo que escribí');
    expect(store.invoice().number).toBe('0008');
    expect(store.invoice().issueDate).toBe('2026-09-19');
  });

  describe('once started', () => {
    let repository: InvoiceRepository;
    let saveDraft: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
      vi.useFakeTimers();
      repository = TestBed.inject(INVOICE_REPOSITORY);
      await autosave.start(TODAY, () => '0001');
      TestBed.tick();
      saveDraft = vi.spyOn(repository, 'saveDraft');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('writes the draft once, 500 ms after the last change', async () => {
      store.setField('concept', 'V');
      TestBed.tick();
      vi.advanceTimersByTime(400);
      store.setField('concept', 'Ve');
      TestBed.tick();
      vi.advanceTimersByTime(499);
      expect(saveDraft).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);

      expect(saveDraft).toHaveBeenCalledOnce();
      await expect(repository.getDraft()).resolves.toMatchObject({ concept: 'Ve' });
    });

    // App.startNew calls writeNow right after the store change, before the effect has run.
    it('writes a new invoice once when written through before the effect runs', async () => {
      store.startNew('0002');
      await autosave.writeNow();
      TestBed.tick();

      vi.advanceTimersByTime(DRAFT_DELAY_MS * 2);

      expect(saveDraft).toHaveBeenCalledOnce();
    });

    it('writes through at once on demand and drops the pending write', async () => {
      store.setField('concept', 'Venta');
      TestBed.tick();

      await autosave.writeNow();

      expect(saveDraft).toHaveBeenCalledOnce();
      await expect(repository.getDraft()).resolves.toMatchObject({ concept: 'Venta' });
      vi.advanceTimersByTime(DRAFT_DELAY_MS * 2);
      expect(saveDraft).toHaveBeenCalledOnce();
    });
  });

  describe('when the draft cannot be written', () => {
    function failingWith(error: unknown): void {
      const repository = new InMemoryInvoiceRepository();
      vi.spyOn(repository, 'saveDraft').mockRejectedValue(error);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{ provide: INVOICE_REPOSITORY, useValue: repository }],
      });
      autosave = TestBed.inject(DraftAutosave);
      store = TestBed.inject(InvoiceStore);
    }

    it('tells the user storage is full once, not on every write', async () => {
      failingWith(new DOMException('Quota exceeded', 'QuotaExceededError'));
      const toasts = TestBed.inject(ToastService);
      await autosave.start(TODAY, () => '0001');

      await autosave.writeNow();

      expect(toasts.current()?.message).toBe(
        'No hay espacio para guardar. Exporta y elimina facturas antiguas.',
      );
      toasts.dismiss();
      store.setField('concept', 'Venta');
      await autosave.writeNow();
      expect(toasts.current()).toBeNull();
    });

    it('stays silent on any other failure', async () => {
      failingWith(new Error('boom'));
      await autosave.start(TODAY, () => '0001');

      await expect(autosave.writeNow()).resolves.toBeUndefined();

      expect(TestBed.inject(ToastService).current()).toBeNull();
    });
  });

  it.each([
    ['restored', () => TestBed.inject(INVOICE_REPOSITORY).saveDraft(draftInvoice())],
    ['started new', () => Promise.resolve()],
  ])('does not write back the invoice start just %s', async (_case, seed) => {
    vi.useFakeTimers();
    try {
      await seed();
      const saveDraft = vi.spyOn(TestBed.inject(INVOICE_REPOSITORY), 'saveDraft');

      await autosave.start(TODAY, () => '0001');
      TestBed.tick();
      vi.advanceTimersByTime(DRAFT_DELAY_MS * 2);

      expect(saveDraft).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('writes nothing before start, as during prerender', async () => {
    vi.useFakeTimers();
    try {
      store.setField('concept', 'Venta');
      TestBed.tick();
      vi.advanceTimersByTime(DRAFT_DELAY_MS * 2);

      await expect(TestBed.inject(INVOICE_REPOSITORY).getDraft()).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

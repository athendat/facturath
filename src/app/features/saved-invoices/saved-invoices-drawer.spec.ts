import { ComponentFixture, TestBed } from '@angular/core/testing';
import { INVOICE_REPOSITORY } from '../../core/storage/ports';
import { findButton } from '../../core/testing/dom';
import { createInvoice, type Invoice } from '../../domain/invoice';
import { SavedInvoicesDrawer } from './saved-invoices-drawer';
import { SavedInvoicesStore } from './saved-invoices-store';

function invoice(overrides: Partial<Invoice>): Invoice {
  return {
    ...createInvoice(crypto.randomUUID()),
    issueDate: '2026-09-10',
    buyer: { ...createInvoice('').buyer, name: 'Ana Pérez' },
    lines: [{ code: '', description: 'Servicio', detail: '', unit: 'u', quantity: '2', unitPrice: '10' }],
    ...overrides,
  };
}

describe('SavedInvoicesDrawer', () => {
  let fixture: ComponentFixture<SavedInvoicesDrawer>;
  let element: HTMLElement;
  let store: SavedInvoicesStore;
  const first = invoice({ series: 'A', number: '0001' });
  const second = invoice({ series: 'A', number: '0002', issueDate: '2026-09-12', currency: 'USD' });

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SavedInvoicesDrawer] }).compileComponents();
    store = TestBed.inject(SavedInvoicesStore);
    await store.save(first);
    await store.save(second);
    fixture = TestBed.createComponent(SavedInvoicesDrawer);
    element = fixture.nativeElement as HTMLElement;
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
  });

  function rows(): HTMLElement[] {
    return Array.from(element.querySelectorAll<HTMLElement>('li'));
  }

  it('lists the saved invoices newest first with reference, buyer, date and total', () => {
    const texts = rows().map((row) => row.textContent?.replace(/\s+/g, ' ').trim());

    expect(texts).toHaveLength(2);
    expect(texts[0]).toContain('A-0002');
    expect(texts[0]).toContain('Ana Pérez');
    expect(texts[0]).toContain('12/9/2026');
    expect(texts[0]).toContain('20.00 USD');
    expect(texts[1]).toContain('A-0001');
    expect(texts[1]).toContain('20.00 CUP');
  });

  it('asks to open a saved invoice by its id', async () => {
    const opened = vi.fn();
    fixture.componentInstance.opened.subscribe(opened);

    findButton(rows()[1] as HTMLElement, 'Abrir')?.click();
    await fixture.whenStable();

    expect(opened).toHaveBeenCalledWith(first.id);
  });

  it('deletes a saved invoice from the list and the repository', async () => {
    const remove = rows()[0]?.querySelector<HTMLButtonElement>('button[aria-label="Eliminar A-0002"]');

    remove?.click();
    await fixture.whenStable();

    expect(rows()).toHaveLength(1);
    expect(rows()[0]?.textContent).toContain('A-0001');
    await expect(TestBed.inject(INVOICE_REPOSITORY).get(second.id)).resolves.toBeNull();
  });

  it('says so when nothing is saved yet', async () => {
    await store.delete(first.id);
    await store.delete(second.id);
    await fixture.whenStable();

    expect(rows()).toHaveLength(0);
    expect(element.textContent).toContain('Aún no hay facturas guardadas.');
  });
});

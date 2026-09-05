import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentMeta } from './document-meta';
import { InvoiceStore } from './invoice-store';

describe('DocumentMeta', () => {
  let fixture: ComponentFixture<DocumentMeta>;
  let element: HTMLElement;
  let store: InvoiceStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DocumentMeta] }).compileComponents();
    fixture = TestBed.createComponent(DocumentMeta);
    element = fixture.nativeElement as HTMLElement;
    store = TestBed.inject(InvoiceStore);
    await fixture.whenStable();
  });

  function input(label: string): HTMLInputElement {
    const found = element.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    if (!found) {
      throw new Error(`No input labelled ${label}`);
    }
    return found;
  }

  async function type(field: HTMLInputElement, text: string): Promise<void> {
    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  it('renders the issue date as an empty native date input', () => {
    const date = input('Fecha de emisión');

    expect(date.type).toBe('date');
    expect(date.value).toBe('');
  });

  it('shows the date held by the store and writes changes back', async () => {
    store.setIssueDateIfEmpty(new Date(2026, 8, 4));
    await fixture.whenStable();
    expect(input('Fecha de emisión').value).toBe('2026-09-04');

    await type(input('Fecha de emisión'), '2026-10-01');

    expect(store.invoice().issueDate).toBe('2026-10-01');
  });

  it('updates the header reference when the series or number change', async () => {
    await type(input('Serie'), 'B');
    await type(input('Número'), '0042');

    expect(store.headerReference()).toBe('B-0042 · 0.00 CUP');
  });
});

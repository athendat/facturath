import { ComponentFixture, TestBed } from '@angular/core/testing';
import { typeInto } from '../../core/testing/dom';
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

  it('renders the issue date as an empty native date input', () => {
    const date = input('Fecha de emisión');

    expect(date.type).toBe('date');
    expect(date.value).toBe('');
  });

  it('shows the date held by the store and writes changes back', async () => {
    store.setIssueDateIfEmpty(new Date(2026, 8, 4));
    await fixture.whenStable();
    expect(input('Fecha de emisión').value).toBe('2026-09-04');

    typeInto(element, 'Fecha de emisión', '2026-10-01');
    await fixture.whenStable();

    expect(store.invoice().issueDate).toBe('2026-10-01');
  });

  it('updates the header reference when the series or number change', async () => {
    typeInto(element, 'Serie', 'B');
    typeInto(element, 'Número', '0042');
    await fixture.whenStable();

    expect(store.headerReference()).toBe('B-0042 · 0.00 CUP');
  });
});

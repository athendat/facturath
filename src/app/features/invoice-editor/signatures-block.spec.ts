import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvoiceStore } from './invoice-store';
import { SignaturesBlock } from './signatures-block';

describe('SignaturesBlock', () => {
  let fixture: ComponentFixture<SignaturesBlock>;
  let element: HTMLElement;
  let store: InvoiceStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SignaturesBlock] }).compileComponents();
    fixture = TestBed.createComponent(SignaturesBlock);
    element = fixture.nativeElement as HTMLElement;
    store = TestBed.inject(InvoiceStore);
    await fixture.whenStable();
  });

  async function type(label: string, text: string): Promise<void> {
    const field = element.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
    if (!field) {
      throw new Error(`No input labelled ${label}`);
    }
    field.value = text;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  it('renders four signature lines with their captions in order', () => {
    expect(
      Array.from(element.querySelectorAll('input')).map((input) =>
        input.getAttribute('aria-label'),
      ),
    ).toEqual(['Firma: entrega', 'Firma: recibe', 'Firma: transportador', 'Firma: contabiliza']);
    expect(
      Array.from(element.querySelectorAll('p')).map((caption) => caption.textContent?.trim()),
    ).toEqual([
      'Entrega · fecha',
      'Recibe · fecha',
      'Transportador · fecha',
      'Contabiliza · fecha',
    ]);
  });

  it('writes each line to the signatures in the store', async () => {
    await type('Firma: entrega', 'Marta');
    await type('Firma: recibe', 'Ana');
    await type('Firma: transportador', 'Luis');
    await type('Firma: contabiliza', 'Pedro');

    expect(store.invoice().signatures).toEqual({
      delivers: 'Marta',
      receives: 'Ana',
      carrier: 'Luis',
      books: 'Pedro',
    });
  });
});

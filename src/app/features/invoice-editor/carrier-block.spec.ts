import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarrierBlock } from './carrier-block';
import { InvoiceStore } from './invoice-store';

describe('CarrierBlock', () => {
  let fixture: ComponentFixture<CarrierBlock>;
  let element: HTMLElement;
  let store: InvoiceStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CarrierBlock] }).compileComponents();
    fixture = TestBed.createComponent(CarrierBlock);
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

  it('renders the Transportista eyebrow and five labelled inputs', () => {
    expect(element.querySelector('p')?.textContent?.trim()).toBe('Transportista');
    expect(
      Array.from(element.querySelectorAll('input')).map((input) =>
        input.getAttribute('aria-label'),
      ),
    ).toEqual([
      'Nombre del transportista',
      'Carné de identidad del transportista',
      'Matrícula del vehículo',
      'Carta de porte',
      'Casilla del ferrocarril',
    ]);
  });

  it('writes each field to the carrier in the store', async () => {
    await type('Nombre del transportista', 'Luis Gómez');
    await type('Carné de identidad del transportista', '90020254321');
    await type('Matrícula del vehículo', 'P123456');
    await type('Carta de porte', 'CP-0099');
    await type('Casilla del ferrocarril', 'F-12');

    expect(store.invoice().carrier).toEqual({
      name: 'Luis Gómez',
      identityCard: '90020254321',
      plate: 'P123456',
      waybill: 'CP-0099',
      railwayBox: 'F-12',
    });
  });
});

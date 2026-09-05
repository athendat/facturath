import { ComponentFixture, TestBed } from '@angular/core/testing';
import { typeInto } from '../../core/testing/dom';
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
    typeInto(element, 'Nombre del transportista', 'Luis Gómez');
    typeInto(element, 'Carné de identidad del transportista', '90020254321');
    typeInto(element, 'Matrícula del vehículo', 'P123456');
    typeInto(element, 'Carta de porte', 'CP-0099');
    typeInto(element, 'Casilla del ferrocarril', 'F-12');
    await fixture.whenStable();

    expect(store.invoice().carrier).toEqual({
      name: 'Luis Gómez',
      identityCard: '90020254321',
      plate: 'P123456',
      waybill: 'CP-0099',
      railwayBox: 'F-12',
    });
  });
});

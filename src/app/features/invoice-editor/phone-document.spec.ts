import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectUrls } from '../../core/object-urls';
import { SettingsStore } from '../../core/settings-store';
import { visibleText } from '../../core/testing/dom';
import { FakeObjectUrls } from '../../core/testing/fake-object-urls';
import { createInvoice, type Invoice } from '../../domain/invoice';
import { InvoiceStore } from './invoice-store';
import { PhoneDocument } from './phone-document';

/** An invoice filled in the way the mockup shows it. */
function sample(): Invoice {
  return {
    ...createInvoice('sample-1'),
    series: 'F',
    number: '0042',
    issueDate: '2026-09-26',
    concept: 'Venta de pan',
    seller: {
      name: 'Mipyme La Ceiba S.R.L.',
      address: 'Calle 23 #412, Vedado',
      nit: '01234567890',
      identityCard: '',
      commercialRegistry: '',
      bankAccount: '',
      bankBranch: '',
    },
    buyer: {
      name: 'Cafetería Los Pinos',
      address: '',
      nit: '',
      identityCard: '',
      commercialRegistry: '',
      bankAccount: '',
      bankBranch: '',
    },
    lines: [
      { code: '', description: 'Pan de molde 500 g', detail: '', unit: 'u', quantity: '40', unitPrice: '120' },
      { code: '', description: '', detail: '', unit: 'paq', quantity: '25', unitPrice: '85' },
    ],
    tax: { name: 'Impuesto sobre las ventas', percent: '10' },
    notes: 'Entrega en el local.',
    terms: 'Pago por transferencia en 30 días.',
  };
}

describe('PhoneDocument', () => {
  let fixture: ComponentFixture<PhoneDocument>;
  let element: HTMLElement;
  let store: InvoiceStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhoneDocument],
      providers: [{ provide: ObjectUrls, useValue: new FakeObjectUrls() }],
    }).compileComponents();
    fixture = TestBed.createComponent(PhoneDocument);
    element = fixture.nativeElement as HTMLElement;
    store = TestBed.inject(InvoiceStore);
    await fixture.whenStable();
  });

  /** The zone button named `name`. */
  function zone(name: string): HTMLButtonElement | null {
    return element.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);
  }

  /** What a screen reader hears after the zone's name: its summary, by aria-describedby. */
  function description(button: HTMLButtonElement | null): string {
    const id = button?.getAttribute('aria-describedby') ?? '';
    return visibleText(document.getElementById(id) ?? element.querySelector(`[id="${id}"]`));
  }

  it('is the invoice as tappable zones in document order, each a button named "Editar <zona>"', () => {
    const buttons = Array.from(element.querySelectorAll('button')).map(
      (button) => button.getAttribute('aria-label') ?? visibleText(button),
    );

    expect(buttons).toEqual([
      'Editar emisor',
      'Editar documento',
      'Editar comprador',
      'Editar concepto',
      'Editar renglón 1',
      'Añadir renglón',
      'Editar totales',
      'Editar notas',
      'Editar condiciones y QR',
      'Editar transportista',
      'Editar firmas',
    ]);
    for (const button of Array.from(element.querySelectorAll('button'))) {
      expect(button.getAttribute('type')).toBe('button');
    }
  });

  it('names the page with a level-one heading of its own and is kept off paper', () => {
    expect(visibleText(element.querySelector('h1'))).toBe('Factura');
    expect(element.hasAttribute('data-print-hide')).toBe(true);
  });

  it('summarises each part of the invoice inside its zone', async () => {
    store.load(sample());
    await fixture.whenStable();

    expect(visibleText(zone('Editar emisor'))).toContain(
      'Mipyme La Ceiba S.R.L. NIT 01234567890 · Calle 23 #412, Vedado',
    );
    expect(visibleText(zone('Editar emisor')?.querySelector('.initials'))).toBe('ML');
    expect(visibleText(zone('Editar documento'))).toBe('Número F-0042 Fecha 26/9/2026 Moneda CUP');
    expect(visibleText(zone('Editar comprador'))).toContain('Comprador Cafetería Los Pinos');
    expect(visibleText(zone('Editar concepto'))).toBe('Concepto de la operación Venta de pan');
    expect(visibleText(zone('Editar renglón 1'))).toBe('Pan de molde 500 g 40 u × 120 4,800.00');
    expect(visibleText(zone('Editar renglón 2'))).toContain('Renglón sin descripción 25 paq × 85 2,125.00');
    expect(visibleText(zone('Editar totales'))).toBe(
      'Subtotal 6,925.00 Descuento 0.00 Envío 0.00 Impuesto sobre las ventas 10 % 692.50 Total CUP 7,617.50',
    );
    expect(visibleText(zone('Editar notas'))).toBe('Notas Entrega en el local.');
    expect(visibleText(zone('Editar condiciones y QR'))).toBe(
      'Condiciones y QR Pago por transferencia en 30 días.',
    );
    // The summary is also the zone's description, so a screen reader hears it after the name.
    expect(description(zone('Editar notas'))).toBe('Notas Entrega en el local.');
  });

  it('marks each zone with what Res. 55 still needs there, in amber, and only there', async () => {
    store.load(sample());
    await fixture.whenStable();

    const pending = (name: string) => visibleText(zone(name)?.querySelector('.pending'));
    expect(pending('Editar comprador')).toBe('Falta NIT o carné y dirección');
    expect(pending('Editar renglón 2')).toBe('Falta descripción');
    expect(zone('Editar comprador')?.querySelector('.pending .dot')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(description(zone('Editar comprador'))).toContain('Falta NIT o carné y dirección');
    expect(zone('Editar renglón 1')?.querySelector('.pending')).toBeNull();
    expect(zone('Editar documento')?.querySelector('.pending')).toBeNull();
  });

  it('shows a hint in an empty zone', () => {
    expect(visibleText(zone('Editar concepto'))).toContain('Toca para escribir el concepto');
    expect(visibleText(zone('Editar notas'))).toBe('Notas Toca para añadir notas');
  });

  it('leaves out the zones of the sections turned off in Ajustes', async () => {
    const settings = TestBed.inject(SettingsStore);
    settings.setSection('showCarrier', false);
    settings.setSection('showSignatures', false);
    settings.setSection('showPaymentQr', false);
    await fixture.whenStable();

    expect(zone('Editar transportista')).toBeNull();
    expect(zone('Editar firmas')).toBeNull();
    expect(zone('Editar condiciones y QR')).toBeNull();
    expect(visibleText(zone('Editar condiciones'))).toContain('Condiciones');
  });
});

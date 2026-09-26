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
      {
        code: '',
        description: 'Pan de molde 500 g',
        detail: '',
        unit: 'u',
        quantity: '40',
        unitPrice: '120',
      },
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
    expect(visibleText(zone('Editar renglón 2'))).toContain(
      'Renglón sin descripción 25 paq × 85 2,125.00',
    );
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
    expect(
      zone('Editar comprador')?.querySelector('.pending .dot')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(description(zone('Editar comprador'))).toContain('Falta NIT o carné y dirección');
    expect(zone('Editar renglón 1')?.querySelector('.pending')).toBeNull();
    expect(zone('Editar documento')?.querySelector('.pending')).toBeNull();
  });

  it('shows a hint in an empty zone', () => {
    expect(visibleText(zone('Editar concepto'))).toContain('Toca para escribir el concepto');
    expect(visibleText(zone('Editar notas'))).toBe('Notas Toca para añadir notas');
  });

  /** The open bottom sheet. */
  function sheet(): HTMLElement | null {
    return element.querySelector<HTMLElement>('[role="dialog"]');
  }

  /** The sheet control whose visible label reads `label`. */
  function field(label: string): HTMLInputElement | null {
    const labels = Array.from(sheet()?.querySelectorAll('label') ?? []);
    const match = labels.find((candidate) => visibleText(candidate) === label);
    return match ? (document.getElementById(match.htmlFor) as HTMLInputElement | null) : null;
  }

  async function type(label: string, text: string): Promise<void> {
    const control = field(label);
    if (!control) {
      throw new Error(`No sheet field labelled ${label}`);
    }
    control.value = text;
    control.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  async function closeSheet(): Promise<void> {
    sheet()?.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')?.click();
    await fixture.whenStable();
  }

  async function openZone(name: string): Promise<HTMLButtonElement> {
    const button = zone(name) as HTMLButtonElement;
    button.focus();
    button.click();
    await fixture.whenStable();
    return button;
  }

  it('opens the buyer sheet from its zone, with a visible label on every field', async () => {
    await openZone('Editar comprador');

    expect(sheet()?.getAttribute('aria-modal')).toBe('true');
    expect(visibleText(sheet()?.querySelector('h2'))).toBe('Comprador');
    expect(
      Array.from(sheet()?.querySelectorAll('app-sheet-field label') ?? []).map(visibleText),
    ).toEqual([
      'Nombre o razón social',
      'NIT',
      'Carné de identidad',
      'Dirección',
      'Registro comercial',
      'Cuenta bancaria',
      'Sucursal bancaria',
    ]);
    expect(field('NIT')?.getAttribute('inputmode')).toBe('numeric');
    expect(field('Carné de identidad')?.getAttribute('inputmode')).toBe('numeric');
    expect(field('Nombre o razón social')?.hasAttribute('inputmode')).toBe(false);
  });

  it('writes a sheet edit straight to the invoice, so the summary and the note follow at once', async () => {
    store.load(sample());
    await fixture.whenStable();
    await openZone('Editar comprador');
    expect(field('Nombre o razón social')?.value).toBe('Cafetería Los Pinos');

    await type('NIT', '01234567891');
    await type('Dirección', 'Calle 5');

    expect(store.invoice().buyer).toMatchObject({ nit: '01234567891', address: 'Calle 5' });
    expect(visibleText(zone('Editar comprador'))).toContain('NIT 01234567891 · Calle 5');
    expect(zone('Editar comprador')?.querySelector('.pending')).toBeNull();
  });

  // Each zone, its sheet heading, the labels in order, and one edit with where it lands.
  const SHEETS: [
    zone: string,
    heading: string,
    labels: string[],
    edit: [string, string, (i: Invoice) => string],
  ][] = [
    [
      'Editar emisor',
      'Emisor',
      [
        'Nombre o razón social',
        'NIT',
        'Dirección',
        'Registro comercial',
        'Cuenta bancaria',
        'Sucursal bancaria',
      ],
      ['Dirección', 'Calle 9', (i) => i.seller.address],
    ],
    [
      'Editar documento',
      'Documento',
      ['Serie', 'Número', 'Fecha de emisión', 'Moneda'],
      ['Número', '0007', (i) => i.number],
    ],
    [
      'Editar concepto',
      'Concepto',
      ['Concepto de la operación'],
      ['Concepto de la operación', 'Venta', (i) => i.concept],
    ],
    [
      'Editar totales',
      'Totales',
      ['Descuento', 'Envío', 'Nombre del impuesto', 'Porcentaje del impuesto'],
      ['Porcentaje del impuesto', '10', (i) => i.tax.percent],
    ],
    ['Editar notas', 'Notas', ['Notas'], ['Notas', 'Entregar antes del lunes', (i) => i.notes]],
    [
      'Editar condiciones y QR',
      'Condiciones y QR',
      ['Términos'],
      ['Términos', 'Pago a 30 días', (i) => i.terms],
    ],
    [
      'Editar transportista',
      'Transportista',
      ['Nombre', 'Carné de identidad', 'Matrícula', 'Carta de porte', 'Casilla del ferrocarril'],
      ['Matrícula', 'P123456', (i) => i.carrier.plate],
    ],
    [
      'Editar firmas',
      'Firmas',
      ['Quien entrega', 'Quien recibe', 'Transportador', 'Quien contabiliza'],
      ['Quien recibe', 'Luis', (i) => i.signatures.receives],
    ],
  ];

  it.each(SHEETS)(
    'opens its sheet from %s and edits the invoice there',
    async (name, heading, labels, edit) => {
      await openZone(name);

      expect(visibleText(sheet()?.querySelector('h2'))).toBe(heading);
      expect(
        Array.from(sheet()?.querySelectorAll('app-sheet-field label') ?? []).map(visibleText),
      ).toEqual(labels);
      const [label, text, read] = edit;
      await type(label, text);
      expect(read(store.invoice())).toBe(text);
    },
  );

  it('puts the logo in the seller sheet and the payment QR codes in the terms sheet', async () => {
    await openZone('Editar emisor');
    expect(sheet()?.querySelector('input[type="file"][aria-label="Subir logo"]')).not.toBeNull();
    await closeSheet();

    await openZone('Editar condiciones y QR');
    expect(
      Array.from(sheet()?.querySelectorAll('input[type="file"]') ?? []).map((input) =>
        input.getAttribute('aria-label'),
      ),
    ).toEqual(['Subir QR Transfermóvil', 'Subir QR EnZona']);
  });

  it('uses full-size text areas for the free text, and decimal keyboards for amounts', async () => {
    await openZone('Editar notas');
    expect(field('Notas')?.tagName).toBe('TEXTAREA');
    await closeSheet();

    await openZone('Editar totales');
    for (const label of ['Descuento', 'Envío', 'Porcentaje del impuesto']) {
      expect(field(label)?.getAttribute('inputmode'), label).toBe('decimal');
    }
    await type('Descuento', '5');
    expect(visibleText(zone('Editar totales'))).toContain('Descuento 5.00');
  });

  it('picks the currency in the document sheet, asking for the exchange rate when it is not CUP', async () => {
    await openZone('Editar documento');
    expect(field('Fecha de emisión')?.type).toBe('date');
    const currency = field('Moneda') as unknown as HTMLSelectElement;
    expect(currency.tagName).toBe('SELECT');

    currency.value = 'USD';
    currency.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    await type('Tasa de cambio a CUP', '120');

    expect(store.invoice()).toMatchObject({ currency: 'USD', exchangeRate: '120' });
    expect(field('Tasa de cambio a CUP')?.getAttribute('inputmode')).toBe('decimal');
    expect(visibleText(zone('Editar documento'))).toContain('Moneda USD');
  });

  describe('lines', () => {
    function lineOf(description: string) {
      return { code: '', description, detail: '', unit: 'u', quantity: '1', unitPrice: '10' };
    }

    function button(text: string): HTMLButtonElement | undefined {
      return Array.from(element.querySelectorAll('button')).find((b) => visibleText(b) === text);
    }

    async function loadLines(...descriptions: string[]): Promise<void> {
      store.load({ ...createInvoice('lines-1'), lines: descriptions.map(lineOf) });
      await fixture.whenStable();
    }

    it('edits a line in its sheet, with the amount worked out live', async () => {
      await openZone('Editar renglón 1');

      expect(visibleText(sheet()?.querySelector('h2'))).toBe('Renglón 1');
      expect(
        Array.from(sheet()?.querySelectorAll('app-sheet-field label') ?? []).map(visibleText),
      ).toEqual(['Descripción', 'Cantidad', 'Unidad', 'Precio unitario', 'Código', 'Detalle']);
      expect(field('Cantidad')?.getAttribute('inputmode')).toBe('decimal');
      expect(field('Precio unitario')?.getAttribute('inputmode')).toBe('decimal');

      await type('Descripción', 'Pan');
      await type('Cantidad', '3');
      await type('Precio unitario', '2.5');

      expect(store.invoice().lines[0]).toMatchObject({
        description: 'Pan',
        quantity: '3',
        unitPrice: '2.5',
      });
      expect(visibleText(sheet()?.querySelector('.amount'))).toBe('Importe 7.50');
      expect(visibleText(zone('Editar renglón 1'))).toContain('Pan 3 u × 2.5 7.50');
    });

    it('adds a line from Añadir renglón and opens its sheet', async () => {
      button('Añadir renglón')?.click();
      await fixture.whenStable();

      expect(store.invoice().lines).toHaveLength(2);
      expect(zone('Editar renglón 2')).not.toBeNull();
      expect(visibleText(sheet()?.querySelector('h2'))).toBe('Renglón 2');
    });

    it('removes the line from Eliminar and puts focus on the line that takes its place', async () => {
      await loadLines('Pan', 'Galletas', 'Transporte');
      await openZone('Editar renglón 2');

      const remove = button('Eliminar');
      expect(remove?.closest('.footer')).not.toBeNull();
      remove?.click();
      await fixture.whenStable();

      expect(store.invoice().lines.map((line) => line.description)).toEqual(['Pan', 'Transporte']);
      expect(sheet()).toBeNull();
      expect(document.activeElement).toBe(zone('Editar renglón 2'));
      expect(visibleText(zone('Editar renglón 2'))).toContain('Transporte');
    });

    it('puts focus on Añadir renglón after removing the last line', async () => {
      await loadLines('Pan', 'Galletas');
      await openZone('Editar renglón 2');

      button('Eliminar')?.click();
      await fixture.whenStable();

      expect(store.invoice().lines).toHaveLength(1);
      expect(document.activeElement).toBe(button('Añadir renglón'));
    });
  });

  it('closes on Listo and gives focus back to the zone that opened it', async () => {
    const opener = await openZone('Editar comprador');

    Array.from(sheet()?.querySelectorAll('button') ?? [])
      .find((button) => visibleText(button) === 'Listo')
      ?.click();
    await fixture.whenStable();

    expect(sheet()).toBeNull();
    expect(document.activeElement).toBe(opener);
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

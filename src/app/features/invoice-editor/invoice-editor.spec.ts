import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectUrls } from '../../core/object-urls';
import { SettingsStore } from '../../core/settings-store';
import { InMemoryAssetStore } from '../../core/storage/in-memory-asset-store';
import { InMemoryPreferencesStore } from '../../core/storage/in-memory-preferences-store';
import { ASSET_STORE, PREFERENCES_STORE } from '../../core/storage/ports';
import { FakeObjectUrls } from '../../core/testing/fake-object-urls';
import { fieldElementId, type FieldId } from '../../domain/compliance';
import { createDefaultPreferences } from '../../domain/preferences';
import { createEmptyProfile } from '../../domain/seller-profile';
import { InvoiceEditor } from './invoice-editor';
import { InvoiceStore } from './invoice-store';

const LEGAL_TEXT =
  'Documento emitido conforme a la Resolución 55/2021 del Ministerio de Finanzas y Precios.';

const BLOCK_SELECTOR =
  'app-image-control, app-party-block, app-document-meta, app-text-block, app-line-items-table, ' +
  'app-totals-panel, app-payment-qr-controls, app-carrier-block, app-signatures-block, ' +
  'app-legal-footer';

/** Tag name plus, for the parametrised blocks, what they render, e.g. `app-party-block[buyer]`. */
function nameOf(block: Element): string {
  const tag = block.tagName.toLowerCase();
  if (tag === 'app-party-block') {
    const label = block.querySelector('input')?.getAttribute('aria-label') ?? '';
    return `${tag}[${label.endsWith('vendedor') ? 'seller' : 'buyer'}]`;
  }
  if (tag === 'app-text-block') {
    return `${tag}[${block.querySelector('p')?.textContent?.trim()}]`;
  }
  if (tag === 'app-image-control') {
    return `${tag}[${block.querySelector('input')?.getAttribute('aria-label')}]`;
  }
  return tag;
}

describe('InvoiceEditor', () => {
  let fixture: ComponentFixture<InvoiceEditor>;
  let element: HTMLElement;

  // The first render of the whole editor tree pays a one-off cost (module evaluation and the
  // first instantiation of a dozen components) that can exceed the per-test budget on a cold
  // full run; pay it here so no single spec depends on where it lands in the file.
  beforeAll(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceEditor],
      providers: [{ provide: ObjectUrls, useValue: new FakeObjectUrls() }],
    }).compileComponents();
    await TestBed.createComponent(InvoiceEditor).whenStable();
    TestBed.resetTestingModule();
  }, 30_000);

  async function render(
    preferences = new InMemoryPreferencesStore(),
    assets = new InMemoryAssetStore(),
  ): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [InvoiceEditor],
      providers: [
        { provide: PREFERENCES_STORE, useValue: preferences },
        { provide: ASSET_STORE, useValue: assets },
        { provide: ObjectUrls, useValue: new FakeObjectUrls() },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(InvoiceEditor);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  function sellerNameInput(): HTMLInputElement | null {
    return element.querySelector('input[aria-label="Nombre o razón social del vendedor"]');
  }

  it('composes every block in document order and ends with the legal footer', async () => {
    await render();

    expect(Array.from(element.querySelectorAll(BLOCK_SELECTOR)).map(nameOf)).toEqual([
      'app-image-control[Subir logo]',
      'app-party-block[seller]',
      'app-document-meta',
      'app-party-block[buyer]',
      'app-text-block[Concepto de la operación]',
      'app-line-items-table',
      'app-text-block[Notas]',
      'app-totals-panel',
      'app-text-block[Términos]',
      'app-payment-qr-controls',
      'app-image-control[Subir QR Transfermóvil]',
      'app-image-control[Subir QR EnZona]',
      'app-carrier-block',
      'app-signatures-block',
      'app-legal-footer',
    ]);
    expect(element.querySelector('article')?.lastElementChild?.tagName.toLowerCase()).toBe(
      'app-legal-footer',
    );
    expect(element.textContent).toContain(LEGAL_TEXT);
    expect(element.textContent).toContain(
      'las firmas pueden sustituirse por métodos criptográficos aprobados',
    );
  });

  it('gives every field the compliance panel can point at a control with its DOM id', async () => {
    await render();
    const targets: FieldId[] = [
      'issueDate',
      'series',
      'number',
      'concept',
      'seller.name',
      'seller.address',
      'seller.nit',
      'seller.commercialRegistry',
      'seller.bankAccount',
      'seller.bankBranch',
      'buyer.name',
      'buyer.address',
      'buyer.nit',
      'buyer.identityCard',
      'carrier.name',
      'carrier.identityCard',
      'carrier.plate',
      'lines.0.description',
      'lines.0.unit',
      'lines.0.quantity',
      'lines.0.unitPrice',
      'tax.name',
      'tax.percent',
      'signatures.delivers',
      'signatures.receives',
      'signatures.carrier',
      'signatures.books',
    ];

    const controls = targets.map((target) => element.querySelector(`#${fieldElementId(target)}`));

    expect(fieldElementId('lines.0.unitPrice')).toBe('field-lines-0-unit-price');
    expect(controls.map((control) => control?.tagName.toLowerCase())).toEqual(
      targets.map((target) => (target === 'concept' ? 'textarea' : 'input')),
    );
    const ids = Array.from(element.querySelectorAll('[id^="field-"]'), (control) => control.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Dating the invoice and filling the seller block from the profile happen at the shell's
  // startup together with the draft restore; see app.spec.ts.
  it('follows the sheet with the phone document, kept off paper, with its own field-free zones', async () => {
    await render();

    const sheet = element.querySelector('article.sheet');
    const phone = element.querySelector('app-phone-document');
    expect(sheet?.nextElementSibling).toBe(phone);
    expect(phone?.hasAttribute('data-print-hide')).toBe(true);
    // Only the sheet carries the field ids the compliance panel focuses, so no id is doubled.
    expect(phone?.querySelector('[id^="field-"]')).toBeNull();
  });

  it('leaves the seller block empty when nothing was remembered', async () => {
    await render();

    expect(sellerNameInput()?.value).toBe('');
  });

  it('keeps the logo next to the seller block and the QR codes in the terms band', async () => {
    await render();

    const logo = element.querySelector('app-image-control');
    expect(logo?.parentElement).toBe(element.querySelector('app-party-block')?.parentElement);
    expect(logo?.closest('.head')).not.toBeNull();
    expect(element.querySelector('app-payment-qr-controls')?.parentElement).toBe(
      element.querySelector('app-text-block.terms')?.parentElement,
    );
  });

  it('stores a chosen logo in the profile and shows it on the sheet', async () => {
    await render();
    const input = element.querySelector<HTMLInputElement>('input[aria-label="Subir logo"]');
    Object.defineProperty(input, 'files', {
      value: [new File(['png'], 'logo.png', { type: 'image/png' })],
      configurable: true,
    });

    input?.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();

    expect(element.querySelector('img[alt="Logo"]')?.getAttribute('src')).toMatch(/^blob:/);
    expect(TestBed.inject(SettingsStore).profile().logoAssetId).toEqual(expect.any(String));
    expect(TestBed.inject(InvoiceStore).invoice().logoAssetId).toEqual(expect.any(String));
  });

  it('shows the remembered images once rendered in the browser', async () => {
    const preferences = new InMemoryPreferencesStore();
    const assets = new InMemoryAssetStore();
    await assets.put('logo-1', new Blob(['png'], { type: 'image/png' }));
    await assets.put('qr-1', new Blob(['png'], { type: 'image/png' }));
    await preferences.saveProfile({
      ...createEmptyProfile(),
      logoAssetId: 'logo-1',
      enzonaQrAssetId: 'qr-1',
    });

    await render(preferences, assets);

    expect(element.querySelector('img[alt="Logo"]')?.getAttribute('src')).toMatch(/^blob:/);
    expect(element.querySelector('img[alt="QR EnZona"]')).not.toBeNull();
    expect(element.querySelector('img[alt="QR Transfermóvil"]')).toBeNull();
    expect(TestBed.inject(InvoiceStore).invoice().logoAssetId).toBe('logo-1');
  });

  describe('layout preferences', () => {
    function sheet(): HTMLElement | null {
      return element.querySelector<HTMLElement>('article.sheet');
    }

    it('marks the sheet spacious by default and compact once chosen', async () => {
      await render();
      expect(sheet()?.getAttribute('data-density')).toBe('spacious');

      TestBed.inject(SettingsStore).setDensity('compact');
      await fixture.whenStable();

      expect(sheet()?.getAttribute('data-density')).toBe('compact');
    });

    it('sizes the logo from the sheet, so it follows the density', async () => {
      await render();

      const logo = element.querySelector<HTMLElement>('app-image-control');
      expect(logo?.style.getPropertyValue('--size')).toBe('var(--logo-size, 64px)');
    });

    it('renders with the remembered density', async () => {
      const preferences = new InMemoryPreferencesStore();
      await preferences.savePreferences({ ...createDefaultPreferences(), density: 'compact' });

      await render(preferences);

      expect(sheet()?.getAttribute('data-density')).toBe('compact');
    });

    it.each([
      ['showCarrier', 'app-carrier-block'],
      ['showSignatures', 'app-signatures-block'],
      ['showPaymentQr', 'app-payment-qr-controls'],
    ] as const)('removes the section behind %s from the document and brings it back', async (flag, tag) => {
      await render();
      const settings = TestBed.inject(SettingsStore);
      expect(element.querySelector(tag)).not.toBeNull();

      settings.setSection(flag, false);
      await fixture.whenStable();
      expect(element.querySelector(tag)).toBeNull();

      settings.setSection(flag, true);
      await fixture.whenStable();
      expect(element.querySelector(tag)).not.toBeNull();
    });

    it('leaves no empty band behind a hidden section', async () => {
      const preferences = new InMemoryPreferencesStore();
      await preferences.savePreferences({
        ...createDefaultPreferences(),
        showCarrier: false,
        showSignatures: false,
      });

      await render(preferences);

      const bands = Array.from(element.querySelectorAll('.band'));
      expect(bands).toHaveLength(1);
      expect(bands[0]?.querySelector('app-text-block.terms')).not.toBeNull();
    });
  });
});

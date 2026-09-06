import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectUrls } from '../../core/object-urls';
import { InMemoryAssetStore } from '../../core/storage/in-memory-asset-store';
import { InMemoryPreferencesStore } from '../../core/storage/in-memory-preferences-store';
import { ASSET_STORE, PREFERENCES_STORE } from '../../core/storage/ports';
import { FakeObjectUrls } from '../../core/testing/fake-object-urls';
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
      'app-image-control[Subir QR de Transfermóvil]',
      'app-image-control[Subir QR de EnZona]',
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

  it('dates the invoice with today once rendered in the browser', async () => {
    await render();

    expect(TestBed.inject(InvoiceStore).invoice().issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('fills the seller block from the remembered profile once rendered in the browser', async () => {
    const preferences = new InMemoryPreferencesStore();
    await preferences.saveProfile({
      ...createEmptyProfile(),
      name: 'Taller Rodríguez',
      nit: '12345678901',
    });

    await render(preferences);

    expect(sellerNameInput()?.value).toBe('Taller Rodríguez');
    expect(TestBed.inject(InvoiceStore).invoice().seller.nit).toBe('12345678901');
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
});

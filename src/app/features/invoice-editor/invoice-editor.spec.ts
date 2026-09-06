import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InMemoryPreferencesStore } from '../../core/storage/in-memory-preferences-store';
import { PREFERENCES_STORE } from '../../core/storage/ports';
import { createEmptyProfile } from '../../domain/seller-profile';
import { InvoiceEditor } from './invoice-editor';
import { InvoiceStore } from './invoice-store';

const LEGAL_TEXT =
  'Documento emitido conforme a la Resolución 55/2021 del Ministerio de Finanzas y Precios.';

const BLOCK_SELECTOR =
  'app-party-block, app-document-meta, app-text-block, app-line-items-table, ' +
  'app-totals-panel, app-carrier-block, app-signatures-block, app-legal-footer';

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
  return tag;
}

describe('InvoiceEditor', () => {
  let fixture: ComponentFixture<InvoiceEditor>;
  let element: HTMLElement;

  async function render(preferences = new InMemoryPreferencesStore()): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [InvoiceEditor],
      providers: [{ provide: PREFERENCES_STORE, useValue: preferences }],
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
      'app-party-block[seller]',
      'app-document-meta',
      'app-party-block[buyer]',
      'app-text-block[Concepto de la operación]',
      'app-line-items-table',
      'app-text-block[Notas]',
      'app-totals-panel',
      'app-text-block[Términos]',
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
});

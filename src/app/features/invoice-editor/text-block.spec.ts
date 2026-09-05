import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InvoiceStore } from './invoice-store';
import { TextBlock, type TextBlockKind } from './text-block';

@Component({
  imports: [TextBlock],
  template: `<app-text-block [kind]="kind()" />`,
})
class Host {
  readonly kind = input.required<TextBlockKind>();
}

describe('TextBlock', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;
  let store: InvoiceStore;

  async function render(kind: TextBlockKind): Promise<void> {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput('kind', kind);
    element = fixture.nativeElement as HTMLElement;
    store = TestBed.inject(InvoiceStore);
    await fixture.whenStable();
  }

  function textarea(): HTMLTextAreaElement {
    const found = element.querySelector('textarea');
    if (!found) {
      throw new Error('No textarea rendered');
    }
    return found;
  }

  async function type(text: string): Promise<void> {
    textarea().value = text;
    textarea().dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  it('renders the concept with its eyebrow and label and writes to the store', async () => {
    await render('concept');

    expect(element.querySelector('p')?.textContent?.trim()).toBe('Concepto de la operación');
    expect(textarea().getAttribute('aria-label')).toBe('Concepto de la operación');
    expect(textarea().rows).toBe(3);

    await type('Venta de mercancías');
    expect(store.invoice().concept).toBe('Venta de mercancías');
  });

  it('renders the notes and writes to the store', async () => {
    await render('notes');

    expect(element.querySelector('p')?.textContent?.trim()).toBe('Notas');
    expect(textarea().getAttribute('aria-label')).toBe('Notas');
    expect(textarea().rows).toBe(4);

    await type('Entrega parcial');
    expect(store.invoice().notes).toBe('Entrega parcial');
  });

  it('renders the terms and writes to the store', async () => {
    await render('terms');

    expect(element.querySelector('p')?.textContent?.trim()).toBe('Términos');
    expect(textarea().getAttribute('aria-label')).toBe('Términos');
    expect(textarea().rows).toBe(4);

    await type('Pago a 30 días');
    expect(store.invoice().terms).toBe('Pago a 30 días');
  });
});

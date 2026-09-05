import { Component, computed, inject, input } from '@angular/core';
import { InlineTextarea } from '../../shared/ui/inline-textarea';
import { InvoiceStore } from './invoice-store';

/** The free-text fields of the invoice, each a scalar on the model. */
export type TextBlockKind = 'concept' | 'notes' | 'terms';

interface TextLayout {
  title: string;
  placeholder: string;
  rows: number;
}

const LAYOUTS: Record<TextBlockKind, TextLayout> = {
  concept: {
    title: 'Concepto de la operación',
    placeholder: 'Venta de mercancías, prestación de servicios, devolución…',
    rows: 3,
  },
  notes: {
    title: 'Notas',
    placeholder: 'Notas para el comprador: entrega parcial, garantía, número de contrato…',
    rows: 4,
  },
  terms: {
    title: 'Términos',
    placeholder: 'Términos de pago, plazo, condiciones de devolución…',
    rows: 4,
  },
};

/** An eyebrow plus a multiline field bound to one of the invoice text fields. */
@Component({
  selector: 'app-text-block',
  imports: [InlineTextarea],
  template: `
    <p class="eyebrow">{{ layout().title }}</p>
    <app-inline-textarea
      class="text"
      [label]="layout().title"
      [placeholder]="layout().placeholder"
      [rows]="layout().rows"
      [value]="store.invoice()[kind()]"
      (valueChange)="store.setField(kind(), $event)"
    />
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .text {
      color: var(--fg-2);
      font-size: 11px;
    }
  `,
})
export class TextBlock {
  protected readonly store = inject(InvoiceStore);
  readonly kind = input.required<TextBlockKind>();

  protected readonly layout = computed(() => LAYOUTS[this.kind()]);
}

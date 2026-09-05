import { Component, inject } from '@angular/core';
import type { Signatures } from '../../domain/invoice';
import { InlineInput } from '../../shared/ui/inline-input';
import { InvoiceStore } from './invoice-store';

interface SignatureLine {
  field: keyof Signatures;
  label: string;
  caption: string;
}

const LINES: SignatureLine[] = [
  { field: 'delivers', label: 'Firma: entrega', caption: 'Entrega · fecha' },
  { field: 'receives', label: 'Firma: recibe', caption: 'Recibe · fecha' },
  { field: 'carrier', label: 'Firma: transportador', caption: 'Transportador · fecha' },
  { field: 'books', label: 'Firma: contabiliza', caption: 'Contabiliza · fecha' },
];

/** Four signature lines: who delivers, receives, transports and books the invoice. */
@Component({
  selector: 'app-signatures-block',
  imports: [InlineInput],
  template: `
    @for (line of lines; track line.field) {
      <div class="cell">
        <app-inline-input
          class="line"
          [label]="line.label"
          placeholder="Nombre"
          [value]="store.invoice().signatures[line.field]"
          (valueChange)="store.updateSignature(line.field, $event)"
        />
        <p class="caption">{{ line.caption }}</p>
      </div>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: var(--sp-3);
    }

    .line {
      border-bottom: 1px solid var(--border-2);
      font-size: 11px;
    }

    .caption {
      margin: 3px 0 0;
      color: var(--fg-3);
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  `,
})
export class SignaturesBlock {
  protected readonly store = inject(InvoiceStore);
  protected readonly lines = LINES;
}

import { Component, inject } from '@angular/core';
import type { Carrier } from '../../domain/invoice';
import { InlineInput } from '../../shared/ui/inline-input';
import { InvoiceStore } from './invoice-store';

interface CarrierField {
  field: keyof Carrier;
  label: string;
  placeholder: string;
}

const FIELDS: CarrierField[] = [
  { field: 'name', label: 'Nombre del transportista', placeholder: 'Nombre' },
  {
    field: 'identityCard',
    label: 'Carné de identidad del transportista',
    placeholder: 'Carné de identidad',
  },
  { field: 'plate', label: 'Matrícula del vehículo', placeholder: 'Matrícula' },
  { field: 'waybill', label: 'Carta de porte', placeholder: 'Carta de porte' },
  { field: 'railwayBox', label: 'Casilla del ferrocarril', placeholder: 'Casilla del ferrocarril' },
];

/** The carrier block: one wrapping row of transport identifiers. */
@Component({
  selector: 'app-carrier-block',
  imports: [InlineInput],
  template: `
    <p class="eyebrow">Transportista</p>
    <div class="fields">
      @for (item of fields; track item.field) {
        <app-inline-input
          class="field"
          [label]="item.label"
          [placeholder]="item.placeholder"
          [value]="store.invoice().carrier[item.field]"
          (valueChange)="store.updateCarrier(item.field, $event)"
        />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .eyebrow {
      margin: 0 0 3px;
      color: var(--fg-3);
      font-size: 9px;
      font-weight: var(--fw-bold);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .fields {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
    }

    .field {
      flex: 1;
      min-width: 110px;
      font-size: 11px;
    }
  `,
})
export class CarrierBlock {
  protected readonly store = inject(InvoiceStore);
  protected readonly fields = FIELDS;
}

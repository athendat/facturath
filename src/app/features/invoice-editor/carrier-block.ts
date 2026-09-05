import { Component, inject } from '@angular/core';
import type { Carrier } from '../../domain/invoice';
import { InlineInput } from '../../shared/ui/inline-input';
import type { FieldSpec } from './field-spec';
import { InvoiceStore } from './invoice-store';

const FIELDS: FieldSpec<Carrier>[] = [
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
      @for (field of fields; track field.field) {
        <app-inline-input
          class="field"
          [label]="field.label"
          [placeholder]="field.placeholder"
          [value]="store.invoice().carrier[field.field]"
          (valueChange)="store.updateCarrier(field.field, $event)"
        />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
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

    @media print {
      :host {
        break-inside: avoid;
      }

      .field.blank {
        display: none;
      }
    }
  `,
})
export class CarrierBlock {
  protected readonly store = inject(InvoiceStore);
  protected readonly fields = FIELDS;
}

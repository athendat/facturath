import { Component, computed, inject, input } from '@angular/core';
import type { Party, PartyRole } from '../../domain/invoice';
import { InlineInput } from '../../shared/ui/inline-input';
import { InvoiceStore } from './invoice-store';

interface PartyField {
  field: keyof Party;
  label: string;
  placeholder: string;
}

interface PartyLayout {
  /** Section eyebrow; the seller has none because it opens the document. */
  eyebrow: string | null;
  name: PartyField;
  address: PartyField;
  details: PartyField[];
}

const LAYOUTS: Record<PartyRole, PartyLayout> = {
  seller: {
    eyebrow: null,
    name: {
      field: 'name',
      label: 'Nombre o razón social del vendedor',
      placeholder: 'Tu nombre o razón social',
    },
    address: { field: 'address', label: 'Dirección del vendedor', placeholder: 'Dirección' },
    details: [
      { field: 'nit', label: 'NIT del vendedor', placeholder: 'NIT' },
      {
        field: 'commercialRegistry',
        label: 'Registro comercial del vendedor',
        placeholder: 'Registro comercial / REEUP / licencia',
      },
      {
        field: 'bankAccount',
        label: 'Cuenta bancaria del vendedor',
        placeholder: 'Cuenta bancaria',
      },
      {
        field: 'bankBranch',
        label: 'Sucursal bancaria del vendedor',
        placeholder: 'Sucursal bancaria',
      },
    ],
  },
  buyer: {
    eyebrow: 'Comprador',
    name: {
      field: 'name',
      label: 'Nombre o razón social del comprador',
      placeholder: 'Nombre y apellidos o razón social',
    },
    address: { field: 'address', label: 'Dirección del comprador', placeholder: 'Dirección' },
    details: [
      { field: 'nit', label: 'NIT del comprador', placeholder: 'NIT' },
      {
        field: 'identityCard',
        label: 'Carné de identidad del comprador',
        placeholder: 'Carné de identidad',
      },
      {
        field: 'commercialRegistry',
        label: 'Registro comercial del comprador',
        placeholder: 'REEUP / registro comercial',
      },
      {
        field: 'bankAccount',
        label: 'Cuenta bancaria del comprador',
        placeholder: 'Cuenta bancaria',
      },
      {
        field: 'bankBranch',
        label: 'Sucursal bancaria del comprador',
        placeholder: 'Sucursal bancaria',
      },
    ],
  },
};

/** The seller or buyer block: name, address and a wrapping row of identifiers. */
@Component({
  selector: 'app-party-block',
  imports: [InlineInput],
  template: `
    @if (layout().eyebrow; as eyebrow) {
      <p class="eyebrow">{{ eyebrow }}</p>
    }
    <app-inline-input
      class="name"
      [label]="layout().name.label"
      [placeholder]="layout().name.placeholder"
      [value]="party().name"
      (valueChange)="store.updateParty(role(), 'name', $event)"
    />
    <app-inline-input
      class="address"
      [label]="layout().address.label"
      [placeholder]="layout().address.placeholder"
      [value]="party().address"
      (valueChange)="store.updateParty(role(), 'address', $event)"
    />
    <div class="details">
      @for (detail of layout().details; track detail.field) {
        <app-inline-input
          class="detail"
          [label]="detail.label"
          [placeholder]="detail.placeholder"
          [value]="party()[detail.field]"
          (valueChange)="store.updateParty(role(), detail.field, $event)"
        />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .eyebrow {
      margin: 0 0 3px;
      color: var(--fg-3);
      font-size: 9px;
      font-weight: var(--fw-bold);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .name {
      font-size: 13px;
      font-weight: var(--fw-bold);
    }

    :host(.seller) .name {
      font-size: 15px;
      letter-spacing: var(--tr-snug);
    }

    .address {
      color: var(--fg-2);
      font-size: 11px;
    }

    .details {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
    }

    .detail {
      flex: 1;
      min-width: 110px;
      font-size: 11px;
    }
  `,
  host: { '[class.seller]': 'role() === "seller"' },
})
export class PartyBlock {
  protected readonly store = inject(InvoiceStore);
  readonly role = input.required<PartyRole>();

  protected readonly layout = computed(() => LAYOUTS[this.role()]);
  protected readonly party = computed(() => this.store.invoice()[this.role()]);
}

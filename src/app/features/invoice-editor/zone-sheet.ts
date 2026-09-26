import { Component, computed, inject } from '@angular/core';
import { ImagesStore } from '../../core/images-store';
import { SettingsStore } from '../../core/settings-store';
import type { FieldId } from '../../domain/compliance';
import {
  CURRENCIES,
  isCurrency,
  type Carrier,
  type Invoice,
  type Party,
  type PartyRole,
  type Signatures,
} from '../../domain/invoice';
import { BottomSheet } from '../../shared/ui/bottom-sheet';
import { ImageControl } from '../../shared/ui/image-control';
import { SheetField } from '../../shared/ui/sheet-field';
import { InvoiceStore } from './invoice-store';
import { PaymentQrControls } from './payment-qr-controls';
import { ZoneSheets } from './zone-sheets';
import { sheetFieldId, type ZoneKey } from './zones';

/** One field of a sheet: what it shows and where an edit goes. */
interface SheetFieldSpec extends FieldOptions {
  id: string;
  label: string;
  value: string;
  set: (value: string) => void;
}

interface FieldOptions {
  inputMode?: 'numeric' | 'decimal';
  type?: 'date';
  multiline?: boolean;
  options?: readonly string[];
}

const HEADINGS: Partial<Record<ZoneKey, string>> = {
  seller: 'Emisor',
  document: 'Documento',
  buyer: 'Comprador',
  concept: 'Concepto',
  totals: 'Totales',
  notes: 'Notas',
  carrier: 'Transportista',
  signatures: 'Firmas',
};

const PARTY_LABELS: [keyof Party, string, 'numeric'?][] = [
  ['name', 'Nombre o razón social'],
  ['nit', 'NIT', 'numeric'],
  ['identityCard', 'Carné de identidad', 'numeric'],
  ['address', 'Dirección'],
  ['commercialRegistry', 'Registro comercial'],
  ['bankAccount', 'Cuenta bancaria', 'numeric'],
  ['bankBranch', 'Sucursal bancaria'],
];

const CARRIER_LABELS: [keyof Carrier, string, 'numeric'?][] = [
  ['name', 'Nombre'],
  ['identityCard', 'Carné de identidad', 'numeric'],
  ['plate', 'Matrícula'],
  ['waybill', 'Carta de porte'],
  ['railwayBox', 'Casilla del ferrocarril'],
];

const SIGNATURE_LABELS: [keyof Signatures, string][] = [
  ['delivers', 'Quien entrega'],
  ['receives', 'Quien recibe'],
  ['carrier', 'Transportador'],
  ['books', 'Quien contabiliza'],
];

/**
 * The bottom sheet of the open zone (#64), with full-size fields for its part of the
 * invoice. Every edit goes straight to the invoice store, so the zone, the totals and the
 * Res. 55 seal follow at once and the draft autosave keeps it as it keeps inline edits.
 */
@Component({
  selector: 'app-zone-sheet',
  imports: [BottomSheet, ImageControl, PaymentQrControls, SheetField],
  template: `
    <app-bottom-sheet
      [open]="zone() !== null"
      (openChange)="onOpenChange($event)"
      [heading]="heading()"
    >
      <div class="fields">
        @if (zone() === 'seller') {
          <app-image-control
            kind="logo"
            [url]="images.urlFor(invoice().logoAssetId)"
            (fileChosen)="images.set('logo', $event)"
            (removed)="images.remove('logo')"
          />
        }
        @for (field of fields(); track field.id) {
          <app-sheet-field
            [inputId]="field.id"
            [label]="field.label"
            [value]="field.value"
            [inputMode]="field.inputMode ?? null"
            [type]="field.type ?? 'text'"
            [multiline]="field.multiline ?? false"
            [options]="field.options ?? null"
            (valueChange)="field.set($event)"
          />
        }
        @if (zone() === 'terms' && settings.showPaymentQr()) {
          <app-payment-qr-controls />
        }
      </div>
    </app-bottom-sheet>
  `,
  styles: `
    .fields {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
  `,
})
export class ZoneSheet {
  private readonly store = inject(InvoiceStore);
  private readonly sheets = inject(ZoneSheets);
  protected readonly settings = inject(SettingsStore);
  protected readonly images = inject(ImagesStore);

  protected readonly zone = this.sheets.current;
  protected readonly invoice = this.store.invoice;

  protected readonly heading = computed(() => {
    const zone = this.zone();
    if (zone === 'terms') {
      return this.settings.showPaymentQr() ? 'Condiciones y QR' : 'Condiciones';
    }
    return zone === null ? '' : (HEADINGS[zone] ?? '');
  });

  protected readonly fields = computed<SheetFieldSpec[]>(() => {
    const invoice = this.invoice();
    switch (this.zone()) {
      case 'seller':
        return this.party('seller', invoice);
      case 'buyer':
        return this.party('buyer', invoice);
      case 'document':
        return this.documentFields(invoice);
      case 'concept':
        return [this.text('concept', 'Concepto de la operación', invoice, 'concept')];
      case 'totals':
        return this.totalsFields(invoice);
      case 'notes':
        return [this.text('notes', 'Notas', invoice)];
      case 'terms':
        return [this.text('terms', 'Términos', invoice)];
      case 'carrier':
        return CARRIER_LABELS.map(([key, label, inputMode]) =>
          this.field(`carrier.${key}`, label, invoice.carrier[key], { inputMode }, (value) =>
            this.store.updateCarrier(key, value),
          ),
        );
      case 'signatures':
        return SIGNATURE_LABELS.map(([key, label]) =>
          this.field(`signatures.${key}`, label, invoice.signatures[key], {}, (value) =>
            this.store.updateSignature(key, value),
          ),
        );
      default:
        return [];
    }
  });

  protected onOpenChange(open: boolean): void {
    if (!open) {
      this.sheets.close();
    }
  }

  /** The seller has no identity card field: a seller identifies by NIT. */
  private party(role: PartyRole, invoice: Invoice): SheetFieldSpec[] {
    return PARTY_LABELS.filter(([key]) => role === 'buyer' || key !== 'identityCard').map(
      ([key, label, inputMode]) =>
        this.field(`${role}.${key}`, label, invoice[role][key], { inputMode }, (value) =>
          this.store.updateParty(role, key, value),
        ),
    );
  }

  private documentFields(invoice: Invoice): SheetFieldSpec[] {
    const fields: SheetFieldSpec[] = [
      this.field('series', 'Serie', invoice.series, {}, (value) =>
        this.store.setField('series', value),
      ),
      this.field('number', 'Número', invoice.number, { inputMode: 'numeric' }, (value) =>
        this.store.setField('number', value),
      ),
      this.field('issueDate', 'Fecha de emisión', invoice.issueDate, { type: 'date' }, (value) =>
        this.store.setField('issueDate', value),
      ),
      {
        id: 'sheet-field-currency',
        label: 'Moneda',
        value: invoice.currency,
        options: CURRENCIES,
        set: (value) => {
          if (isCurrency(value)) {
            this.store.setField('currency', value);
          }
        },
      },
    ];
    if (this.store.needsExchangeRate()) {
      fields.push(this.scalar('exchangeRate', 'Tasa de cambio a CUP', invoice.exchangeRate));
    }
    return fields;
  }

  private totalsFields(invoice: Invoice): SheetFieldSpec[] {
    return [
      this.scalar('discount', 'Descuento', invoice.discount),
      this.scalar('shipping', 'Envío', invoice.shipping),
      this.field('tax.name', 'Nombre del impuesto', invoice.tax.name, {}, (value) =>
        this.store.updateTax('name', value),
      ),
      this.field(
        'tax.percent',
        'Porcentaje del impuesto',
        invoice.tax.percent,
        { inputMode: 'decimal' },
        (value) => this.store.updateTax('percent', value),
      ),
    ];
  }

  /** A field the compliance rules can point at, so its id follows its field id. */
  private field(
    fieldId: FieldId,
    label: string,
    value: string,
    options: FieldOptions,
    set: (value: string) => void,
  ): SheetFieldSpec {
    return { id: sheetFieldId(fieldId), label, value, set, ...options };
  }

  /** An amount of the invoice no compliance rule points at, typed with decimals. */
  private scalar(
    key: 'discount' | 'shipping' | 'exchangeRate',
    label: string,
    value: string,
  ): SheetFieldSpec {
    return {
      id: `sheet-field-${key}`,
      label,
      value,
      inputMode: 'decimal',
      set: (next) => this.store.setField(key, next),
    };
  }

  /** A free-text field, as a textarea. */
  private text(
    key: 'concept' | 'notes' | 'terms',
    label: string,
    invoice: Invoice,
    fieldId?: FieldId,
  ): SheetFieldSpec {
    return {
      id: fieldId ? sheetFieldId(fieldId) : `sheet-field-${key}`,
      label,
      value: invoice[key],
      multiline: true,
      set: (value) => this.store.setField(key, value),
    };
  }
}

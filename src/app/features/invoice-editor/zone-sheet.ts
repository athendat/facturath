import { Component, DOCUMENT, Injector, afterNextRender, computed, inject } from '@angular/core';
import { ImagesStore } from '../../core/images-store';
import { SettingsStore } from '../../core/settings-store';
import type { FieldId } from '../../domain/compliance';
import {
  CURRENCIES,
  isCurrency,
  type Carrier,
  type Invoice,
  type LineItem,
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

const LINE_LABELS: [keyof LineItem, string, 'decimal'?][] = [
  ['description', 'Descripción'],
  ['quantity', 'Cantidad', 'decimal'],
  ['unit', 'Unidad'],
  ['unitPrice', 'Precio unitario', 'decimal'],
  ['code', 'Código'],
  ['detail', 'Detalle'],
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
        @if (lineIndex(); as index) {
          <p class="amount">
            <span>Importe</span>&ngsp;<span class="value">{{
              store.lineAmounts()[index - 1]
            }}</span>
          </p>
        }
        @if (zone() === 'terms' && settings.showPaymentQr()) {
          <app-payment-qr-controls />
        }
      </div>
      @if (lineIndex(); as index) {
        <button type="button" class="remove" sheetAction (click)="removeLine(index - 1)">
          Eliminar
        </button>
      }
    </app-bottom-sheet>
  `,
  styles: `
    .fields {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .amount {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin: 0;
      padding: var(--sp-3);
      border-radius: var(--radius-sm);
      background: var(--bg-1);
      color: var(--fg-2);
      font-size: var(--fs-14);
    }

    .value {
      color: var(--fg-1);
      font-size: var(--fs-20);
      font-weight: var(--fw-bold);
      font-variant-numeric: tabular-nums;
    }

    .remove {
      min-height: 48px;
      padding: 0 18px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--danger-fg);
      font-size: 15px;
      font-weight: var(--fw-bold);
      cursor: pointer;
    }

    .remove:hover,
    .remove:active {
      background: var(--danger-bg);
    }

    .remove:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 2px;
    }
  `,
})
export class ZoneSheet {
  protected readonly store = inject(InvoiceStore);
  private readonly sheets = inject(ZoneSheets);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  protected readonly settings = inject(SettingsStore);
  protected readonly images = inject(ImagesStore);

  protected readonly zone = this.sheets.current;
  protected readonly invoice = this.store.invoice;

  /** The open line, counted from 1 so it is truthy in the template; null for any other zone. */
  protected readonly lineIndex = computed(() => {
    const match = /^line-(\d+)$/.exec(this.zone() ?? '');
    return match ? Number(match[1]) + 1 : null;
  });

  protected readonly heading = computed(() => {
    const zone = this.zone();
    const line = this.lineIndex();
    if (line !== null) {
      return `Renglón ${line}`;
    }
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
        return this.lineFields(invoice);
    }
  });

  protected onOpenChange(open: boolean): void {
    if (!open) {
      this.sheets.close();
    }
  }

  /**
   * Removes the line and closes the sheet. Focus goes to the line that takes its place, or
   * to Añadir renglón when it was the last; it runs after the drawer hands focus back to
   * the opener, which may be the zone of the line just removed.
   */
  protected removeLine(index: number): void {
    this.store.removeLine(index);
    this.sheets.close();
    const target = index < this.invoice().lines.length ? `zone-line-${index}` : 'add-line';
    afterNextRender(() => this.document.getElementById(target)?.focus(), {
      injector: this.injector,
    });
  }

  private lineFields(invoice: Invoice): SheetFieldSpec[] {
    const line = this.lineIndex();
    if (line === null) {
      return [];
    }
    const index = line - 1;
    return LINE_LABELS.map(([key, label, inputMode]) => ({
      id:
        key === 'code' || key === 'detail'
          ? `sheet-field-line-${key}`
          : sheetFieldId(`lines.${index}.${key}`),
      label,
      value: invoice.lines[index]?.[key] ?? '',
      inputMode,
      set: (value: string) => this.store.updateLine(index, key, value),
    }));
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

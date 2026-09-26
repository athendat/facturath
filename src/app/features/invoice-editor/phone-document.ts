import { Component, computed, inject } from '@angular/core';
import { ImagesStore } from '../../core/images-store';
import { SettingsStore } from '../../core/settings-store';
import { formatIsoDate, formatReference } from '../../domain/format';
import { Icon } from '../../shared/ui/icon';
import { ZoneButton } from '../../shared/ui/zone-button';
import { InvoiceStore } from './invoice-store';
import { ZoneSheet } from './zone-sheet';
import { ZoneSheets } from './zone-sheets';
import { pendingByZone, type ZoneKey } from './zones';

/** `NIT 0123 · Calle 23`: the filled parts of a summary line, joined. */
function joined(...parts: string[]): string {
  return parts.filter((part) => part !== '').join(' · ');
}

/**
 * The invoice on a phone screen (#64): one white sheet of tappable zones in document order,
 * each a read-only summary of its part. Below 640px it replaces the inline sheet on screen;
 * the inline sheet stays what prints, so this never reaches paper.
 */
@Component({
  selector: 'app-phone-document',
  imports: [Icon, ZoneButton, ZoneSheet],
  template: `
    <article class="doc" aria-labelledby="phone-document-title">
      <h1 id="phone-document-title" class="sr-only">Factura</h1>
      <app-zone-button
        key="seller"
        (activated)="sheets.open('seller')"
        name="Editar emisor"
        [note]="notes().get('seller')"
      >
        <span class="issuer">
          @if (logoUrl(); as src) {
            <img class="logo" [src]="src" alt="" />
          } @else if (initials() !== '') {
            <span class="logo initials">{{ initials() }}</span
            >&ngsp;
          }
          <span class="stack">
            @if (invoice().seller.name !== '') {
              <span class="title">{{ invoice().seller.name }}</span
              >&ngsp;
            } @else {
              <span class="hint">Toca para escribir tus datos</span>&ngsp;
            }
            <span class="sub">{{ sellerLine() }}</span>
          </span>
        </span>
      </app-zone-button>
      <app-zone-button
        class="head"
        key="document"
        (activated)="sheets.open('document')"
        name="Editar documento"
        [note]="notes().get('document')"
      >
        <span class="cols">
          <span class="col"
            ><span class="label">Número</span>&ngsp;<span class="num">{{ reference() }}</span></span
          >&ngsp;
          <span class="col"
            ><span class="label">Fecha</span>&ngsp;<span class="num">{{ date() }}</span></span
          >&ngsp;
          <span class="col"
            ><span class="label">Moneda</span>&ngsp;<span class="num">{{
              invoice().currency
            }}</span></span
          >
        </span>
      </app-zone-button>
      <app-zone-button
        key="buyer"
        (activated)="sheets.open('buyer')"
        name="Editar comprador"
        [note]="notes().get('buyer')"
      >
        <span class="label">Comprador</span>&ngsp;
        <span class="title">{{ invoice().buyer.name || 'Sin nombre' }}</span
        >&ngsp;
        <span class="sub">{{ buyerLine() }}</span>
      </app-zone-button>
      <app-zone-button
        key="concept"
        (activated)="sheets.open('concept')"
        name="Editar concepto"
        [note]="notes().get('concept')"
      >
        <span class="label">Concepto de la operación</span>&ngsp;
        <span class="text">{{ invoice().concept }}</span
        >&ngsp;
        @if (invoice().concept === '') {
          <span class="hint">Toca para escribir el concepto</span>
        }
      </app-zone-button>
      <div class="lines">
        <p class="lines-head" aria-hidden="true">
          <span class="label">Productos y servicios</span><span class="label">Importe</span>
        </p>
        @for (line of invoice().lines; track $index) {
          <app-zone-button
            [key]="lineKey($index)"
            (activated)="sheets.open(lineKey($index))"
            [name]="'Editar renglón ' + ($index + 1)"
            [note]="notes().get(lineKey($index))"
          >
            <span class="line">
              <span class="stack">
                <span class="title">{{ line.description || 'Renglón sin descripción' }}</span
                >&ngsp;
                <span class="sub num"
                  >{{ line.quantity || '0' }} {{ line.unit }} × {{ line.unitPrice || '0' }}</span
                > </span
              >&ngsp;
              <span class="amount num">{{ store.lineAmounts()[$index] }}</span>
            </span>
          </app-zone-button>
        }
        <button type="button" id="add-line" class="add" (click)="addLine($event)">
          <app-icon name="new" /> Añadir renglón
        </button>
      </div>
      <app-zone-button
        key="totals"
        (activated)="sheets.open('totals')"
        name="Editar totales"
        [note]="notes().get('totals')"
      >
        <span class="row"
          ><span>Subtotal</span>&ngsp;<span class="num">{{ store.totals().subtotal }}</span></span
        >&ngsp;
        <span class="row"
          ><span>Descuento</span>&ngsp;<span class="num">{{ store.totals().discount }}</span></span
        >&ngsp;
        <span class="row"
          ><span>Envío</span>&ngsp;<span class="num">{{ store.totals().shipping }}</span></span
        >&ngsp;
        <span class="row"
          ><span>{{ taxLabel() }}</span
          >&ngsp;<span class="num">{{ store.totals().tax }}</span></span
        >&ngsp;
        <span class="row total">
          <span>Total {{ invoice().currency }}</span
          >&ngsp;<span class="num">{{ store.totalAmount() }}</span>
        </span>
      </app-zone-button>
      <app-zone-button key="notes" (activated)="sheets.open('notes')" name="Editar notas">
        <span class="label">Notas</span>&ngsp; <span class="text">{{ invoice().notes }}</span
        >&ngsp;
        @if (invoice().notes === '') {
          <span class="hint">Toca para añadir notas</span>
        }
      </app-zone-button>
      <app-zone-button key="terms" (activated)="sheets.open('terms')" [name]="termsName()">
        <span class="label">{{ termsTitle() }}</span
        >&ngsp; <span class="text">{{ invoice().terms }}</span
        >&ngsp;
        @if (invoice().terms === '') {
          <span class="hint">Toca para añadir condiciones de pago</span>
        }
      </app-zone-button>
      @if (settings.showCarrier()) {
        <app-zone-button
          key="carrier"
          (activated)="sheets.open('carrier')"
          name="Editar transportista"
          [note]="notes().get('carrier')"
        >
          <span class="label">Transportista</span>&ngsp;
          <span class="text">{{ carrierLine() }}</span>
        </app-zone-button>
      }
      @if (settings.showSignatures()) {
        <app-zone-button
          key="signatures"
          (activated)="sheets.open('signatures')"
          name="Editar firmas"
          [note]="notes().get('signatures')"
        >
          <span class="label">Firmas</span>&ngsp;
          <span class="text">{{ signaturesLine() }}</span>
        </app-zone-button>
      }
    </article>
    <!-- The sheets are a chunk of their own, fetched the first time a zone opens. -->
    @defer (when sheets.current() !== null) {
      <app-zone-sheet />
    }
  `,
  styles: `
    :host {
      display: none;
    }

    @media screen and (max-width: 639.98px) {
      :host {
        display: block;
      }
    }

    .doc {
      padding: 6px 4px 14px;
      border: 1px solid var(--border-1);
      border-radius: var(--radius-xs);
      background: var(--bg-0);
      box-shadow: var(--shadow-sm);
      font-size: 14px;
      line-height: 1.3;
    }

    .doc > * + * {
      border-top: 1px solid var(--border-1);
    }

    .doc > h1 + * {
      border-top: 0;
    }

    .doc > .head {
      border-top: 2px solid var(--gray-900);
    }

    /* --fg-3 is 4.45:1 on the --gem-50 of a pressed zone, below AA; --gray-600 stays above 7:1. */
    .label {
      color: var(--gray-600);
      font-size: 11px;
      font-weight: var(--fw-bold);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .title {
      font-size: 16px;
      font-weight: var(--fw-bold);
    }

    .sub,
    .text {
      color: var(--fg-2);
      font-size: 13px;
    }

    .text {
      display: -webkit-box;
      overflow: hidden;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
    }

    .hint {
      color: var(--gray-600);
      font-size: 13px;
    }

    .sub:empty,
    .text:empty {
      display: none;
    }

    .num {
      font-variant-numeric: tabular-nums;
    }

    .issuer,
    .line {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
    }

    .stack {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .logo {
      flex: none;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
      object-fit: contain;
    }

    .initials {
      display: grid;
      place-items: center;
      background: var(--gem-50);
      color: var(--gem-900);
      font-size: 13px;
      font-weight: var(--fw-black);
    }

    .cols {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--sp-2);
    }

    .col {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .lines-head {
      display: flex;
      justify-content: space-between;
      margin: 0;
      padding: var(--sp-3) 46px var(--sp-1) 14px;
    }

    .line .title {
      font-size: 15px;
      font-weight: var(--fw-medium);
    }

    .amount {
      font-size: 15px;
      font-weight: var(--fw-bold);
    }

    .add {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--sp-2);
      width: calc(100% - 28px);
      height: 48px;
      margin: var(--sp-2) 14px var(--sp-3);
      border: 1px dashed var(--border-control);
      border-radius: var(--radius-sm);
      background: var(--bg-0);
      color: var(--gem-900);
      font-size: 15px;
      font-weight: var(--fw-bold);
      cursor: pointer;
    }

    .add:active {
      background: var(--gem-50);
    }

    .add:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 2px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: var(--sp-2);
      color: var(--fg-2);
    }

    .total {
      margin-top: var(--sp-1);
      padding-top: 6px;
      border-top: 2px solid var(--gray-900);
      color: var(--fg-1);
      font-size: 16px;
      font-weight: var(--fw-bold);
    }
  `,
  host: { 'data-print-hide': '' },
})
export class PhoneDocument {
  protected readonly store = inject(InvoiceStore);
  protected readonly settings = inject(SettingsStore);
  protected readonly sheets = inject(ZoneSheets);
  private readonly images = inject(ImagesStore);

  protected readonly invoice = this.store.invoice;
  protected readonly notes = computed(() => pendingByZone(this.store.compliance()));

  /** Adds a line at the end and opens its sheet, which gives focus back to this button. */
  protected addLine(event: MouseEvent): void {
    // Safari on iOS does not focus a tapped button.
    (event.currentTarget as HTMLElement).focus();
    this.store.addLine();
    this.sheets.open(this.lineKey(this.invoice().lines.length - 1));
  }

  protected lineKey(index: number): ZoneKey {
    return `line-${index}`;
  }

  protected readonly logoUrl = computed(() => this.images.urlFor(this.invoice().logoAssetId));
  protected readonly initials = computed(() =>
    this.invoice()
      .seller.name.split(/\s+/)
      .filter((word) => word !== '')
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );

  protected readonly sellerLine = computed(() => {
    const { nit, address } = this.invoice().seller;
    return joined(nit && `NIT ${nit}`, address);
  });

  protected readonly buyerLine = computed(() => {
    const { nit, identityCard, address } = this.invoice().buyer;
    return joined(nit ? `NIT ${nit}` : identityCard && `CI ${identityCard}`, address);
  });

  protected readonly reference = computed(() =>
    formatReference(this.invoice().series, this.invoice().number),
  );
  protected readonly date = computed(() => formatIsoDate(this.invoice().issueDate) || '—');

  protected readonly taxLabel = computed(() => {
    const { name, percent } = this.invoice().tax;
    return `${name || 'Impuesto'} ${percent || '0'} %`;
  });

  protected readonly termsTitle = computed(() =>
    this.settings.showPaymentQr() ? 'Condiciones y QR' : 'Condiciones',
  );

  protected readonly termsName = computed(() =>
    this.settings.showPaymentQr() ? 'Editar condiciones y QR' : 'Editar condiciones',
  );

  protected readonly carrierLine = computed(() => {
    const { name, plate } = this.invoice().carrier;
    return joined(name, plate) || 'Nombre, carné y matrícula';
  });

  protected readonly signaturesLine = computed(
    () =>
      joined(...Object.values(this.invoice().signatures)) ||
      'Entrega, recibe, transporta y contabiliza',
  );
}

import { Component, inject } from '@angular/core';
import { CURRENCIES, type Currency } from '../../domain/invoice';
import { InlineInput } from '../../shared/ui/inline-input';
import { InvoiceStore } from './invoice-store';

@Component({
  selector: 'app-document-meta',
  imports: [InlineInput],
  template: `
    <p class="title">Factura</p>
    <div class="row">
      <span class="label">No.</span>
      <app-inline-input
        class="series"
        label="Serie"
        placeholder="A"
        [value]="store.invoice().series"
        (valueChange)="store.setField('series', $event)"
      />
      <span class="separator" aria-hidden="true">-</span>
      <app-inline-input
        class="number"
        label="Número"
        placeholder="0001"
        [value]="store.invoice().number"
        (valueChange)="store.setField('number', $event)"
      />
    </div>
    <div class="row">
      <span class="label">Moneda</span>
      <select class="currency" aria-label="Moneda" (change)="onCurrencyChange($event)">
        @for (currency of currencies; track currency) {
          <option [value]="currency" [selected]="currency === store.invoice().currency">
            {{ currency }}
          </option>
        }
      </select>
      @if (store.needsExchangeRate()) {
        <app-inline-input
          class="rate"
          label="Tasa de cambio a CUP"
          placeholder="Tasa"
          inputMode="decimal"
          [value]="store.invoice().exchangeRate"
          (valueChange)="store.setField('exchangeRate', $event)"
        />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      text-align: right;
    }

    .title {
      margin: 0 0 var(--sp-1);
      font-size: var(--fs-14);
      font-weight: var(--fw-black);
      letter-spacing: var(--tr-wide);
      text-transform: uppercase;
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 2px;
      padding: 1px 0;
    }

    .label,
    .separator {
      color: var(--fg-3);
    }

    .label {
      margin-right: var(--sp-1);
    }

    .series {
      width: 38px;
    }

    .number {
      width: 64px;
    }

    .rate {
      width: 56px;
      text-align: right;
    }

    .currency {
      padding: 2px 4px;
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      font: inherit;
      cursor: pointer;
    }

    .currency:hover {
      background: var(--gray-100);
    }

    .currency:focus {
      outline: none;
      background: var(--bg-0);
      box-shadow: var(--focus-ring);
    }
  `,
})
export class DocumentMeta {
  protected readonly store = inject(InvoiceStore);
  protected readonly currencies = CURRENCIES;

  protected onCurrencyChange(event: Event): void {
    this.store.setField('currency', (event.target as HTMLSelectElement).value as Currency);
  }
}

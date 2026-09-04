import { Component, inject } from '@angular/core';
import { InlineInput } from '../../shared/ui/inline-input';
import { InvoiceStore } from './invoice-store';

@Component({
  selector: 'app-totals-panel',
  imports: [InlineInput],
  template: `
    <div class="row">
      <span>Subtotal</span>
      <span class="value">{{ store.totals().subtotal }}</span>
    </div>
    <div class="row">
      <span>Descuento</span>
      <app-inline-input
        class="money"
        label="Descuento"
        placeholder="0.00"
        inputMode="decimal"
        [value]="store.invoice().discount"
        (valueChange)="store.setField('discount', $event)"
      />
    </div>
    <div class="row">
      <span>Envío</span>
      <app-inline-input
        class="money"
        label="Envío"
        placeholder="0.00"
        inputMode="decimal"
        [value]="store.invoice().shipping"
        (valueChange)="store.setField('shipping', $event)"
      />
    </div>
    <div class="row tax">
      <app-inline-input
        class="tax-name"
        label="Nombre del impuesto"
        placeholder="Impuesto"
        [value]="store.invoice().tax.name"
        (valueChange)="store.updateTax('name', $event)"
      />
      <app-inline-input
        class="tax-percent"
        label="Porcentaje del impuesto"
        placeholder="0"
        inputMode="decimal"
        [value]="store.invoice().tax.percent"
        (valueChange)="store.updateTax('percent', $event)"
      />
      <span class="percent">%</span>
      <span class="value">{{ store.totals().tax }}</span>
    </div>
    <div class="row total">
      <span class="total-label">Importe total</span>
      <span class="total-value">{{ store.totals().total }}</span>
    </div>
    @if (store.showsCupEquivalent()) {
      <p class="equivalent">
        Equivalente {{ store.totals().cupEquivalent }} · tasa {{ store.invoice().exchangeRate }}
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      max-width: 300px;
      margin-left: auto;
    }

    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-2);
      padding: 3px 0;
    }

    .value {
      font-weight: var(--fw-medium);
      text-align: right;
    }

    .money,
    .tax-percent {
      text-align: right;
    }

    .money {
      width: 96px;
    }

    .tax-name {
      flex: 1;
    }

    .tax-percent {
      width: 40px;
    }

    .percent {
      color: var(--fg-3);
    }

    .tax .value {
      min-width: 72px;
    }

    .total {
      margin-top: var(--sp-1);
      padding-top: var(--sp-2);
      border-top: 1px solid var(--border-1);
    }

    .total-label {
      font-size: 10px;
      font-weight: var(--fw-bold);
      letter-spacing: var(--tr-wide);
      text-transform: uppercase;
    }

    .total-value {
      font-size: 18px;
      font-weight: var(--fw-black);
      letter-spacing: var(--tr-snug);
    }

    .equivalent {
      margin: 0;
      color: var(--fg-3);
      font-size: 10px;
      text-align: right;
    }
  `,
})
export class TotalsPanel {
  protected readonly store = inject(InvoiceStore);
}

import { Component, input, output } from '@angular/core';
import { Icon } from './icon';

/**
 * The phone's sticky bottom bar (#64): the invoice total with its currency, an icon-only
 * Guardar and the primary PDF. The parent shows it only below 640px and keeps it off paper.
 */
@Component({
  selector: 'app-action-bar',
  imports: [Icon],
  template: `
    <p class="total">
      <span class="label">Total {{ currency() }}</span>&ngsp;<span class="amount">{{ amount() }}</span>
    </p>
    <button type="button" class="save" aria-label="Guardar" (click)="saved.emit()">
      <app-icon name="save" />
    </button>
    <button type="button" class="primary" (click)="printed.emit()">
      <app-icon name="print" /> PDF
    </button>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: var(--sp-3) var(--sp-3) calc(var(--sp-4) + env(safe-area-inset-bottom));
      border-top: 1px solid var(--border-1);
      background: var(--bg-0);
    }

    .total {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-width: 0;
      margin: 0;
    }

    .label {
      color: var(--gray-600);
      font-size: var(--fs-12);
    }

    .amount {
      font-size: var(--fs-20);
      font-weight: var(--fw-bold);
      font-variant-numeric: tabular-nums;
      letter-spacing: var(--tr-snug);
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--sp-2);
      height: 48px;
      border-radius: var(--radius-sm);
      font-size: 15px;
      font-weight: var(--fw-bold);
      cursor: pointer;
    }

    button app-icon {
      width: 20px;
      height: 20px;
    }

    .save {
      width: 48px;
      border: 1px solid var(--border-control);
      background: var(--bg-0);
      color: var(--gem-900);
    }

    .save:active {
      background: var(--bg-2);
    }

    .primary {
      padding: 0 18px;
      border: 0;
      background: var(--bg-brand);
      color: var(--fg-on-brand);
    }

    .primary:active {
      background: var(--gem-800);
    }

    button:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 2px;
    }
  `,
})
export class ActionBar {
  readonly currency = input.required<string>();
  /** The total as an amount alone; the currency shows in the label above it. */
  readonly amount = input.required<string>();
  readonly saved = output<void>();
  readonly printed = output<void>();
}

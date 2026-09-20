import { Component, Injector, afterNextRender, inject, model } from '@angular/core';
import { FieldFocus } from '../../core/field-focus';
import type { ComplianceEntry, ComplianceState } from '../../domain/compliance';
import { Drawer } from '../../shared/ui/drawer';
import { InvoiceStore } from './invoice-store';

const STATE_LABELS: Record<ComplianceState, string> = {
  fulfilled: 'Completo',
  pending: 'Pendiente',
  'not-applicable': 'No aplica',
};

/**
 * The 13 data points of Res. 55/2021 against the open invoice, each with its state and,
 * when pending, a button that closes the panel and puts the cursor on the missing field.
 * It only informs: printing is never gated on it.
 */
@Component({
  selector: 'app-compliance-panel',
  imports: [Drawer],
  template: `
    <app-drawer [(open)]="open" heading="Datos obligatorios">
      <p class="intro">
        Resolución 55/2021 del Ministerio de Finanzas y Precios. Cada dato y dónde lo captura
        FACTURATH.
      </p>
      <ol class="list">
        @for (entry of store.compliance(); track entry.id) {
          <li class="item" [class]="entry.state">
            <span class="number" aria-hidden="true">{{ $index + 1 }}</span>
            <div class="body">
              <p class="label"><span class="sr-only">{{ $index + 1 }}. </span>{{ entry.label }}</p>
              <p class="where">{{ entry.where }}</p>
              <div class="footer">
                <span class="state">
                  <span class="marker" aria-hidden="true"></span>
                  {{ stateLabels[entry.state] }}
                </span>
                @if (entry.state === 'pending') {
                  <button
                    type="button"
                    class="go"
                    [attr.aria-label]="'Ir al campo: ' + entry.label"
                    (click)="goTo(entry)"
                  >
                    Ir al campo
                  </button>
                }
              </div>
            </div>
          </li>
        }
      </ol>
    </app-drawer>
  `,
  styles: `
    .intro {
      margin: 0 0 var(--sp-4);
      color: var(--fg-2);
      font-size: var(--fs-12);
      line-height: var(--lh-normal);
    }

    .list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .item {
      display: flex;
      gap: var(--sp-2);
      padding: var(--sp-3) 0;
      border-top: 1px solid var(--border-1);
    }

    .number {
      flex: none;
      width: 22px;
      color: var(--fg-3);
      font-size: var(--fs-12);
      font-weight: var(--fw-bold);
      font-variant-numeric: tabular-nums;
    }

    .body {
      flex: 1;
      min-width: 0;
    }

    .label,
    .where {
      margin: 0;
    }

    .label {
      font-size: var(--fs-12);
      line-height: var(--lh-normal);
    }

    .where {
      margin-top: 2px;
      color: var(--fg-3);
      font-size: var(--fs-12);
    }

    .footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-2);
      margin-top: var(--sp-2);
    }

    .state {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 22px;
      padding: 0 var(--sp-2);
      border-radius: var(--radius-full);
      font-size: var(--fs-12);
      font-weight: var(--fw-medium);
    }

    .marker {
      width: 8px;
      height: 8px;
      border-radius: var(--radius-full);
      background: currentColor;
    }

    /* Each state also reads as text, so colour only reinforces it. All pairs are AA on white. */
    .fulfilled .state {
      background: var(--success-bg);
      color: var(--success-fg);
    }

    .pending .state {
      background: var(--warning-bg);
      color: var(--warning-fg);
    }

    .not-applicable .state {
      background: var(--bg-2);
      color: var(--fg-2);
    }

    .not-applicable .marker {
      width: 8px;
      height: 2px;
      border-radius: 0;
    }

    .go {
      min-height: 32px;
      padding: 0 var(--sp-3);
      border: 1px solid var(--border-control);
      border-radius: var(--radius-xs);
      background: var(--bg-0);
      color: var(--gem-900);
      font-size: var(--fs-12);
      font-weight: var(--fw-medium);
      cursor: pointer;
    }

    .go:hover {
      background: var(--bg-2);
    }

    .go:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 2px;
    }
  `,
  host: { 'data-print-hide': '' },
})
export class CompliancePanel {
  protected readonly store = inject(InvoiceStore);
  private readonly fieldFocus = inject(FieldFocus);
  private readonly injector = inject(Injector);

  readonly open = model(false);

  protected readonly stateLabels = STATE_LABELS;

  /**
   * Closes the panel and focuses the entry's missing field. The drawer gives focus back to
   * its opener in its own after-render hook, registered before this one, so the field focus
   * runs after that restore in the same render and wins.
   */
  protected goTo(entry: ComplianceEntry): void {
    const field = entry.focusField;
    if (field === null) {
      return;
    }
    this.open.set(false);
    afterNextRender(() => this.fieldFocus.focus(field), { injector: this.injector });
  }
}

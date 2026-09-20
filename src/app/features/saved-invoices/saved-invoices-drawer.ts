import { Component, computed, inject, model, output } from '@angular/core';
import type { InvoiceSummary } from '../../core/storage/ports';
import { formatIsoDate, formatMoney, formatReference } from '../../domain/format';
import { Drawer } from '../../shared/ui/drawer';
import { SavedInvoicesStore } from './saved-invoices-store';

interface SavedInvoiceRow {
  id: string;
  reference: string;
  buyerName: string;
  date: string;
  total: string;
}

function toRow(summary: InvoiceSummary): SavedInvoiceRow {
  return {
    id: summary.id,
    reference: formatReference(summary.series, summary.number),
    buyerName: summary.buyerName,
    date: formatIsoDate(summary.issueDate),
    total: formatMoney(summary.total, summary.currency),
  };
}

/** The saved invoices in a side drawer: each can be opened in the editor or deleted. */
@Component({
  selector: 'app-saved-invoices-drawer',
  imports: [Drawer],
  template: `
    <app-drawer [(open)]="open" heading="Facturas guardadas">
      @if (rows().length === 0) {
        <p class="empty">Aún no hay facturas guardadas.</p>
      } @else {
        <ul class="list">
          @for (row of rows(); track row.id) {
            <li class="row">
              <div class="summary">
                <span class="reference">{{ row.reference }}</span>
                <span class="buyer">{{ row.buyerName || 'Sin comprador' }}</span>
                <span class="meta">{{ row.date }} · {{ row.total }}</span>
              </div>
              <div class="actions">
                <button
                  type="button"
                  class="action"
                  [attr.aria-label]="'Abrir ' + row.reference"
                  (click)="opened.emit(row.id)"
                >
                  Abrir
                </button>
                <button
                  type="button"
                  class="action danger"
                  [attr.aria-label]="'Eliminar ' + row.reference"
                  (click)="store.delete(row.id)"
                >
                  Eliminar
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </app-drawer>
  `,
  styles: `
    .empty {
      margin: 0;
      color: var(--fg-3);
      font-size: var(--fs-14);
    }

    .list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-2);
      padding: var(--sp-3) 0;
      border-bottom: 1px solid var(--border-1);
    }

    .summary {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      font-size: var(--fs-12);
    }

    .reference {
      font-size: var(--fs-14);
      font-weight: var(--fw-bold);
      color: var(--gem-900);
    }

    .buyer {
      color: var(--fg-1);
    }

    .meta {
      color: var(--fg-3);
    }

    .actions {
      display: flex;
      gap: var(--sp-1);
    }

    .action {
      min-height: 32px;
      padding: 0 var(--sp-3);
      border: 1px solid var(--border-control);
      border-radius: var(--radius-xs);
      background: var(--bg-0);
      font-size: var(--fs-12);
      font-weight: var(--fw-medium);
      cursor: pointer;
    }

    .action:hover {
      background: var(--bg-2);
    }

    .action:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 2px;
    }

    .danger {
      color: var(--fg-2);
    }
  `,
})
export class SavedInvoicesDrawer {
  protected readonly store = inject(SavedInvoicesStore);

  readonly open = model(false);
  /** The user wants the saved invoice with this id in the editor. */
  readonly opened = output<string>();

  protected readonly rows = computed(() => this.store.summaries().map(toRow));
}

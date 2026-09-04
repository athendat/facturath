import { Component } from '@angular/core';
import { DocumentMeta } from './document-meta';
import { LineItemsTable } from './line-items-table';
import { TotalsPanel } from './totals-panel';

/** The editable invoice sheet. */
@Component({
  selector: 'app-invoice-editor',
  imports: [DocumentMeta, LineItemsTable, TotalsPanel],
  template: `
    <article class="sheet">
      <div class="top">
        <app-document-meta />
      </div>
      <app-line-items-table />
      <app-totals-panel />
    </article>
  `,
  styles: `
    .sheet {
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
      padding: var(--sp-5);
      border: 1px solid var(--border-1);
      border-radius: var(--radius-xs);
      background: var(--bg-0);
      box-shadow: var(--shadow-sm);
      font-size: var(--fs-12);
      line-height: 1.45;
    }

    .top {
      display: flex;
      justify-content: flex-end;
    }
  `,
})
export class InvoiceEditor {}

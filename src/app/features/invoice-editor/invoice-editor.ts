import { Component, afterNextRender, inject } from '@angular/core';
import { CarrierBlock } from './carrier-block';
import { DocumentMeta } from './document-meta';
import { InvoiceStore } from './invoice-store';
import { LegalFooter } from './legal-footer';
import { LineItemsTable } from './line-items-table';
import { PartyBlock } from './party-block';
import { SignaturesBlock } from './signatures-block';
import { TextBlock } from './text-block';
import { TotalsPanel } from './totals-panel';

/** The editable invoice sheet. */
@Component({
  selector: 'app-invoice-editor',
  imports: [
    CarrierBlock,
    DocumentMeta,
    LegalFooter,
    LineItemsTable,
    PartyBlock,
    SignaturesBlock,
    TextBlock,
    TotalsPanel,
  ],
  template: `
    <article class="sheet">
      <div class="head">
        <app-party-block class="seller" party="seller" />
        <app-document-meta class="meta" />
      </div>
      <div class="parties">
        <app-party-block party="buyer" />
        <app-text-block kind="concept" />
      </div>
      <app-line-items-table />
      <div class="summary">
        <app-text-block class="notes" kind="notes" />
        <app-totals-panel class="totals" />
      </div>
      <div class="band">
        <app-text-block class="terms" kind="terms" />
      </div>
      <div class="band">
        <app-carrier-block />
      </div>
      <div class="band">
        <app-signatures-block />
      </div>
      <app-legal-footer />
    </article>
  `,
  styles: `
    .sheet {
      padding: var(--sp-5);
      border: 1px solid var(--border-1);
      border-radius: var(--radius-xs);
      background: var(--bg-0);
      box-shadow: var(--shadow-sm);
      font-size: var(--fs-12);
      line-height: 1.45;
    }

    .head {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      padding-bottom: 14px;
      border-bottom: 2px solid var(--gray-900);
    }

    .seller {
      flex: 1;
      min-width: 220px;
    }

    .meta {
      flex: none;
      min-width: 210px;
    }

    .parties {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 14px;
      padding: 14px 0;
    }

    .summary {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 14px;
      padding-top: var(--sp-3);
    }

    .notes {
      flex: 1;
      min-width: 220px;
    }

    .totals {
      flex: 1;
      max-width: 300px;
    }

    .band {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 14px;
      margin-top: var(--sp-3);
      padding-top: var(--sp-3);
      border-top: 1px solid var(--border-1);
    }

    .band > * {
      flex: 1;
    }

    .terms {
      min-width: 180px;
    }

    @media print {
      .sheet {
        padding: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
    }
  `,
})
export class InvoiceEditor {
  private readonly store = inject(InvoiceStore);

  constructor() {
    // Browser only, after hydration: the prerendered document must stay undated so the
    // first client render matches it; today is filled in right after.
    afterNextRender(() => this.store.setIssueDateIfEmpty(new Date()));
  }
}

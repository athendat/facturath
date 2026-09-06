import { Component, afterNextRender, inject } from '@angular/core';
import { ImagesStore } from '../../core/images-store';
import { SettingsStore } from '../../core/settings-store';
import { CarrierBlock } from './carrier-block';
import { DocumentMeta } from './document-meta';
import { ImageControl } from './image-control';
import { InvoiceStore } from './invoice-store';
import { LegalFooter } from './legal-footer';
import { LineItemsTable } from './line-items-table';
import { PartyBlock } from './party-block';
import { PaymentQrControls } from './payment-qr-controls';
import { SignaturesBlock } from './signatures-block';
import { TextBlock } from './text-block';
import { TotalsPanel } from './totals-panel';

/** The editable invoice sheet. */
@Component({
  selector: 'app-invoice-editor',
  imports: [
    CarrierBlock,
    DocumentMeta,
    ImageControl,
    LegalFooter,
    LineItemsTable,
    PartyBlock,
    PaymentQrControls,
    SignaturesBlock,
    TextBlock,
    TotalsPanel,
  ],
  template: `
    <article class="sheet">
      <div class="head">
        <div class="issuer">
          <app-image-control kind="logo" />
          <app-party-block class="seller" party="seller" />
        </div>
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
        <app-payment-qr-controls />
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

    .issuer {
      display: flex;
      flex: 1;
      align-items: flex-start;
      gap: 12px;
      min-width: 220px;
    }

    .seller {
      flex: 1;
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

    .band > app-payment-qr-controls {
      flex: none;
    }

    @media print {
      /* Keep an inset even when the dialog margins are "None". The 10-line
         case leaves ~28px of A4 height with @page 10mm, so vertical padding
         is --sp-3, not --sp-5 (that would push it to a second page). */
      .sheet {
        padding: var(--sp-3) var(--sp-5);
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
    }
  `,
})
export class InvoiceEditor {
  private readonly store = inject(InvoiceStore);
  private readonly settings = inject(SettingsStore);
  private readonly images = inject(ImagesStore);

  constructor() {
    // Browser only, after hydration: the prerendered document must stay undated, its seller
    // block empty and its images placeholders so the first client render matches it; all
    // are filled right after.
    afterNextRender(async () => {
      this.store.setIssueDateIfEmpty(new Date());
      this.store.applyProfile(await this.settings.load());
      await this.images.load();
    });
  }
}

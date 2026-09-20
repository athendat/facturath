import { Component, PendingTasks, afterNextRender, inject } from '@angular/core';
import { ImagesStore } from '../../core/images-store';
import { SettingsStore } from '../../core/settings-store';
import { CarrierBlock } from './carrier-block';
import { ImageControl } from '../../shared/ui/image-control';
import { DocumentMeta } from './document-meta';
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
    <article class="sheet" [attr.data-density]="settings.density()">
      <div class="head">
        <div class="issuer">
          <app-image-control
            kind="logo"
            [url]="images.urls().logo"
            (fileChosen)="images.set('logo', $event)"
            (removed)="images.remove('logo')"
          />
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
        @if (settings.showPaymentQr()) {
          <app-payment-qr-controls />
        }
      </div>
      @if (settings.showCarrier()) {
        <div class="band">
          <app-carrier-block />
        </div>
      }
      @if (settings.showSignatures()) {
        <div class="band">
          <app-signatures-block />
        </div>
      }
      <app-legal-footer />
    </article>
  `,
  styles: `
    /* Density only switches these; spacious is the layout the sheet has always had. */
    .sheet[data-density='spacious'] {
      --sheet-pad: var(--sp-5);
      --sheet-pad-print: var(--sp-3);
      --sheet-gap: 14px;
      --sheet-band-gap: var(--sp-3);
      --logo-size: 64px;
    }

    .sheet[data-density='compact'] {
      --sheet-pad: var(--sp-3);
      --sheet-pad-print: var(--sp-2);
      --sheet-gap: var(--sp-2);
      --sheet-band-gap: var(--sp-2);
      --logo-size: 48px;
    }

    .sheet {
      padding: var(--sheet-pad);
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
      gap: var(--sheet-gap);
      padding-bottom: var(--sheet-gap);
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
      gap: var(--sheet-gap);
      padding: var(--sheet-gap) 0;
    }

    .summary {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: var(--sheet-gap);
      padding-top: var(--sheet-band-gap);
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
      gap: var(--sheet-gap);
      margin-top: var(--sheet-band-gap);
      padding-top: var(--sheet-band-gap);
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
         spacious case leaves ~28px of A4 height with @page 10mm, so vertical
         padding is --sp-3, not --sp-5 (that would push it to a second page). */
      .sheet {
        padding: var(--sheet-pad-print) var(--sheet-pad);
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
    }
  `,
})
export class InvoiceEditor {
  protected readonly settings = inject(SettingsStore);
  protected readonly images = inject(ImagesStore);
  private readonly pendingTasks = inject(PendingTasks);

  constructor() {
    // Browser only, after hydration: the prerendered document shows image placeholders so
    // the first client render matches it; the images the profile points at load right
    // after, as a pending task so the app is not stable until they show. Dating the
    // invoice, filling the seller block and restoring the draft are the shell's startup
    // (see `DraftAutosave.start`).
    afterNextRender(async () => {
      const done = this.pendingTasks.add();
      try {
        await this.settings.load();
        await this.images.load();
      } finally {
        done();
      }
    });
  }
}

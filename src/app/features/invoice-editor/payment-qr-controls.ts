import { Component, effect, inject } from '@angular/core';
import { ImagesStore } from '../../core/images-store';
import { IMAGE_ASSET_FIELDS, IMAGE_KINDS } from '../../domain/invoice';
import { ImageControl } from '../../shared/ui/image-control';
import { InvoiceStore } from './invoice-store';

/** The Transfermóvil and EnZona payment QR codes, side by side after the terms. */
@Component({
  selector: 'app-payment-qr-controls',
  imports: [ImageControl],
  template: `
    @for (kind of kinds; track kind) {
      <app-image-control
        [kind]="kind"
        [url]="images.urlFor(store.invoice()[fields[kind]])"
        (fileChosen)="images.set(kind, $event)"
        (removed)="images.remove(kind)"
      />
    }
  `,
  styles: `
    :host {
      display: flex;
      flex: none;
      align-items: flex-start;
      gap: 14px;
    }
  `,
})
export class PaymentQrControls {
  protected readonly images = inject(ImagesStore);
  protected readonly store = inject(InvoiceStore);
  protected readonly kinds = IMAGE_KINDS.filter((kind) => kind !== 'logo');
  protected readonly fields = IMAGE_ASSET_FIELDS;

  constructor() {
    // The document shows the open invoice's own QR codes (see InvoiceEditor for the logo).
    effect(() => {
      const invoice = this.store.invoice();
      for (const kind of this.kinds) {
        this.images.resolve(invoice[IMAGE_ASSET_FIELDS[kind]]);
      }
    });
  }
}

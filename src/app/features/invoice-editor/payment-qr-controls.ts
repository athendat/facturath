import { Component, inject } from '@angular/core';
import { ImagesStore } from '../../core/images-store';
import { IMAGE_KINDS } from '../../domain/invoice';
import { ImageControl } from '../../shared/ui/image-control';

/** The Transfermóvil and EnZona payment QR codes, side by side after the terms. */
@Component({
  selector: 'app-payment-qr-controls',
  imports: [ImageControl],
  template: `
    @for (kind of kinds; track kind) {
      <app-image-control
        [kind]="kind"
        [url]="images.urls()[kind]"
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
  protected readonly kinds = IMAGE_KINDS.filter((kind) => kind !== 'logo');
}

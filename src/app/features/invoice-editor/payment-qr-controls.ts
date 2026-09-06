import { Component } from '@angular/core';
import { ImageControl } from './image-control';

/** The Transfermóvil and EnZona payment QR codes, side by side after the terms. */
@Component({
  selector: 'app-payment-qr-controls',
  imports: [ImageControl],
  template: `
    <app-image-control kind="transfermovilQr" />
    <app-image-control kind="enzonaQr" />
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
export class PaymentQrControls {}

import { Component } from '@angular/core';

/** The Res. 55/2021 notice that closes every document. Static, never editable. */
@Component({
  selector: 'app-legal-footer',
  template: `
    <p>
      Documento emitido conforme a la Resolución 55/2021 del Ministerio de Finanzas y Precios. En la
      factura digital las firmas pueden sustituirse por métodos criptográficos aprobados, canales de
      pago electrónicos o mecanismos automatizados de entrega y aceptación.
    </p>
  `,
  styles: `
    :host {
      display: block;
      margin-top: var(--sp-3);
      padding-top: var(--sp-2);
      border-top: 1px solid var(--border-1);
    }

    p {
      margin: 0;
      color: var(--fg-4);
      font-size: 9px;
      line-height: var(--lh-relaxed);
    }

    @media print {
      :host {
        break-inside: avoid;
      }
    }
  `,
})
export class LegalFooter {}

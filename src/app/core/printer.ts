import { DOCUMENT, Service, inject } from '@angular/core';

/** Seam around the browser print dialog so callers can be tested without opening one. */
@Service()
export class Printer {
  private readonly document = inject(DOCUMENT);

  print(): void {
    this.document.defaultView?.print();
  }
}

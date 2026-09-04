import { DOCUMENT, Service, inject } from '@angular/core';

/** Seam around a full page reload so callers can be tested without reloading anything. */
@Service()
export class PageReloader {
  private readonly document = inject(DOCUMENT);

  reload(): void {
    this.document.location.reload();
  }
}

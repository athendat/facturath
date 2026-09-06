import { DOCUMENT, Service, inject } from '@angular/core';

/**
 * Seam around `URL.createObjectURL` / `revokeObjectURL` of the window that owns
 * the document, so image handling can be tested where no window has them (jsdom).
 */
@Service()
export class ObjectUrls {
  private readonly document = inject(DOCUMENT);

  create(blob: Blob): string {
    return this.urlApi().createObjectURL(blob);
  }

  revoke(url: string): void {
    this.urlApi().revokeObjectURL(url);
  }

  private urlApi(): typeof URL {
    const window = this.document.defaultView;
    if (!window) {
      throw new Error('Object URLs need a window; call after hydration.');
    }
    return window.URL;
  }
}

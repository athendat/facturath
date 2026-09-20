import { DOCUMENT, Service, inject } from '@angular/core';
import { ObjectUrls } from './object-urls';

/**
 * Seam around "save this file": a temporary anchor with an object URL and a
 * download name, clicked for the user. Browser only, after hydration; tests
 * replace it with a fake that keeps the file.
 */
@Service()
export class FileDownload {
  private readonly document = inject(DOCUMENT);
  private readonly objectUrls = inject(ObjectUrls);

  save(name: string, blob: Blob): void {
    const url = this.objectUrls.create(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    this.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // The download starts from the click; the URL can go once the browser has picked it up.
    setTimeout(() => this.objectUrls.revoke(url), 1000);
  }
}

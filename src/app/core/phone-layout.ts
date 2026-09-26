import { DOCUMENT, Service, inject } from '@angular/core';

/**
 * The screens that get the phone editor (#64). The stylesheets use the same 640px
 * breakpoint, as `max-width: 639.98px`.
 */
export const PHONE_MEDIA_QUERY = 'screen and (max-width: 639.98px)';

/**
 * Whether the screen shows the phone editor rather than the inline sheet. Browser only:
 * it asks the window, so callers use it from event handlers, never during the first render.
 */
@Service()
export class PhoneLayout {
  private readonly document = inject(DOCUMENT);

  active(): boolean {
    return this.document.defaultView?.matchMedia?.(PHONE_MEDIA_QUERY).matches ?? false;
  }
}

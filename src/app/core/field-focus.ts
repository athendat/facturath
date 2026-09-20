import { DOCUMENT, Service, inject } from '@angular/core';
import { fieldElementId, type FieldId } from '../domain/compliance';

/**
 * Moves keyboard focus to a document field by its field id. Browser only: it reads the DOM,
 * so callers use it from event handlers, never during the first render.
 */
@Service()
export class FieldFocus {
  private readonly document = inject(DOCUMENT);

  /** Focuses the control bound to `fieldId`; does nothing when it is not in the document. */
  focus(fieldId: FieldId): void {
    const control = this.document.getElementById(fieldElementId(fieldId));
    if (control instanceof HTMLElement) {
      control.focus();
    }
  }
}

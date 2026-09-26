import { DOCUMENT, Service, inject, signal } from '@angular/core';
import { FieldFocus } from '../../core/field-focus';
import { PhoneLayout } from '../../core/phone-layout';
import type { FieldId } from '../../domain/compliance';
import { sheetFieldId, zoneOfField, type ZoneKey } from './zones';

/** Which zone of the phone document has its bottom sheet open, if any (#64). */
@Service()
export class ZoneSheets {
  private readonly document = inject(DOCUMENT);
  private readonly layout = inject(PhoneLayout);
  private readonly fieldFocus = inject(FieldFocus);
  private readonly openZone = signal<ZoneKey | null>(null);
  /** The sheet control to focus once the open sheet has rendered. */
  private focusRequest: string | null = null;

  readonly current = this.openZone.asReadonly();

  open(zone: ZoneKey): void {
    this.openZone.set(zone);
  }

  close(): void {
    this.openZone.set(null);
    this.focusRequest = null;
  }

  /**
   * Puts the cursor on `field` wherever the screen shows it: in the inline sheet, or on a
   * phone in the bottom sheet of the zone that owns it. That zone takes focus first, so it is
   * where focus goes back to when the sheet closes. Browser only, from an event handler.
   */
  reveal(field: FieldId): void {
    if (!this.layout.active()) {
      this.fieldFocus.focus(field);
      return;
    }
    const zone = zoneOfField(field);
    this.document.getElementById(`zone-${zone}`)?.focus();
    this.focusRequest = sheetFieldId(field);
    this.open(zone);
  }

  /** Focuses the control `reveal` asked for, once it is in the page. */
  focusRequested(): void {
    const control = this.focusRequest && this.document.getElementById(this.focusRequest);
    if (control) {
      this.focusRequest = null;
      control.focus();
    }
  }
}

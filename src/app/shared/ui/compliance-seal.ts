import { Component, computed, input, output } from '@angular/core';
import { Icon } from './icon';

/**
 * The Res. 55 status, stamped like a seal rather than drawn like one more command: amber
 * with the count while data points are missing, green with a check once none is. It opens
 * the compliance panel, so it is a button. Its name starts with the text it shows, so a
 * voice user can say what they see (WCAG 2.5.3), and then says what the count is of.
 * As a `row` it fills the width and adds a "Ver" cue, for the phone menu.
 */
@Component({
  selector: 'app-compliance-seal',
  imports: [Icon],
  host: { '[class.row]': 'row()' },
  template: `
    <button
      type="button"
      class="seal"
      [class.complete]="pending() === 0"
      [class.row]="row()"
      [attr.aria-label]="name()"
      (click)="activated.emit()"
    >
      <span class="ring" aria-hidden="true">
        @if (pending() === 0) {
          <app-icon name="check" />
        } @else {
          {{ pending() }}
        }
      </span>
      <!-- One flex item, so the seal's gap does not open between the two parts. -->
      <span>{{ status() }}<span class="rest">{{ rest() }}</span></span>
      @if (row()) {
        &ngsp;<span class="go">Ver</span>
      }
    </button>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    .seal {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 30px;
      padding: 0 10px 0 6px;
      border: 0;
      border-radius: var(--radius-full);
      background: var(--warning-bg);
      color: var(--warning-fg);
      font-size: var(--fs-12);
      font-weight: var(--fw-bold);
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
      /* The stamp: a dashed line just inside the edge, in the seal's own ink. */
      outline: 1px dashed color-mix(in srgb, currentColor 45%, transparent);
      outline-offset: -3px;
    }

    .seal.complete {
      background: var(--success-bg);
      color: var(--success-fg);
    }

    /* The focus ring is a shadow, so the dashed stamp stays visible under it. */
    .seal:focus-visible {
      box-shadow: 0 0 0 2px var(--bg-0), 0 0 0 4px var(--gem-900);
    }

    /* Forced colours drop box-shadow, so the ring falls back to a system-colour outline. */
    @media (forced-colors: active) {
      .seal:focus-visible {
        outline: 2px solid CanvasText;
        outline-offset: 2px;
      }
    }

    .ring {
      display: inline-grid;
      place-items: center;
      width: 18px;
      height: 18px;
      border: 1.5px solid currentColor;
      border-radius: 50%;
      font-size: 10px;
      font-variant-numeric: tabular-nums;
    }

    .ring app-icon {
      width: 12px;
      height: 12px;
    }

    :host(.row) {
      display: flex;
    }

    .seal.row {
      flex: 1;
      min-height: 44px;
      padding: 0 12px 0 10px;
      border-radius: var(--radius-sm);
      font-size: var(--fs-14);
    }

    /* The compact chip of a phone header (#64): taller to tap, without the words after the
       count, which the accessible name still carries. */
    @media (max-width: 639.98px) {
      :host(:not(.row)) .seal {
        min-height: 36px;
        font-size: 13px;
      }

      :host(:not(.row)) .rest {
        display: none;
      }
    }

    .go {
      margin-left: auto;
      font-weight: var(--fw-medium);
      font-size: var(--fs-12);
    }
  `,
})
export class ComplianceSeal {
  /** How many of the Res. 55 data points are still missing. */
  readonly pending = input.required<number>();
  /** Full width with a "Ver" cue, as the first row of the phone menu. */
  readonly row = input(false);
  readonly activated = output<void>();

  /** What the seal shows, and where its accessible name starts; a phone header shows only this. */
  protected readonly status = computed(() =>
    this.pending() === 0 ? 'Res. 55' : `Res. 55 · ${this.pending()}`,
  );

  /** The words after the count, which the compact chip of a phone header leaves out (#64). */
  protected readonly rest = computed(() => (this.pending() === 0 ? ' completa' : ' pendientes'));

  protected readonly name = computed(() => {
    const shown = this.status() + this.rest();
    const name = this.pending() === 0 ? shown : `${shown}, datos obligatorios`;
    return this.row() ? `${name}. Ver` : name;
  });
}

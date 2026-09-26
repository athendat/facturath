import { Component, computed, input, output } from '@angular/core';
import { Icon } from './icon';

/**
 * One tappable part of the phone document (#64): a full-width button showing a read-only
 * summary (the projected content) with a pencil, and in amber what is still missing there.
 * The name says what it does (`Editar comprador`); the summary and the note are its
 * description, so a screen reader hears them after the name.
 */
@Component({
  selector: 'app-zone-button',
  imports: [Icon],
  template: `
    <button
      type="button"
      class="zone"
      [id]="'zone-' + key()"
      [attr.aria-label]="name()"
      [attr.aria-describedby]="summaryId()"
      (click)="onClick($event)"
    >
      <span class="summary" [id]="summaryId()">
        <ng-content />
        @if (note(); as note) {
          &ngsp;<span class="pending"><span class="dot" aria-hidden="true"></span>{{ note }}</span>
        }
      </span>
      <app-icon class="pen" name="edit" />
    </button>
  `,
  styles: `
    :host {
      display: block;
    }

    .zone {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-3);
      width: 100%;
      min-height: 44px;
      padding: var(--sp-3) 14px;
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      font: inherit;
      text-align: left;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }

    .zone:active {
      background: var(--gem-50);
    }

    .zone:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: -2px;
    }

    .summary {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .pending {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--warning-fg);
      font-size: 13px;
    }

    .dot {
      flex: none;
      width: 7px;
      height: 7px;
      border-radius: var(--radius-full);
      background: currentColor;
    }

    .pen {
      width: 18px;
      height: 18px;
      margin-top: 2px;
      color: var(--fg-3);
    }
  `,
})
export class ZoneButton {
  /** Names the zone in element ids: the button is `zone-<key>`. */
  readonly key = input.required<string>();
  /** The accessible name, `Editar <zona>`. */
  readonly name = input.required<string>();
  /** What Res. 55 still needs here, e.g. `Falta dirección`; nothing when complete. */
  readonly note = input<string | undefined>(undefined);
  readonly activated = output<void>();

  protected readonly summaryId = computed(() => `zone-${this.key()}-summary`);

  /**
   * Takes focus before reporting the tap: Safari on iOS does not focus a tapped button, and
   * whatever the zone opens gives focus back to it on close.
   */
  protected onClick(event: MouseEvent): void {
    (event.currentTarget as HTMLElement).focus();
    this.activated.emit();
  }
}

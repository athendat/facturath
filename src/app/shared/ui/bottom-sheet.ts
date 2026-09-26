import { Component, input, model } from '@angular/core';
import { Drawer } from './drawer';
import { Icon } from './icon';

/**
 * A modal sheet rising from the bottom of a phone screen (#64): a decorative handle, a
 * heading with a close button, the projected content, and a footer with `Listo` last. The
 * content may put its own actions before `Listo` by marking them `sheetAction`. The modal
 * behaviour is the drawer's: focus moves inside and is trapped there, Escape and the scrim
 * close it, and focus goes back to whatever opened it. The parent owns `open`.
 */
@Component({
  selector: 'app-bottom-sheet',
  imports: [Drawer, Icon],
  template: `
    <app-drawer [(open)]="open" [heading]="heading()" [bare]="true" side="bottom">
      <span class="handle" aria-hidden="true"></span>
      <div class="header">
        <h2 class="title">{{ heading() }}</h2>
        <button type="button" class="close" aria-label="Cerrar" (click)="open.set(false)">
          <app-icon name="close" />
        </button>
      </div>
      <div class="body">
        <ng-content />
      </div>
      <div class="footer">
        <ng-content select="[sheetAction]" />
        <button type="button" class="done" (click)="open.set(false)">Listo</button>
      </div>
    </app-drawer>
  `,
  styles: `
    .handle {
      flex: none;
      align-self: center;
      width: 36px;
      height: 4px;
      margin-top: var(--sp-2);
      border-radius: var(--radius-full);
      background: var(--border-2);
    }

    .header {
      display: flex;
      flex: none;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-2);
      padding: var(--sp-1) var(--sp-2) 0 var(--sp-4);
    }

    .title {
      margin: 0;
      font-size: var(--fs-18);
      font-weight: var(--fw-bold);
    }

    .close {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--fg-2);
      cursor: pointer;
    }

    .close app-icon {
      width: 20px;
      height: 20px;
    }

    .close:hover {
      background: var(--bg-2);
    }

    .body {
      flex: 1;
      min-height: 0;
      overflow: auto;
      padding: var(--sp-3) var(--sp-4);
    }

    .footer {
      display: flex;
      flex: none;
      gap: 10px;
      padding: var(--sp-2) var(--sp-4) var(--sp-4);
    }

    .done {
      flex: 1;
      min-height: 48px;
      border: 0;
      border-radius: var(--radius-sm);
      background: var(--bg-brand);
      color: var(--fg-on-brand);
      font-size: 15px;
      font-weight: var(--fw-bold);
      cursor: pointer;
    }

    .done:hover {
      background: var(--gem-800);
    }

    .close:focus-visible,
    .done:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 2px;
    }
  `,
})
export class BottomSheet {
  readonly open = model(false);
  /** Shown as the sheet's heading and used as the dialog's accessible name. */
  readonly heading = input.required<string>();
}

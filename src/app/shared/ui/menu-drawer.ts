import { Component, input, model, output } from '@angular/core';
import { ComplianceSeal } from './compliance-seal';
import { Drawer } from './drawer';
import { Icon } from './icon';

/** What the phone menu reports when the user picks a row. */
export type MenuDrawerCommand = 'compliance' | 'new' | 'saved' | 'file' | 'settings';

/**
 * The phone header's menu: a right-hand modal drawer with the open invoice at the top,
 * the Res. 55 seal as the first row, then the same commands as the "Más" menu of a wide
 * screen in 48px rows, grouped by what they act on. The parent owns `open` and runs the
 * chosen command; the drawer only reports it.
 */
@Component({
  selector: 'app-menu-drawer',
  imports: [ComplianceSeal, Drawer, Icon],
  template: `
    <app-drawer [(open)]="open" heading="Menú" [bare]="true">
      <div class="dhead">
        <span class="wordmark">FACTURATH</span>
        <button type="button" class="close" aria-label="Cerrar menú" (click)="open.set(false)">
          <app-icon name="close" />
        </button>
        <span class="ref">Factura {{ reference() }}</span>
      </div>
      <div class="dbody">
        <app-compliance-seal
          class="dseal"
          [pending]="pending()"
          [row]="true"
          (activated)="chosen.emit('compliance')"
        />
        <div role="group" aria-labelledby="menu-group-invoice">
          <p class="glabel" id="menu-group-invoice">Esta factura</p>
          <button type="button" class="ditem" (click)="chosen.emit('new')">
            <app-icon name="new" />
            Nueva factura
            <span class="n">{{ nextReference() }}</span>
          </button>
        </div>
        <div role="group" aria-labelledby="menu-group-invoices">
          <p class="glabel" id="menu-group-invoices">Tus facturas</p>
          <button type="button" class="ditem" (click)="chosen.emit('saved')">
            <app-icon name="list" />
            Facturas guardadas
            <span class="n">{{ savedCount() }}</span>
          </button>
          <button type="button" class="ditem" (click)="chosen.emit('file')">
            <app-icon name="file" />
            Exportar / importar
          </button>
        </div>
        <div role="group" aria-labelledby="menu-group-app">
          <p class="glabel" id="menu-group-app">App</p>
          <button type="button" class="ditem" (click)="chosen.emit('settings')">
            <app-icon name="settings" />
            Ajustes
          </button>
        </div>
      </div>
      <p class="dfoot">Funciona sin conexión. Tus facturas se guardan solo en este dispositivo.</p>
    </app-drawer>
  `,
  styles: `
    .dhead {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 2px var(--sp-2);
      padding: 14px var(--sp-3) var(--sp-3) var(--sp-4);
      border-bottom: 1px solid var(--border-1);
    }

    .wordmark {
      color: var(--gem-900);
      font-size: var(--fs-18);
      font-weight: var(--fw-black);
      letter-spacing: var(--tr-snug);
    }

    .ref {
      grid-column: 1;
      color: var(--fg-2);
      font-size: var(--fs-12);
      font-weight: var(--fw-medium);
      font-variant-numeric: tabular-nums;
    }

    .close {
      display: inline-flex;
      grid-row: 1 / span 2;
      grid-column: 2;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: var(--radius-sm);
      background: var(--bg-0);
      color: var(--gem-900);
      cursor: pointer;
    }

    .close:hover {
      background: var(--gem-50);
    }

    .dbody {
      flex: 1;
      overflow: auto;
      display: grid;
      align-content: start;
      gap: var(--sp-1);
      padding: var(--sp-2) var(--sp-2) var(--sp-3);
    }

    .dseal {
      margin: 6px var(--sp-2) var(--sp-2);
    }

    .glabel {
      margin: 0;
      padding: var(--sp-3) var(--sp-2) 6px;
      color: var(--fg-2);
      font-size: 10px;
      font-weight: var(--fw-bold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .ditem {
      display: flex;
      align-items: center;
      gap: var(--sp-3);
      width: 100%;
      min-height: 48px;
      padding: 0 10px;
      border: 0;
      border-radius: var(--radius-sm);
      background: var(--bg-0);
      color: var(--fg-1);
      font-size: var(--fs-14);
      font-weight: var(--fw-medium);
      text-align: left;
      cursor: pointer;
    }

    .ditem app-icon {
      width: 18px;
      height: 18px;
      color: var(--gem-900);
    }

    .ditem:hover {
      background: var(--gem-50);
    }

    .close:focus-visible,
    .ditem:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: -2px;
    }

    .n {
      margin-left: auto;
      color: var(--fg-2);
      font-size: var(--fs-12);
      font-variant-numeric: tabular-nums;
    }

    .dfoot {
      margin: 0;
      padding: var(--sp-3) var(--sp-4);
      border-top: 1px solid var(--border-1);
      color: var(--fg-2);
      font-size: 11px;
      line-height: 1.4;
    }
  `,
})
export class MenuDrawer {
  readonly open = model(false);
  /** The open invoice as the header writes it, e.g. `A-0001 · 0.00 CUP`. */
  readonly reference = input.required<string>();
  readonly pending = input.required<number>();
  readonly savedCount = input.required<number>();
  /** The number a new invoice would take, e.g. `A-0002`. */
  readonly nextReference = input.required<string>();
  readonly chosen = output<MenuDrawerCommand>();
}

import { Component, computed, input, model, output } from '@angular/core';
import { ComplianceSeal } from './compliance-seal';
import { Drawer } from './drawer';
import { Icon } from './icon';
import type { MenuItem } from './menu-list';

let nextId = 0;

/**
 * The phone header's menu: a right-hand modal drawer with the open invoice at the top,
 * the Res. 55 seal as the first row, then the same commands as the "Más" menu of a wide
 * screen in 48px rows, one labelled group per `MenuItem.group`. The parent owns `open` and
 * runs the chosen command; the drawer only reports it.
 */
@Component({
  selector: 'app-menu-drawer',
  imports: [ComplianceSeal, Drawer, Icon],
  template: `
    <app-drawer [(open)]="open" heading="Menú" [bare]="true" width="272px">
      <div class="drawer-header">
        <span class="wordmark">FACTURATH</span>
        <button type="button" class="close" aria-label="Cerrar menú" (click)="open.set(false)">
          <app-icon name="close" />
        </button>
        <span class="reference">Factura {{ reference() }}</span>
      </div>
      <div class="drawer-body">
        <app-compliance-seal
          class="seal-row"
          [pending]="pending()"
          [row]="true"
          (activated)="sealActivated.emit()"
        />
        @for (group of groups(); track group.label; let index = $index) {
          <div role="group" [attr.aria-labelledby]="groupId + '-' + index">
            <p class="group-label" [id]="groupId + '-' + index">{{ group.label }}</p>
            @for (item of group.items; track item.id) {
              <button type="button" class="item" (click)="chosen.emit(item.id)">
                <app-icon [name]="item.icon" />
                {{ item.label }}
                @if (item.detail !== undefined) {
                  <span class="count">{{ item.detail }}</span>
                }
              </button>
            }
          </div>
        }
      </div>
      <p class="drawer-footer">Funciona sin conexión. Tus facturas se guardan solo en este dispositivo.</p>
    </app-drawer>
  `,
  styles: `
    .drawer-header {
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

    .reference {
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

    .drawer-body {
      flex: 1;
      overflow: auto;
      display: grid;
      align-content: start;
      gap: var(--sp-1);
      padding: var(--sp-2) var(--sp-2) var(--sp-3);
    }

    .seal-row {
      margin: 6px var(--sp-2) var(--sp-2);
    }

    .group-label {
      margin: 0;
      padding: var(--sp-3) var(--sp-2) 6px;
      color: var(--fg-2);
      font-size: 10px;
      font-weight: var(--fw-bold);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .item {
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

    .item app-icon {
      width: 18px;
      height: 18px;
      color: var(--gem-900);
    }

    .item:hover {
      background: var(--gem-50);
    }

    .close:focus-visible,
    .item:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: -2px;
    }

    .count {
      margin-left: auto;
      color: var(--fg-2);
      font-size: var(--fs-12);
      font-variant-numeric: tabular-nums;
    }

    .drawer-footer {
      margin: 0;
      padding: var(--sp-3) var(--sp-4);
      border-top: 1px solid var(--border-1);
      color: var(--fg-2);
      font-size: 11px;
      line-height: 1.4;
    }
  `,
})
export class MenuDrawer<T extends string = string> {
  readonly open = model(false);
  /** The open invoice as the header writes it, e.g. `A-0001 · 0.00 CUP`. */
  readonly reference = input.required<string>();
  readonly pending = input.required<number>();
  /** The same commands as the "Más" menu, in order; consecutive items of a group sit together. */
  readonly items = input.required<readonly MenuItem<T>[]>();
  readonly chosen = output<T>();
  /** The Res. 55 seal row was chosen. */
  readonly sealActivated = output<void>();

  protected readonly groupId = `menu-drawer-group-${nextId++}`;

  /** The items split into runs of one group each, in order. */
  protected readonly groups = computed(() => {
    const groups: { label: string; items: MenuItem<T>[] }[] = [];
    for (const item of this.items()) {
      const last = groups[groups.length - 1];
      if (last?.label === item.group) {
        last.items.push(item);
      } else {
        groups.push({ label: item.group, items: [item] });
      }
    }
    return groups;
  });
}

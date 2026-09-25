import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Icon, type IconName } from './icon';

/** One entry of a `MenuButton` menu. */
export interface MenuItem {
  /** What `chosen` reports. */
  readonly id: string;
  readonly label: string;
  readonly icon: IconName;
  /** A short value after the label, such as a count or the next number. */
  readonly detail?: string;
  /** Draws a separator above the item, to group the ones below it. */
  readonly separatorBefore?: boolean;
}

let nextId = 0;

/**
 * A button that opens a menu, following the WAI-ARIA menu button pattern: Enter, Space or
 * ArrowDown open it on the first item and ArrowUp on the last; the arrows (wrapping), Home
 * and End move between items; Escape closes it and returns focus to the button, and Tab or a
 * click outside closes it where focus is. Choosing an item closes the menu, puts focus back
 * on the button and reports the item's id, so a panel it opens returns focus there too.
 */
@Component({
  selector: 'app-menu-button',
  imports: [Icon],
  host: { '(document:click)': 'onDocumentClick($event)' },
  template: `
    <button
      #trigger
      type="button"
      class="trigger"
      [id]="buttonId"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? menuId : null"
      (click)="toggle()"
      (keydown)="onButtonKeydown($event)"
    >
      {{ label() }}
      <app-icon name="chevron" />
    </button>
    @if (open()) {
      <div class="menu" role="menu" [id]="menuId" [attr.aria-labelledby]="buttonId" (keydown)="onMenuKeydown($event)">
        @for (item of items(); track item.id; let index = $index) {
          @if (item.separatorBefore) {
            <div class="separator" role="separator"></div>
          }
          <button
            #item
            type="button"
            class="item"
            role="menuitem"
            [tabIndex]="index === active() ? 0 : -1"
            (click)="choose(item.id)"
            (focus)="active.set(index)"
          >
            <app-icon [name]="item.icon" />
            {{ item.label }}
            @if (item.detail !== undefined) {
              <span class="detail">{{ item.detail }}</span>
            }
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-flex;
    }

    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid var(--border-control);
      border-radius: var(--radius-sm);
      background: var(--bg-0);
      color: var(--gem-900);
      font-size: 13px;
      font-weight: var(--fw-medium);
      white-space: nowrap;
      cursor: pointer;
    }

    .trigger:hover {
      background: var(--bg-2);
    }

    .trigger:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 2px;
    }

    .menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 15;
      display: grid;
      gap: 2px;
      width: 248px;
      padding: 6px;
      border: 1px solid var(--border-1);
      border-radius: var(--radius-sm);
      background: var(--bg-0);
      box-shadow: var(--shadow-md);
    }

    .separator {
      height: 1px;
      margin: 4px 6px;
      background: var(--border-1);
    }

    .item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 38px;
      padding: 0 10px;
      border: 0;
      border-radius: var(--radius-sm);
      background: var(--bg-0);
      color: var(--fg-1);
      font-size: 13px;
      font-weight: var(--fw-medium);
      text-align: left;
      cursor: pointer;
    }

    .item app-icon {
      color: var(--gem-900);
    }

    .item:hover,
    .item:focus {
      background: var(--gem-50);
    }

    .item:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: -2px;
    }

    .detail {
      margin-left: auto;
      color: var(--fg-2);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class MenuButton {
  /** The button's visible text and accessible name. */
  readonly label = input.required<string>();
  readonly items = input.required<readonly MenuItem[]>();
  /** The id of the item the user chose. */
  readonly chosen = output<string>();

  protected readonly open = signal(false);
  /** The item that holds the tab stop inside the open menu. */
  protected readonly active = signal(0);
  protected readonly buttonId = `menu-button-${nextId}`;
  protected readonly menuId = `menu-${nextId++}`;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly itemButtons = viewChildren<ElementRef<HTMLButtonElement>>('item');

  protected toggle(): void {
    if (this.open()) {
      this.close(true);
    } else {
      this.openAt(0);
    }
  }

  protected onButtonKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.openAt(event.key === 'ArrowDown' ? 0 : this.items().length - 1);
    }
  }

  protected onMenuKeydown(event: KeyboardEvent): void {
    const last = this.items().length - 1;
    const moves: Record<string, () => number> = {
      ArrowDown: () => (this.active() === last ? 0 : this.active() + 1),
      ArrowUp: () => (this.active() === 0 ? last : this.active() - 1),
      Home: () => 0,
      End: () => last,
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      this.focusItem(move());
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
    } else if (event.key === 'Tab') {
      // Focus moves on by itself; the menu only has to get out of the way.
      this.open.set(false);
    }
  }

  protected choose(id: string): void {
    this.close(true);
    this.chosen.emit(id);
  }

  protected onDocumentClick(event: Event): void {
    const target = event.target;
    if (this.open() && target instanceof Node && !this.host.nativeElement.contains(target)) {
      this.open.set(false);
    }
  }

  private openAt(index: number): void {
    this.open.set(true);
    afterNextRender(() => this.focusItem(index), { injector: this.injector });
  }

  private focusItem(index: number): void {
    this.active.set(index);
    this.itemButtons()[index]?.nativeElement.focus();
  }

  private close(restoreFocus: boolean): void {
    this.open.set(false);
    if (restoreFocus) {
      this.trigger().nativeElement.focus();
    }
  }
}

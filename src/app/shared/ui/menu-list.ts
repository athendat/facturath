import {
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { Icon, type IconName } from './icon';

/** One command of a menu; `T` is the set of commands, so a choice reports a known one. */
export interface MenuItem<T extends string = string> {
  /** What `chosen` reports. */
  readonly id: T;
  readonly label: string;
  readonly icon: IconName;
  /** A short value after the label, such as a count or the next number. */
  readonly detail?: string;
  /**
   * What the command acts on. Consecutive items of one group sit together: a menu draws a
   * separator between groups, the phone menu a labelled group.
   */
  readonly group: string;
}

/** Which item of a menu takes focus as it opens. */
export type MenuStart = 'first' | 'last';

/**
 * The open menu of a `MenuButton`, a chunk of its own so the header's initial bundle only
 * carries the button. It focuses its first or last item as it appears and handles the keys
 * inside the menu: the arrows (wrapping), Home and End move, Escape and Tab dismiss it.
 */
@Component({
  selector: 'app-menu-list',
  imports: [Icon],
  template: `
    <div
      class="menu"
      role="menu"
      [id]="menuId()"
      [attr.aria-labelledby]="labelledBy()"
      (keydown)="onKeydown($event)"
    >
      @for (item of items(); track item.id; let index = $index) {
        @if (index > 0 && item.group !== items()[index - 1].group) {
          <div class="separator" role="separator"></div>
        }
        <button
          #item
          type="button"
          class="item"
          role="menuitem"
          [tabIndex]="index === active() ? 0 : -1"
          (click)="chosen.emit(item.id)"
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
  `,
  styles: `
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
export class MenuList<T extends string = string> {
  readonly items = input.required<readonly MenuItem<T>[]>();
  readonly menuId = input.required<string>();
  /** The id of the button that names the menu. */
  readonly labelledBy = input.required<string>();
  /** Which item takes focus as the menu appears. */
  readonly start = input<MenuStart>('first');
  readonly chosen = output<T>();
  /** The menu asks to close; `true` when focus should go back to the button (Escape). */
  readonly dismissed = output<boolean>();

  /** The item that holds the tab stop. */
  protected readonly active = signal(0);
  private readonly itemButtons = viewChildren<ElementRef<HTMLButtonElement>>('item');

  constructor() {
    afterNextRender(() => this.focusItem(this.start() === 'first' ? 0 : this.items().length - 1));
  }

  protected onKeydown(event: KeyboardEvent): void {
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
      this.dismissed.emit(true);
    } else if (event.key === 'Tab') {
      // Focus moves on by itself; the menu only has to get out of the way.
      this.dismissed.emit(false);
    }
  }

  private focusItem(index: number): void {
    this.active.set(index);
    this.itemButtons()[index]?.nativeElement.focus();
  }
}

import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { Icon } from './icon';
import { MenuList, type MenuItem, type MenuStart } from './menu-list';

export type { MenuItem } from './menu-list';

let nextId = 0;

/**
 * A button that opens a menu, following the WAI-ARIA menu button pattern: Enter, Space or
 * ArrowDown open it on the first item and ArrowUp on the last; the arrows (wrapping), Home
 * and End move between items; Escape closes it and returns focus to the button, and Tab or a
 * click outside closes it where focus is. Choosing an item closes the menu, puts focus back
 * on the button and reports the item's id, so a panel it opens returns focus there too.
 * The open menu is a chunk of its own, fetched the first time it opens (#61).
 */
@Component({
  selector: 'app-menu-button',
  imports: [Icon, MenuList],
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
      (click)="open() ? close(true) : openAt('first')"
      (keydown.arrowdown)="$event.preventDefault(); openAt('first')"
      (keydown.arrowup)="$event.preventDefault(); openAt('last')"
    >
      {{ label() }}
      <app-icon name="chevron" />
    </button>
    @if (open()) {
      @defer (on immediate) {
        <app-menu-list
          [items]="items()"
          [menuId]="menuId"
          [labelledBy]="buttonId"
          [start]="start()"
          (chosen)="choose($event)"
          (dismissed)="close($event)"
        />
      }
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
  `,
})
export class MenuButton {
  /** The button's visible text and accessible name. */
  readonly label = input.required<string>();
  readonly items = input.required<readonly MenuItem[]>();
  /** The id of the item the user chose. */
  readonly chosen = output<string>();

  protected readonly open = signal(false);
  /** Which item the menu focuses as it opens. */
  protected readonly start = signal<MenuStart>('first');
  protected readonly buttonId = `menu-button-${nextId}`;
  protected readonly menuId = `menu-${nextId++}`;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  protected openAt(start: MenuStart): void {
    this.start.set(start);
    this.open.set(true);
  }

  protected close(restoreFocus: boolean): void {
    this.open.set(false);
    if (restoreFocus) {
      this.trigger().nativeElement.focus();
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
}

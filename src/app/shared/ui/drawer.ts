import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  afterEveryRender,
  effect,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let nextId = 0;

/**
 * A side panel over the page. While open it is a modal dialog: focus moves inside,
 * Tab cycles within it, Escape or the close button closes it, and focus returns to
 * the element that opened it. The parent projects the content and owns `open`.
 */
@Component({
  selector: 'app-drawer',
  template: `
    @if (open()) {
      <div class="backdrop" (click)="close()"></div>
      <section
        #panel
        class="panel"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
        tabindex="-1"
        (keydown)="onKeydown($event)"
      >
        <div class="panel-header">
          <h2 class="panel-title" [id]="titleId">{{ heading() }}</h2>
          <button type="button" class="close" (click)="close()">Cerrar</button>
        </div>
        <div class="panel-body">
          <ng-content />
        </div>
      </section>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 20;
      background: rgba(17, 24, 39, 0.35);
    }

    .panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 21;
      display: flex;
      flex-direction: column;
      width: min(400px, 100%);
      background: var(--bg-0);
      box-shadow: var(--shadow-md);
      outline: none;
      animation: slide-in var(--dur-3) var(--ease-standard);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-2);
      padding: var(--sp-3) var(--sp-4);
      border-bottom: 1px solid var(--border-1);
    }

    .panel-title {
      margin: 0;
      font-size: var(--fs-16);
      font-weight: var(--fw-bold);
    }

    .close {
      min-height: 32px;
      padding: 0 var(--sp-3);
      border: 1px solid var(--border-2);
      border-radius: var(--radius-xs);
      background: var(--bg-0);
      font-size: var(--fs-12);
      font-weight: var(--fw-medium);
      cursor: pointer;
    }

    .close:hover {
      background: var(--bg-2);
    }

    .close:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 2px;
    }

    .panel-body {
      flex: 1;
      overflow: auto;
      padding: var(--sp-3) var(--sp-4);
    }

    @keyframes slide-in {
      from {
        transform: translateX(100%);
      }
      to {
        transform: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .panel {
        animation: none;
      }
    }
  `,
})
export class Drawer {
  readonly open = model(false);
  /** The dialog's accessible name, shown as its heading. */
  readonly heading = input.required<string>();

  protected readonly titleId = `drawer-title-${nextId++}`;
  private readonly document = inject(DOCUMENT);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  /** Where focus was when the drawer opened; it goes back there on close. */
  private opener: HTMLElement | null = null;

  constructor() {
    // Before the opening render, while focus is still on whatever opened the drawer.
    effect(() => {
      if (this.open()) {
        this.opener ??= this.activeElement();
      }
    });
    // After every render: focus lands inside the open panel and stays there even when the
    // focused element was just removed (e.g. a deleted row), and goes back to the opener
    // once the panel is gone. A closed drawer with no opener costs nothing here.
    afterEveryRender(() => {
      const panel = this.panel()?.nativeElement;
      if (panel) {
        if (!panel.contains(this.document.activeElement)) {
          (this.focusable(panel)[0] ?? panel).focus();
        }
      } else if (this.opener) {
        this.opener.focus();
        this.opener = null;
      }
    });
  }

  close(): void {
    this.open.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = this.focusable(event.currentTarget as HTMLElement);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      return;
    }
    const active = this.activeElement();
    if (event.shiftKey && (active === first || active === event.currentTarget)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusable(root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
  }

  private activeElement(): HTMLElement | null {
    const active = this.document.activeElement;
    return active instanceof HTMLElement ? active : null;
  }
}

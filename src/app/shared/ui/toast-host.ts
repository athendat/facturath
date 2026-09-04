import { Component, input, output } from '@angular/core';
import type { Toast } from '../../core/toast';

/**
 * A slim banner that announces the current toast. The live region is always
 * in the DOM so screen readers announce messages when they appear. Toasts with
 * an action also get a dismiss button; the parent decides what both do.
 */
@Component({
  selector: 'app-toast-host',
  template: `
    <div class="toast" role="status" aria-live="polite" [class.visible]="toast() !== null">
      @if (toast(); as current) {
        <span>{{ current.message }}</span>
        @if (current.action; as action) {
          <button type="button" class="action" (click)="actionClicked.emit()">
            {{ action.label }}
          </button>
          <button type="button" class="dismiss" (click)="dismissed.emit()">Cerrar</button>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .toast {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: var(--sp-1) var(--sp-3);
      background: var(--gem-100);
      color: var(--gem-900);
      font-size: var(--fs-12);
      font-weight: var(--fw-medium);
      line-height: var(--lh-normal);
      text-align: center;
    }

    .toast.visible {
      padding: 6px var(--sp-3);
      animation: fade-in var(--dur-2) var(--ease-standard);
    }

    /* 24x24 minimum target (WCAG 2.2 AA 2.5.8). */
    button {
      min-width: 24px;
      min-height: 24px;
      margin: 0;
      padding: var(--sp-1) var(--sp-2);
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      font: inherit;
      color: inherit;
      text-decoration: underline;
      cursor: pointer;
    }

    .action {
      font-weight: var(--fw-bold);
    }

    button:hover {
      background: var(--gem-200);
    }

    button:focus-visible {
      outline: 2px solid var(--gem-900);
      outline-offset: 1px;
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .toast.visible {
        animation: none;
      }
    }

    @media print {
      :host {
        display: none;
      }
    }
  `,
})
export class ToastHost {
  readonly toast = input<Toast | null>(null);
  /** The user clicked the action button. */
  readonly actionClicked = output<void>();
  /** The user clicked the dismiss button. */
  readonly dismissed = output<void>();
}

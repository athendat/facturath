import { Component, ElementRef, computed, effect, input, model, viewChild } from '@angular/core';

/**
 * A borderless text input that sits inside the document. Font, color and
 * text alignment are inherited from the host element so the parent decides
 * the look; the parent also decides the width by styling the host.
 */
@Component({
  selector: 'app-inline-input',
  template: `
    <input
      #field
      [type]="type()"
      [attr.value]="value()"
      (input)="onInput($event)"
      [attr.aria-label]="label()"
      [placeholder]="placeholder()"
      [attr.inputmode]="inputModeAttribute()"
      autocomplete="off"
    />
    @if (type() === 'text') {
      <span class="print-value">{{ value() }}</span>
    }
  `,
  styles: `
    :host {
      --pad-y: 3px;

      display: block;
      min-width: 0;
    }

    input {
      display: block;
      width: 100%;
      margin: 0;
      padding: var(--pad-y) 4px;
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      font: inherit;
      color: inherit;
      text-align: inherit;
      outline: none;
    }

    input::placeholder {
      color: var(--fg-4);
      font-weight: var(--fw-regular);
    }

    input:hover {
      background: var(--gray-100);
    }

    input:focus {
      background: var(--bg-0);
      box-shadow: var(--focus-ring);
    }

    /* A single-line input cannot wrap, so on paper a text value is shown by this mirror
       instead: it wraps at the same width and nothing is clipped or ellipsized. */
    .print-value {
      display: none;
    }

    @media print {
      input[type='text'] {
        display: none;
      }

      .print-value {
        display: block;
        min-height: calc(1lh + 2 * var(--pad-y));
        padding: var(--pad-y) 4px;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }

      input,
      input:hover,
      input:focus {
        background: transparent;
        box-shadow: none;
      }

      /* Not just invisible: opacity 0 keeps the placeholder text out of the saved PDF. */
      input::placeholder {
        opacity: 0;
      }

      input::-webkit-calendar-picker-indicator {
        display: none;
      }
    }
  `,
  /* `blank` lets the parent collapse an empty field in print; the parent decides where that is right. */
  host: { '[class.blank]': 'value() === ""' },
})
export class InlineInput {
  readonly value = model('');
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly inputMode = input<'text' | 'decimal'>('text');
  /** A native date input emits ISO `YYYY-MM-DD` on `input`, which is what the model stores. */
  readonly type = input<'text' | 'date'>('text');

  /** `inputmode` only means something on a text input; a date input has its own editor. */
  protected readonly inputModeAttribute = computed(() =>
    this.type() === 'text' ? this.inputMode() : null,
  );

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  constructor() {
    // The `value` attribute above only seeds the prerendered markup. Later changes go through
    // the property, and only when the element does not already hold the value: echoing what
    // the user just typed back into a date input resets the segments they are still editing.
    effect(() => {
      const element = this.field().nativeElement;
      const value = this.value();
      if (element.value !== value) {
        element.value = value;
      }
    });
  }

  onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}

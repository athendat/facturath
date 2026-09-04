import { Component, input, model } from '@angular/core';

/**
 * A borderless text input that sits inside the document. Font, color and
 * text alignment are inherited from the host element so the parent decides
 * the look; the parent also decides the width by styling the host.
 */
@Component({
  selector: 'app-inline-input',
  template: `
    <input
      type="text"
      [value]="value()"
      (input)="onInput($event)"
      [attr.aria-label]="label()"
      [placeholder]="placeholder()"
      [attr.inputmode]="inputMode()"
      autocomplete="off"
    />
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    input {
      display: block;
      width: 100%;
      margin: 0;
      padding: 3px 4px;
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
  `,
})
export class InlineInput {
  readonly value = model('');
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly inputMode = input<'text' | 'decimal'>('text');

  onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }
}

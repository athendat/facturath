import { Component, ElementRef, effect, input, model, viewChild } from '@angular/core';

/**
 * The multiline sibling of `InlineInput`: a borderless textarea that sits inside
 * the document and inherits font and color from its host.
 */
@Component({
  selector: 'app-inline-textarea',
  template: `
    <textarea
      #field
      (input)="onInput($event)"
      [attr.aria-label]="label()"
      [placeholder]="placeholder()"
      [rows]="rows()"
      [style.--rows]="rows()"
      autocomplete="off"
      >{{ value() }}</textarea>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    textarea {
      --pad-y: 3px;

      display: block;
      width: 100%;
      margin: 0;
      padding: var(--pad-y) 4px;
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      font: inherit;
      line-height: 1.5;
      color: inherit;
      resize: vertical;
      outline: none;
    }

    textarea::placeholder {
      color: var(--fg-4);
    }

    textarea:hover {
      background: var(--gray-100);
    }

    textarea:focus {
      background: var(--bg-0);
      box-shadow: var(--focus-ring);
    }

    /* Print shows the whole text: the box grows with the content (Chromium) and
       never shrinks below its on-screen rows. Firefox keeps the rows box. */
    @media print {
      textarea,
      textarea:hover,
      textarea:focus {
        min-height: calc(var(--rows) * 1lh + 2 * var(--pad-y));
        background: transparent;
        box-shadow: none;
        field-sizing: content;
        resize: none;
        overflow: hidden;
      }

      textarea::placeholder {
        opacity: 0;
      }
    }
  `,
})
export class InlineTextarea {
  readonly value = model('');
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly rows = input(3);

  private readonly field = viewChild.required<ElementRef<HTMLTextAreaElement>>('field');

  constructor() {
    // The text node above seeds the prerendered markup; later changes go through the property,
    // and only when the element does not already hold the value, like `InlineInput`.
    effect(() => {
      const element = this.field().nativeElement;
      const value = this.value();
      if (element.value !== value) {
        element.value = value;
      }
    });
  }

  onInput(event: Event): void {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }
}

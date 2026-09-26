import { Component, ElementRef, effect, input, model, viewChild } from '@angular/core';

/**
 * A full-size labelled field for a bottom sheet (#64): a visible label over a 48px control
 * with 16px text, which also keeps iOS from zooming in when it takes focus. Multiline makes
 * it a textarea, and a list of options a select. The parent gives the control its id,
 * unique in the page.
 */
@Component({
  selector: 'app-sheet-field',
  template: `
    <label class="label" [for]="inputId()">{{ label() }}</label>
    @if (options(); as options) {
      <select #field class="control" [id]="inputId()" (change)="onInput($event)">
        @for (option of options; track option) {
          <option [value]="option">{{ option }}</option>
        }
      </select>
    } @else if (multiline()) {
      <textarea
        #field
        class="control"
        [id]="inputId()"
        rows="4"
        (input)="onInput($event)"
      ></textarea>
    } @else {
      <input
        #field
        class="control"
        [id]="inputId()"
        [type]="type()"
        [attr.inputmode]="inputMode()"
        autocomplete="off"
        (input)="onInput($event)"
      />
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .label {
      color: var(--fg-2);
      font-size: 13px;
      font-weight: var(--fw-medium);
    }

    .control {
      min-width: 0;
      min-height: 48px;
      padding: 0 var(--sp-3);
      border: 1px solid var(--border-control);
      border-radius: var(--radius-sm);
      background: var(--bg-0);
      font: inherit;
      font-size: 16px;
    }

    textarea.control {
      padding: var(--sp-3);
      line-height: var(--lh-normal);
      resize: vertical;
    }

    .control:focus {
      border-color: var(--gem-900);
      outline: none;
      box-shadow: 0 0 0 1px var(--gem-900);
    }
  `,
})
export class SheetField {
  readonly value = model('');
  readonly label = input.required<string>();
  /** The control's element id, which the label points at. */
  readonly inputId = input.required<string>();
  readonly type = input<'text' | 'date'>('text');
  /** The keyboard a phone shows: digits only, digits with a decimal separator, or text. */
  readonly inputMode = input<'numeric' | 'decimal' | null>(null);
  readonly multiline = input(false);
  /** The values to pick from, which makes the field a select. */
  readonly options = input<readonly string[] | null>(null);

  /** Inside an `@if`, so it only resolves once the view has rendered. */
  private readonly field =
    viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>('field');

  constructor() {
    // Only written when the control does not already hold the value, as in `InlineInput`:
    // echoing what the user just typed back into a date input resets the part being edited.
    effect(() => {
      const element = this.field()?.nativeElement;
      const value = this.value();
      if (element && element.value !== value) {
        element.value = value;
      }
    });
  }

  protected onInput(event: Event): void {
    this.value.set(
      (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value,
    );
  }
}

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InlineInput } from './inline-input';

@Component({
  imports: [InlineInput],
  template: `<app-inline-input label="Fecha de emisión" type="date" [(value)]="date" />`,
})
class DateHost {
  readonly date = signal('');
}

@Component({
  imports: [InlineInput],
  template: `<app-inline-input label="Cantidad" inputMode="decimal" [(value)]="quantity" />`,
})
class TextHost {
  readonly quantity = signal('1');
}

/** Sets the element value the way a keystroke does, bypassing any spy on the prototype setter. */
const nativeValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  'value',
)!.set!;

describe('InlineInput', () => {
  describe('type date', () => {
    let fixture: ComponentFixture<DateHost>;
    let input: HTMLInputElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [DateHost] }).compileComponents();
      fixture = TestBed.createComponent(DateHost);
      await fixture.whenStable();
      input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    });

    it('renders a native date input with the label and no inputmode', () => {
      expect(input.type).toBe('date');
      expect(input.getAttribute('aria-label')).toBe('Fecha de emisión');
      expect(input.hasAttribute('inputmode')).toBe(false);
      expect(input.value).toBe('');
    });

    it('emits the ISO date the user picks', async () => {
      input.value = '2026-09-04';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await fixture.whenStable();

      expect(fixture.componentInstance.date()).toBe('2026-09-04');
    });

    it('does not write the element back when it already holds what the user typed', async () => {
      // Chromium fires `input` with '' while a date segment is being cleared; echoing that ''
      // back into `value` wipes the other segments, so the element must be left alone.
      input.value = '2026-09-04';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await fixture.whenStable();
      const setter = vi.spyOn(HTMLInputElement.prototype, 'value', 'set');

      nativeValueSetter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await fixture.whenStable();

      expect(fixture.componentInstance.date()).toBe('');
      expect(setter).not.toHaveBeenCalled();
      setter.mockRestore();
    });

    it('writes the element when the bound value changes from outside', async () => {
      fixture.componentInstance.date.set('2026-10-01');
      await fixture.whenStable();

      expect(input.value).toBe('2026-10-01');
    });
  });

  describe('type text', () => {
    let fixture: ComponentFixture<TextHost>;
    let input: HTMLInputElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [TextHost] }).compileComponents();
      fixture = TestBed.createComponent(TextHost);
      await fixture.whenStable();
      input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    });

    it('renders the initial value with the given inputmode', () => {
      expect(input.type).toBe('text');
      expect(input.getAttribute('inputmode')).toBe('decimal');
      expect(input.value).toBe('1');
    });
  });
});

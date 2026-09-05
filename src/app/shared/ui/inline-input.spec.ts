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

    it('renders a native date input with the label', () => {
      expect(input.type).toBe('date');
      expect(input.getAttribute('aria-label')).toBe('Fecha de emisión');
      expect(input.value).toBe('');
    });

    it('emits the ISO date the user picks', async () => {
      input.value = '2026-09-04';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await fixture.whenStable();

      expect(fixture.componentInstance.date()).toBe('2026-09-04');
    });
  });
});

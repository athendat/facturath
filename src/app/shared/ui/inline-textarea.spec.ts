import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InlineTextarea } from './inline-textarea';

@Component({
  imports: [InlineTextarea],
  template: `
    <app-inline-textarea label="Notas" placeholder="Escribe aquí" [rows]="4" [(value)]="text" />
  `,
})
class Host {
  readonly text = signal('inicial');
}

describe('InlineTextarea', () => {
  let fixture: ComponentFixture<Host>;
  let textarea: HTMLTextAreaElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
  });

  it('renders a labelled textarea with the given rows, placeholder and value', () => {
    expect(textarea.getAttribute('aria-label')).toBe('Notas');
    expect(textarea.placeholder).toBe('Escribe aquí');
    expect(textarea.rows).toBe(4);
    expect(textarea.value).toBe('inicial');
  });

  it('writes what the user types back to the bound value', async () => {
    textarea.value = 'Entrega parcial\nGarantía 30 días';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.text()).toBe('Entrega parcial\nGarantía 30 días');
  });
});

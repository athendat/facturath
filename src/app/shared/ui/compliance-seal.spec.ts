import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComplianceSeal } from './compliance-seal';

@Component({
  imports: [ComplianceSeal],
  template: `<app-compliance-seal [pending]="pending()" [row]="row()" (activated)="clicks = clicks + 1" />`,
})
class Host {
  readonly pending = signal(11);
  readonly row = signal(false);
  clicks = 0;
}

describe('ComplianceSeal', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  function seal(): HTMLButtonElement {
    return element.querySelector('button') as HTMLButtonElement;
  }

  function visibleText(): string {
    return (seal().textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  it('shows the pending count in amber while data points are missing', () => {
    expect(visibleText()).toBe('11 Res. 55 · 11 pendientes');
    expect(seal().classList.contains('complete')).toBe(false);
    // Label in name (WCAG 2.5.3): the name starts with the visible text, then says what it counts.
    expect(seal().getAttribute('aria-label')).toBe('Res. 55 · 11 pendientes, datos obligatorios');
  });

  it('turns green with a check once nothing is pending, named by what it shows', async () => {
    fixture.componentInstance.pending.set(0);
    await fixture.whenStable();

    expect(visibleText()).toBe('Res. 55 completa');
    expect(seal().classList.contains('complete')).toBe(true);
    expect(seal().querySelector('.ring svg')).not.toBeNull();
    expect(seal().getAttribute('aria-label')).toBe('Res. 55 completa');
  });

  it('hides the ring from assistive technology, since the name already says the count', () => {
    expect(seal().querySelector('.ring')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('adds a "Ver" cue as a full-width row', async () => {
    fixture.componentInstance.row.set(true);
    await fixture.whenStable();

    expect(seal().classList.contains('row')).toBe(true);
    expect(visibleText()).toBe('11 Res. 55 · 11 pendientes Ver');
    expect(seal().getAttribute('aria-label')).toBe('Res. 55 · 11 pendientes, datos obligatorios. Ver');

    fixture.componentInstance.pending.set(0);
    await fixture.whenStable();
    expect(seal().getAttribute('aria-label')).toBe('Res. 55 completa. Ver');
  });

  it('reports a click', () => {
    seal().click();
    expect(fixture.componentInstance.clicks).toBe(1);
  });
});

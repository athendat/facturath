import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { findButton } from '../../core/testing/dom';
import { Drawer } from './drawer';

@Component({
  imports: [Drawer],
  template: `
    <button type="button" (click)="open.set(true)">Abrir</button>
    <app-drawer [(open)]="open" heading="Guardadas">
      <button type="button">Primero</button>
      <button type="button">Segundo</button>
    </app-drawer>
  `,
})
class Host {
  readonly open = signal(false);
}

describe('Drawer', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement as HTMLElement;
    document.body.appendChild(element);
    await fixture.whenStable();
  });

  afterEach(() => {
    element.remove();
  });

  function dialog(): HTMLElement | null {
    return element.querySelector<HTMLElement>('[role="dialog"]');
  }

  function keydown(key: string, shiftKey = false): void {
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }),
    );
  }

  async function openFromButton(): Promise<HTMLButtonElement> {
    const opener = findButton(element, 'Abrir') as HTMLButtonElement;
    opener.focus();
    opener.click();
    await fixture.whenStable();
    return opener;
  }

  it('renders nothing while closed', () => {
    expect(dialog()).toBeNull();
  });

  it('opens as a modal dialog labelled by its heading and moves focus inside', async () => {
    await openFromButton();

    const panel = dialog();
    expect(element.querySelector('app-drawer')?.hasAttribute('title')).toBe(false);
    expect(panel?.getAttribute('aria-modal')).toBe('true');
    const title = panel?.getAttribute('aria-labelledby');
    expect(title).toBeTruthy();
    expect(document.getElementById(title as string)?.textContent?.trim()).toBe('Guardadas');
    expect(panel?.contains(document.activeElement)).toBe(true);
  });

  it('keeps Tab inside the dialog in both directions', async () => {
    await openFromButton();
    const first = findButton(element, 'Cerrar') as HTMLButtonElement;
    const last = findButton(element, 'Segundo') as HTMLButtonElement;

    last.focus();
    keydown('Tab');
    expect(document.activeElement).toBe(first);

    keydown('Tab', true);
    expect(document.activeElement).toBe(last);
  });

  it('closes with Escape and gives focus back to the opener', async () => {
    const opener = await openFromButton();

    keydown('Escape');
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(fixture.componentInstance.open()).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('closes from its close button', async () => {
    const opener = await openFromButton();

    findButton(element, 'Cerrar')?.click();
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

@Component({
  imports: [Drawer],
  template: `
    <button type="button" (click)="open.set(true)">Abrir</button>
    <app-drawer [(open)]="open" heading="Menú" [bare]="true">
      <div class="own-header">
        <button type="button" aria-label="Cerrar menú" (click)="open.set(false)">x</button>
      </div>
      <button type="button">Ajustes</button>
    </app-drawer>
  `,
})
class BareHost {
  readonly open = signal(false);
}

describe('Drawer without its own header', () => {
  let fixture: ComponentFixture<BareHost>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BareHost] }).compileComponents();
    fixture = TestBed.createComponent(BareHost);
    element = fixture.nativeElement as HTMLElement;
    document.body.appendChild(element);
    await fixture.whenStable();
  });

  afterEach(() => {
    element.remove();
  });

  function dialog(): HTMLElement | null {
    return element.querySelector<HTMLElement>('[role="dialog"]');
  }

  it('leaves the header to the content and takes its name from the heading', async () => {
    findButton(element, 'Abrir')?.click();
    await fixture.whenStable();

    expect(dialog()?.getAttribute('aria-modal')).toBe('true');
    expect(dialog()?.getAttribute('aria-label')).toBe('Menú');
    expect(dialog()?.hasAttribute('aria-labelledby')).toBe(false);
    expect(dialog()?.querySelector('h2')).toBeNull();
    expect(findButton(element, 'Cerrar')).toBeUndefined();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Cerrar menú');
  });

  it('still closes on Escape and gives focus back to the opener', async () => {
    const opener = findButton(element, 'Abrir') as HTMLButtonElement;
    opener.focus();
    opener.click();
    await fixture.whenStable();

    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

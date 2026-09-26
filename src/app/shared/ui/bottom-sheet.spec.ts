import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { findButton } from '../../core/testing/dom';
import { BottomSheet } from './bottom-sheet';

@Component({
  imports: [BottomSheet],
  template: `
    <button type="button" (click)="open.set(true)">Abrir</button>
    <app-bottom-sheet [(open)]="open" heading="Comprador">
      <label for="name">Nombre</label>
      <input id="name" />
      <button type="button" sheetAction (click)="removed.set(true)">Eliminar</button>
    </app-bottom-sheet>
  `,
})
class Host {
  readonly open = signal(false);
  readonly removed = signal(false);
}

describe('BottomSheet', () => {
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

  it('opens as a modal dialog from the bottom, named by its heading, with focus inside', async () => {
    await openFromButton();

    expect(dialog()?.getAttribute('aria-modal')).toBe('true');
    expect(dialog()?.classList.contains('bottom')).toBe(true);
    expect(dialog()?.getAttribute('aria-label')).toBe('Comprador');
    expect(dialog()?.querySelector('h2')?.textContent?.trim()).toBe('Comprador');
    expect(dialog()?.querySelector('.handle')?.getAttribute('aria-hidden')).toBe('true');
    expect(dialog()?.contains(document.activeElement)).toBe(true);
  });

  it('closes from Listo, from its close button, on Escape and on the scrim, focus back on the opener', async () => {
    const closers: [string, () => void][] = [
      ['Listo', () => findButton(element, 'Listo')?.click()],
      ['Cerrar', () => element.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')?.click()],
      [
        'Escape',
        () =>
          document.activeElement?.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
          ),
      ],
      ['scrim', () => element.querySelector<HTMLElement>('.backdrop')?.click()],
    ];

    for (const [name, close] of closers) {
      const opener = await openFromButton();
      expect(dialog(), name).not.toBeNull();

      close();
      await fixture.whenStable();

      expect(dialog(), name).toBeNull();
      expect(fixture.componentInstance.open(), name).toBe(false);
      expect(document.activeElement, name).toBe(opener);
    }
  });

  it('puts the content actions beside Listo, which comes last', async () => {
    await openFromButton();

    const footer = dialog()?.querySelector('.footer');
    expect(Array.from(footer?.querySelectorAll('button') ?? []).map((b) => b.textContent?.trim())).toEqual([
      'Eliminar',
      'Listo',
    ]);
    findButton(element, 'Eliminar')?.click();
    expect(fixture.componentInstance.removed()).toBe(true);
  });
});

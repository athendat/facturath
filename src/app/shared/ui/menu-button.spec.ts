import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MenuButton, type MenuItem } from './menu-button';

@Component({
  imports: [MenuButton],
  template: `
    <app-menu-button label="Más" [items]="items" (chosen)="chosen.push($event)" />
    <p>Fuera</p>
  `,
})
class Host {
  readonly items: readonly MenuItem<'new' | 'saved' | 'file' | 'settings'>[] = [
    { id: 'new', label: 'Nueva factura', icon: 'new', detail: 'A-0002', group: 'Esta factura' },
    { id: 'saved', label: 'Facturas guardadas', icon: 'list', detail: '0', group: 'Tus facturas' },
    { id: 'file', label: 'Exportar / importar', icon: 'file', group: 'Tus facturas' },
    { id: 'settings', label: 'Ajustes', icon: 'settings', group: 'App' },
  ];
  readonly chosen: string[] = [];
}

describe('MenuButton', () => {
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

  function button(): HTMLButtonElement {
    return element.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement;
  }

  function menu(): HTMLElement | null {
    return element.querySelector<HTMLElement>('[role="menu"]');
  }

  function items(): HTMLElement[] {
    return Array.from(element.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  }

  function text(node: Element | null | undefined): string {
    return (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  }

  async function key(target: Element | null, name: string): Promise<void> {
    target?.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  async function open(): Promise<void> {
    button().focus();
    button().click();
    await fixture.whenStable();
  }

  it('is a closed menu button named by its label', () => {
    expect(text(button())).toBe('Más');
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(menu()).toBeNull();
  });

  it('opens a labelled menu with a separator between groups on click, focusing the first item', async () => {
    await open();

    expect(button().getAttribute('aria-expanded')).toBe('true');
    expect(button().getAttribute('aria-controls')).toBe(menu()?.id);
    expect(menu()?.getAttribute('aria-labelledby')).toBe(button().id);
    expect(items().map(text)).toEqual([
      'Nueva factura A-0002',
      'Facturas guardadas 0',
      'Exportar / importar',
      'Ajustes',
    ]);
    expect(menu()?.querySelectorAll('[role="separator"]')).toHaveLength(2);
    expect(document.activeElement).toBe(items()[0]);
  });

  it('closes again from the button', async () => {
    await open();
    button().click();
    await fixture.whenStable();

    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(menu()).toBeNull();
  });

  it('opens from the keyboard on the first item with ArrowDown and on the last with ArrowUp', async () => {
    button().focus();
    await key(button(), 'ArrowDown');
    expect(document.activeElement).toBe(items()[0]);

    await key(document.activeElement, 'Escape');
    await key(button(), 'ArrowUp');
    expect(document.activeElement).toBe(items()[3]);
  });

  it('moves between items with the arrows, wrapping, and jumps with Home and End', async () => {
    await open();

    await key(document.activeElement, 'ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    await key(document.activeElement, 'ArrowUp');
    await key(document.activeElement, 'ArrowUp');
    expect(document.activeElement).toBe(items()[3]);
    await key(document.activeElement, 'ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    await key(document.activeElement, 'End');
    expect(document.activeElement).toBe(items()[3]);
    await key(document.activeElement, 'Home');
    expect(document.activeElement).toBe(items()[0]);
  });

  it('keeps only the focused item in the tab sequence', async () => {
    await open();
    await key(document.activeElement, 'ArrowDown');

    expect(items().map((item) => item.tabIndex)).toEqual([-1, 0, -1, -1]);
  });

  it('closes on Escape and returns focus to the button', async () => {
    await open();
    await key(document.activeElement, 'ArrowDown');

    await key(document.activeElement, 'Escape');

    expect(menu()).toBeNull();
    expect(button().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button());
  });

  it('closes when Tab moves focus on', async () => {
    await open();

    await key(document.activeElement, 'Tab');

    expect(menu()).toBeNull();
  });

  it('closes on a click outside, leaving focus alone', async () => {
    await open();
    const outside = element.querySelector('p') as HTMLElement;

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(menu()).toBeNull();
  });

  it('reports the chosen item, closes and gives focus back to the button', async () => {
    await open();

    items()[2].click();
    await fixture.whenStable();

    expect(fixture.componentInstance.chosen).toEqual(['file']);
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(button());
  });
});

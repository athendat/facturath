import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ObjectUrls } from '../../core/object-urls';
import { SettingsStore } from '../../core/settings-store';
import { FakeObjectUrls } from '../../core/testing/fake-object-urls';
import { CompliancePanel } from './compliance-panel';
import { InvoiceEditor } from './invoice-editor';
import { InvoiceStore } from './invoice-store';

/** The panel next to the document it inspects, opened from a button like the header does. */
@Component({
  imports: [CompliancePanel, InvoiceEditor],
  template: `
    <button type="button" (click)="open.set(true)">Res. 55</button>
    <app-invoice-editor />
    <app-compliance-panel [(open)]="open" />
  `,
})
class Host {
  readonly open = signal(false);
}

describe('CompliancePanel', () => {
  let fixture: ComponentFixture<Host>;
  let element: HTMLElement;
  let store: InvoiceStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [{ provide: ObjectUrls, useValue: new FakeObjectUrls() }],
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    element = fixture.nativeElement as HTMLElement;
    store = TestBed.inject(InvoiceStore);
    await fixture.whenStable();
  });

  function dialog(): HTMLElement | null {
    return element.querySelector<HTMLElement>('[role="dialog"]');
  }

  function items(): HTMLElement[] {
    return Array.from(dialog()?.querySelectorAll<HTMLElement>('li') ?? []);
  }

  async function open(): Promise<HTMLButtonElement> {
    const opener = element.querySelector('button') as HTMLButtonElement;
    opener.focus();
    opener.click();
    await fixture.whenStable();
    return opener;
  }

  it('lists the 13 data points in order with their state as text', async () => {
    store.setField('issueDate', '2026-09-19');
    TestBed.inject(SettingsStore).setSection('showCarrier', false);
    await open();

    expect(dialog()?.querySelector('h2')?.textContent?.trim()).toBe('Datos obligatorios');
    expect(dialog()?.textContent).toContain('Resolución 55/2021 del Ministerio de Finanzas y Precios.');
    expect(items()).toHaveLength(13);
    expect(items()[0]?.textContent?.replace(/\s+/g, ' ')).toContain('1');
    expect(items()[0]?.textContent).toContain('Fecha de emisión.');
    expect(items()[0]?.textContent).toContain('Encabezado · fecha');
    expect(items()[0]?.textContent).toContain('Completo');
    expect(items()[1]?.textContent).toContain('Pendiente');
    expect(items()[4]?.textContent).toContain('No aplica');
    expect(items()[12]?.textContent).toContain('Número consecutivo del modelo.');
  });

  it('offers a button only on pending entries', async () => {
    store.setField('issueDate', '2026-09-19');
    await open();

    expect(items()[0]?.querySelector('button')).toBeNull();
    expect(items()[1]?.querySelector('button')?.textContent?.trim()).toBe('Ir al campo');
  });

  it('closes and focuses the first missing field of a pending entry when clicked', async () => {
    const opener = await open();
    expect(dialog()?.contains(document.activeElement)).toBe(true);

    items()[1]?.querySelector('button')?.click();
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(document.activeElement).not.toBe(opener);
    expect(document.activeElement?.id).toBe('field-seller-name');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Nombre o razón social del vendedor');
  });

  it('is marked so print never shows it', () => {
    expect(element.querySelector('app-compliance-panel')?.hasAttribute('data-print-hide')).toBe(true);
  });
});

import type { Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { App, SAVING_DISABLED_NOTICE } from './app';
import { PageReloader } from './core/page-reloader';
import { Printer } from './core/printer';
import { ObjectUrls } from './core/object-urls';
import { SettingsStore } from './core/settings-store';
import { InMemoryPreferencesStore } from './core/storage/in-memory-preferences-store';
import { ASSET_STORE, INVOICE_REPOSITORY, PREFERENCES_STORE } from './core/storage/ports';
import { provideStorage } from './core/storage/provide-storage';
import { StorageStatus } from './core/storage/storage-status';
import { findButton, findByText, typeInto, visibleText } from './core/testing/dom';
import { FakeObjectUrls } from './core/testing/fake-object-urls';
import { provideNoIndexedDb } from './core/testing/fake-storage';
import { FakeSwUpdate, versionReady } from './core/testing/fake-sw-update';
import { ToastService } from './core/toast';
import { createInvoice, type Invoice } from './domain/invoice';
import { createEmptyProfile } from './domain/seller-profile';
import { InvoiceStore } from './features/invoice-editor/invoice-store';
import { SavedInvoicesStore } from './features/saved-invoices/saved-invoices-store';

/** A 1x1 PNG as base64, for export files with a real image. */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/** The live regions under `root` whose text is the saving-disabled notice. */
function notices(root: HTMLElement): Element[] {
  return Array.from(root.querySelectorAll('[role="status"]')).filter(
    (region) => region.textContent?.trim() === SAVING_DISABLED_NOTICE,
  );
}

/** An invoice with all 13 Res. 55 data points filled in. */
function completeInvoice(): Invoice {
  const party = {
    name: 'Nombre',
    address: 'Calle 1',
    nit: '12345',
    identityCard: '80010112345',
    commercialRegistry: 'RC-1',
    bankAccount: '9200',
    bankBranch: 'Sucursal 1',
  };
  return {
    ...createInvoice('complete-1'),
    issueDate: '2026-09-19',
    concept: 'Venta de mercancías',
    seller: { ...party },
    buyer: { ...party },
    lines: [{ code: '1', description: 'Servicio', detail: '', unit: 'u', quantity: '2', unitPrice: '10' }],
    tax: { name: 'Impuesto sobre ventas', percent: '10' },
    carrier: { name: 'Portador', identityCard: '80010154321', plate: 'P123', waybill: '', railwayBox: '' },
    signatures: { delivers: 'Ana', receives: 'Luis', carrier: 'Omar', books: 'Iris' },
  };
}

/** The visible text of the items in the header's Más menu, which is left closed again. */
async function moreItems(fixture: ComponentFixture<App>): Promise<string[]> {
  const root = fixture.nativeElement as HTMLElement;
  const more = root.querySelector<HTMLButtonElement>('.app-header button[aria-haspopup="menu"]');
  more?.click();
  await fixture.whenStable();
  const items = Array.from(root.querySelectorAll('[role="menuitem"]')).map(visibleText);
  more?.click();
  await fixture.whenStable();
  return items;
}

/** Opens the header's Más menu and chooses the item whose visible text is `item`. */
async function chooseFromMore(fixture: ComponentFixture<App>, item: string): Promise<void> {
  const root = fixture.nativeElement as HTMLElement;
  const more = root.querySelector<HTMLButtonElement>('.app-header button[aria-haspopup="menu"]');
  more?.focus();
  more?.click();
  await fixture.whenStable();
  const choice = findByText(root, '[role="menuitem"]', item);
  expect(choice).toBeDefined();
  choice?.click();
  await fixture.whenStable();
}

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let compiled: HTMLElement;
  let swUpdate: FakeSwUpdate;
  let reload: ReturnType<typeof vi.fn>;
  let print: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    swUpdate = new FakeSwUpdate();
    reload = vi.fn();
    print = vi.fn();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: SwUpdate, useValue: swUpdate },
        { provide: PageReloader, useValue: { reload } },
        { provide: Printer, useValue: { print } },
        { provide: ObjectUrls, useValue: new FakeObjectUrls() },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    compiled = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  function statusText(): string | undefined {
    return compiled.querySelector('[role="status"]')?.textContent?.trim();
  }

  it('renders the FACTURATH wordmark in the header', () => {
    expect(compiled.querySelector('header')?.textContent).toContain('FACTURATH');
  });

  it('prints from a header button, only when clicked', async () => {
    const button = findButton(compiled, 'PDF / Imprimir');

    expect(button?.closest('header')).not.toBeNull();
    expect(print).not.toHaveBeenCalled();

    button?.click();
    await fixture.whenStable();

    expect(print).toHaveBeenCalledOnce();
  });

  it('points to BALANC in a single footer line outside the document', () => {
    const footers = compiled.querySelectorAll('footer');
    const footer = footers[0];
    const link = footer?.querySelector<HTMLAnchorElement>('a');

    expect(footers).toHaveLength(1);
    expect(footer?.closest('main')).toBeNull();
    expect(footer?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'FACTURATH es gratis y funciona sin conexión. Para contabilidad completa, conoce BALANC.',
    );
    expect(link?.textContent?.trim()).toBe('BALANC');
    expect(link?.href).toBe('https://balanc.athendat.site/');
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toContain('noopener');
  });

  it('marks the header bar and the footer so print hides them', () => {
    const top = compiled.querySelector('.app-top');
    const footer = compiled.querySelector('footer');

    expect(top?.contains(compiled.querySelector('header'))).toBe(true);
    expect(top?.hasAttribute('data-print-hide')).toBe(true);
    expect(footer?.hasAttribute('data-print-hide')).toBe(true);
  });

  it('renders the current toast in a live region', async () => {
    TestBed.inject(ToastService).show('Factura guardada.');
    await fixture.whenStable();

    expect(statusText()).toContain('Factura guardada.');
  });

  it('offers to reload when a new version is ready and reloads only on click', async () => {
    swUpdate.versionUpdates.next(versionReady);
    await fixture.whenStable();

    expect(statusText()).toContain('Hay una versión nueva de FACTURATH.');
    expect(reload).not.toHaveBeenCalled();

    findButton(compiled, 'Actualizar')?.click();
    await fixture.whenStable();

    expect(reload).toHaveBeenCalledOnce();
    expect(statusText()).toBe('');
  });

  it('dismisses the update toast without reloading', async () => {
    swUpdate.versionUpdates.next(versionReady);
    await fixture.whenStable();

    findButton(compiled, 'Cerrar')?.click();
    await fixture.whenStable();

    expect(reload).not.toHaveBeenCalled();
    expect(statusText()).toBe('');
  });

  describe('header actions', () => {
    function more(): HTMLButtonElement | null {
      return compiled.querySelector<HTMLButtonElement>('.app-header button[aria-haspopup="menu"]');
    }

    function seal(): HTMLButtonElement | null {
      return compiled.querySelector<HTMLButtonElement>('.app-header app-compliance-seal button');
    }

    async function openMore(): Promise<void> {
      more()?.focus();
      more()?.click();
      await fixture.whenStable();
    }

    it('keeps the seal, Guardar, PDF / Imprimir and Más in the header row', () => {
      const row = Array.from(compiled.querySelectorAll('.app-header .actions > *')).map(
        (element) => element.tagName.toLowerCase() + ':' + visibleText(element),
      );

      expect(row).toEqual([
        'app-compliance-seal:11 Res. 55 · 11 pendientes',
        'span:',
        'button:Guardar',
        'button:PDF / Imprimir',
        'app-menu-button:Más',
        expect.stringMatching(/^button:/),
      ]);
      expect(compiled.querySelector('.app-header .divider')?.getAttribute('aria-hidden')).toBe('true');
      // PDF / Imprimir is the only filled button.
      expect(compiled.querySelectorAll('.app-header .primary')).toHaveLength(1);
      expect(findButton(compiled, 'PDF / Imprimir')?.classList.contains('primary')).toBe(true);
    });

    it('lists the four other commands in the Más menu, grouped, with the number a new invoice would take and the count', async () => {
      expect(more()?.getAttribute('aria-expanded')).toBe('false');

      await openMore();

      const menu = compiled.querySelector('[role="menu"]');
      // Nothing is saved yet, so a new invoice would take A-0001 again, which is what it shows.
      expect(Array.from(menu?.querySelectorAll('[role="menuitem"]') ?? []).map(visibleText)).toEqual([
        'Nueva factura A-0001',
        'Facturas guardadas 0',
        'Exportar / importar',
        'Ajustes',
      ]);
      expect(menu?.querySelectorAll('[role="separator"]')).toHaveLength(2);
      expect(menu?.closest('[data-print-hide]')).not.toBeNull();
    });

    it('opens each panel from the Más menu and returns focus to Más when it closes', async () => {
      for (const [item, heading] of [
        ['Facturas guardadas 0', 'Facturas guardadas'],
        ['Exportar / importar', 'Archivo'],
        ['Ajustes', 'Ajustes'],
      ]) {
        await openMore();
        findByText(compiled, '[role="menuitem"]', item)?.click();
        await fixture.whenStable();

        const dialog = compiled.querySelector<HTMLElement>('[role="dialog"]');
        expect(dialog?.querySelector('h2')?.textContent?.trim()).toBe(heading);
        expect(compiled.querySelector('[role="menu"]')).toBeNull();

        dialog?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        );
        await fixture.whenStable();
        expect(compiled.querySelector('[role="dialog"]')).toBeNull();
        expect(document.activeElement).toBe(more());
      }
    });

    it('shows the pending count on the seal and opens the compliance panel from it', async () => {
      expect(seal()?.getAttribute('aria-label')).toBe('Res. 55 · 11 pendientes, datos obligatorios');

      typeInto(compiled, 'Concepto de la operación', 'Venta de mercancías');
      await fixture.whenStable();
      expect(seal()?.getAttribute('aria-label')).toBe('Res. 55 · 10 pendientes, datos obligatorios');
      expect(visibleText(seal())).toBe('10 Res. 55 · 10 pendientes');

      seal()?.focus();
      seal()?.click();
      await fixture.whenStable();
      expect(compiled.querySelector('[role="dialog"] h2')?.textContent?.trim()).toBe(
        'Datos obligatorios',
      );
    });

    it('turns the seal green once nothing is pending', async () => {
      TestBed.inject(InvoiceStore).load(completeInvoice());
      await fixture.whenStable();
      expect(TestBed.inject(InvoiceStore).pendingCount()).toBe(0);

      expect(visibleText(seal())).toBe('Res. 55 completa');
      expect(seal()?.classList.contains('complete')).toBe(true);
      expect(seal()?.getAttribute('aria-label')).toBe('Res. 55 completa');
    });
  });

  describe('phone menu', () => {
    function hamburger(): HTMLButtonElement | null {
      return compiled.querySelector<HTMLButtonElement>('.app-header .hamburger');
    }

    function dialog(): HTMLElement | null {
      return compiled.querySelector<HTMLElement>('[role="dialog"]');
    }

    async function openMenu(): Promise<void> {
      hamburger()?.focus();
      hamburger()?.click();
      await fixture.whenStable();
    }

    async function escape(): Promise<void> {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();
    }

    it('carries the pending count on the hamburger, in its name and as a badge', async () => {
      const badge = () => hamburger()?.querySelector('.badge');
      expect(hamburger()?.getAttribute('aria-label')).toBe(
        'Menú de acciones, 11 datos obligatorios pendientes',
      );
      expect(badge()?.textContent?.trim()).toBe('11');
      expect(badge()?.getAttribute('aria-hidden')).toBe('true');

      TestBed.inject(InvoiceStore).load(completeInvoice());
      await fixture.whenStable();

      expect(hamburger()?.getAttribute('aria-label')).toBe('Menú de acciones');
      expect(badge()).toBeNull();
    });

    it('opens a print-hidden modal drawer with the invoice, the seal and the grouped commands', async () => {
      expect(hamburger()?.getAttribute('aria-haspopup')).toBe('dialog');
      expect(hamburger()?.getAttribute('aria-expanded')).toBe('false');

      await openMenu();

      expect(hamburger()?.getAttribute('aria-expanded')).toBe('true');
      expect(dialog()?.getAttribute('aria-modal')).toBe('true');
      expect(dialog()?.getAttribute('aria-label')).toBe('Menú');
      expect(dialog()?.closest('[data-print-hide]')).not.toBeNull();
      expect(visibleText(dialog()?.querySelector('.drawer-header .wordmark'))).toBe('FACTURATH');
      expect(visibleText(dialog()?.querySelector('.drawer-header .reference'))).toBe(
        `Factura ${TestBed.inject(InvoiceStore).headerReference()}`,
      );
      expect(visibleText(dialog()?.querySelector('app-compliance-seal'))).toBe(
        '11 Res. 55 · 11 pendientes Ver',
      );
      const groups = Array.from(dialog()?.querySelectorAll('[role="group"]') ?? []).map((group) => [
        document.getElementById(group.getAttribute('aria-labelledby') ?? '')?.textContent?.trim(),
        ...Array.from(group.querySelectorAll('button')).map(visibleText),
      ]);
      expect(groups).toEqual([
        ['Esta factura', 'Nueva factura A-0001'],
        ['Tus facturas', 'Facturas guardadas 0', 'Exportar / importar'],
        ['App', 'Ajustes'],
      ]);
      expect(visibleText(dialog()?.querySelector('.drawer-footer'))).toBe(
        'Funciona sin conexión. Tus facturas se guardan solo en este dispositivo.',
      );
      expect(dialog()?.contains(document.activeElement)).toBe(true);
    });

    it('closes from its close button and on Escape, giving focus back to the hamburger', async () => {
      await openMenu();
      dialog()?.querySelector<HTMLButtonElement>('button[aria-label="Cerrar menú"]')?.click();
      await fixture.whenStable();
      expect(dialog()).toBeNull();
      expect(document.activeElement).toBe(hamburger());

      await openMenu();
      await escape();
      expect(dialog()).toBeNull();
      expect(hamburger()?.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(hamburger());
    });

    it('closes itself before opening a panel, and that panel gives focus back to the hamburger', async () => {
      for (const [item, heading] of [
        ['Facturas guardadas 0', 'Facturas guardadas'],
        ['Exportar / importar', 'Archivo'],
        ['Ajustes', 'Ajustes'],
        ['11 Res. 55 · 11 pendientes Ver', 'Datos obligatorios'],
      ]) {
        await openMenu();
        findByText(dialog() as HTMLElement, 'button', item)?.click();
        await fixture.whenStable();

        const dialogs = compiled.querySelectorAll('[role="dialog"]');
        expect(dialogs).toHaveLength(1);
        expect(dialogs[0].querySelector('h2')?.textContent?.trim()).toBe(heading);

        await escape();
        expect(dialog()).toBeNull();
        expect(document.activeElement).toBe(hamburger());
      }
    });

    /** Opens `item` from the phone menu, checks focus is in its panel, closes it with Escape. */
    async function openAndCloseFromMenu(item: string, heading: string): Promise<void> {
      await openMenu();
      findByText(dialog() as HTMLElement, 'button', item)?.click();
      await fixture.whenStable();

      const panel = dialog();
      expect(panel?.querySelector('h2')?.textContent?.trim()).toBe(heading);
      expect(panel?.contains(document.activeElement)).toBe(true);

      await escape();
      expect(dialog()).toBeNull();
      expect(document.activeElement).toBe(hamburger());
    }

    it('keeps focus in a panel opened from the drawer, the same one twice and others after it', async () => {
      await openAndCloseFromMenu('Ajustes', 'Ajustes');
      await openAndCloseFromMenu('Ajustes', 'Ajustes');
      await openAndCloseFromMenu('Exportar / importar', 'Archivo');
      await openAndCloseFromMenu('Ajustes', 'Ajustes');
      await openAndCloseFromMenu('11 Res. 55 · 11 pendientes Ver', 'Datos obligatorios');
    });

    it('keeps focus in a panel that already existed before the drawer was first opened', async () => {
      // Opened once from Más, the settings panel exists before the menu drawer does, so its
      // focus hook runs first on the render that swaps the drawer for the panel.
      await chooseFromMore(fixture, 'Ajustes');
      await escape();
      expect(dialog()).toBeNull();

      await openAndCloseFromMenu('Ajustes', 'Ajustes');
    });

    it('starts a new invoice from the drawer and closes it', async () => {
      findButton(compiled, 'Guardar')?.click();
      await fixture.whenStable();
      await openMenu();

      findByText(dialog() as HTMLElement, 'button', 'Nueva factura A-0002')?.click();
      await fixture.whenStable();

      expect(TestBed.inject(InvoiceStore).invoice().number).toBe('0002');
      expect(dialog()).toBeNull();
      expect(document.activeElement).toBe(hamburger());
    });
  });

  describe('saved invoices', () => {
    function invoiceStore(): InvoiceStore {
      return TestBed.inject(InvoiceStore);
    }

    function dialog(): HTMLElement | null {
      return compiled.querySelector<HTMLElement>('[role="dialog"]');
    }

    it('saves the open invoice from the header and counts it', async () => {
      expect(findButton(compiled, 'Guardar')?.closest('header')).not.toBeNull();
      await expect(moreItems(fixture)).resolves.toContain('Facturas guardadas 0');

      findButton(compiled, 'Guardar')?.click();
      await fixture.whenStable();

      expect(statusText()).toBe('Factura A-0001 guardada.');
      await expect(moreItems(fixture)).resolves.toContain('Facturas guardadas 1');
    });

    it('starts the next invoice of the series from the header', async () => {
      invoiceStore().updateParty('buyer', 'name', 'Ana Pérez');
      findButton(compiled, 'Guardar')?.click();
      await fixture.whenStable();

      await chooseFromMore(fixture, 'Nueva factura A-0002');

      expect(invoiceStore().invoice().number).toBe('0002');
      expect(invoiceStore().invoice().buyer.name).toBe('');
      expect(compiled.querySelector('.reference')?.textContent).toContain('A-0002');
    });

    it('writes the draft through when saving and when starting a new invoice', async () => {
      const repository = TestBed.inject(INVOICE_REPOSITORY);
      invoiceStore().setField('concept', 'Venta');

      findButton(compiled, 'Guardar')?.click();
      await fixture.whenStable();
      await expect(repository.getDraft()).resolves.toMatchObject({ number: '0001', concept: 'Venta' });

      await chooseFromMore(fixture, 'Nueva factura A-0002');
      await expect(repository.getDraft()).resolves.toMatchObject({ number: '0002', concept: '' });
    });

    it('opens a saved invoice from the drawer and closes it', async () => {
      invoiceStore().setField('concept', 'Venta');
      findButton(compiled, 'Guardar')?.click();
      await fixture.whenStable();
      const savedId = invoiceStore().invoice().id;
      await chooseFromMore(fixture, 'Nueva factura A-0002');
      expect(invoiceStore().invoice().concept).toBe('');

      await chooseFromMore(fixture, 'Facturas guardadas 1');
      expect(dialog()?.closest('[data-print-hide]')).not.toBeNull();

      findButton(dialog() as HTMLElement, 'Abrir')?.click();
      await fixture.whenStable();

      expect(dialog()).toBeNull();
      expect(invoiceStore().invoice().id).toBe(savedId);
      expect(invoiceStore().invoice().concept).toBe('Venta');
    });

    it('shows the own images of an opened saved invoice, not the profile ones', async () => {
      const repository = TestBed.inject(INVOICE_REPOSITORY);
      await TestBed.inject(ASSET_STORE).put('logo-old', new Blob(['png'], { type: 'image/png' }));
      await repository.save({ ...createInvoice('saved-old'), number: '0001', logoAssetId: 'logo-old' });
      await TestBed.inject(SavedInvoicesStore).load();
      await fixture.whenStable();
      expect(compiled.querySelector('img[alt="Logo"]')).toBeNull();

      await chooseFromMore(fixture, 'Facturas guardadas 1');
      findButton(dialog() as HTMLElement, 'Abrir')?.click();
      await fixture.whenStable();

      expect(invoiceStore().invoice().logoAssetId).toBe('logo-old');
      expect(compiled.querySelector('img[alt="Logo"]')?.getAttribute('src')).toMatch(/^blob:/);
    });
  });

  describe('settings', () => {
    function dialog(): HTMLElement | null {
      return compiled.querySelector<HTMLElement>('[role="dialog"]');
    }

    /** Opens the panel from the Más menu, which is where focus returns when it closes. */
    async function openSettings(): Promise<HTMLButtonElement | null> {
      await chooseFromMore(fixture, 'Ajustes');
      return compiled.querySelector<HTMLButtonElement>('.app-header button[aria-haspopup="menu"]');
    }

    it('opens the settings panel from the header and closes it with Escape, focus restored', async () => {
      const button = await openSettings();

      expect(button?.closest('header')).not.toBeNull();
      expect(dialog()?.querySelector('h2')?.textContent?.trim()).toBe('Ajustes');
      expect(dialog()?.closest('[data-print-hide]')).not.toBeNull();
      expect(dialog()?.contains(document.activeElement)).toBe(true);

      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();

      expect(dialog()).toBeNull();
      expect(document.activeElement).toBe(button);
    });

    it('reflects a seller name typed in the panel in the document, and vice versa', async () => {
      await openSettings();
      const panelInput = Array.from(dialog()?.querySelectorAll('label') ?? []).find(
        (label) => label.textContent?.trim() === 'Nombre o razón social',
      )?.control as HTMLInputElement;
      const documentInput = compiled.querySelector<HTMLInputElement>(
        'input[aria-label="Nombre o razón social del vendedor"]',
      );

      panelInput.value = 'Taller Rodríguez';
      panelInput.dispatchEvent(new Event('input', { bubbles: true }));
      await fixture.whenStable();
      expect(documentInput?.value).toBe('Taller Rodríguez');

      typeInto(compiled, 'Nombre o razón social del vendedor', 'Taller Nuevo');
      await fixture.whenStable();
      expect(panelInput.value).toBe('Taller Nuevo');
    });

    it('hides the carrier from the document when unchecked in the panel', async () => {
      await openSettings();
      expect(compiled.querySelector('app-carrier-block')).not.toBeNull();
      const checkbox = Array.from(dialog()?.querySelectorAll('label') ?? []).find(
        (label) => label.textContent?.trim() === 'Mostrar transportista',
      )?.control as HTMLInputElement;

      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.whenStable();

      expect(compiled.querySelector('app-carrier-block')).toBeNull();
    });
  });

  describe('compliance', () => {
    function dialog(): HTMLElement | null {
      return compiled.querySelector<HTMLElement>('[role="dialog"]');
    }

    // A dated new invoice with its number leaves 11 of the 13 data points pending.
    it('counts the pending data points in the header and follows edits at once', async () => {
      const button = compiled.querySelector('button[aria-label="Res. 55 · 11 pendientes, datos obligatorios"]');
      expect(button?.closest('header')).not.toBeNull();

      typeInto(compiled, 'Concepto de la operación', 'Venta de mercancías');
      await fixture.whenStable();

      expect(visibleText(button)).toBe('10 Res. 55 · 10 pendientes');
      expect(button?.getAttribute('aria-label')).toBe('Res. 55 · 10 pendientes, datos obligatorios');
    });

    it('opens the panel from the header, print-hidden, and jumps to a field from it', async () => {
      const button = compiled.querySelector<HTMLButtonElement>(
        'button[aria-label="Res. 55 · 11 pendientes, datos obligatorios"]',
      );
      button?.focus();
      button?.click();
      await fixture.whenStable();

      expect(dialog()?.querySelector('h2')?.textContent?.trim()).toBe('Datos obligatorios');
      expect(dialog()?.closest('[data-print-hide]')).not.toBeNull();
      expect(dialog()?.querySelectorAll('li')).toHaveLength(13);

      findButton(dialog() as HTMLElement, 'Ir al campo')?.click();
      await fixture.whenStable();

      expect(dialog()).toBeNull();
      expect(document.activeElement?.id).toBe('field-seller-name');
    });

    it('still prints with data points pending', async () => {
      expect(TestBed.inject(InvoiceStore).pendingCount()).toBeGreaterThan(0);

      findButton(compiled, 'PDF / Imprimir')?.click();
      await fixture.whenStable();

      expect(print).toHaveBeenCalledOnce();
    });
  });

  describe('file panel', () => {
    function dialog(): HTMLElement | null {
      return compiled.querySelector<HTMLElement>('[role="dialog"]');
    }

    async function openPanel(): Promise<HTMLButtonElement | null> {
      await chooseFromMore(fixture, 'Exportar / importar');
      return compiled.querySelector<HTMLButtonElement>('.app-header button[aria-haspopup="menu"]');
    }

    /** Picks `file` in the file input whose visible label reads `label`, as a user would. */
    async function pick(label: string, file: File): Promise<void> {
      const input = Array.from(dialog()?.querySelectorAll('label') ?? []).find(
        (candidate) => candidate.textContent?.trim() === label,
      )?.control as HTMLInputElement;
      expect(input?.type).toBe('file');
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await fixture.whenStable();
    }

    function exportFile(value: unknown): File {
      return new File([JSON.stringify(value)], 'factura.json', { type: 'application/json' });
    }

    it('opens the file panel from the header, print-hidden, with its export and import controls', async () => {
      const button = await openPanel();

      expect(button?.closest('header')).not.toBeNull();
      expect(dialog()?.querySelector('h2')?.textContent?.trim()).toBe('Archivo');
      expect(dialog()?.closest('[data-print-hide]')).not.toBeNull();
      expect(findButton(dialog() as HTMLElement, 'Exportar factura')).toBeDefined();
      expect(findButton(dialog() as HTMLElement, 'Exportar copia de seguridad')).toBeDefined();
      expect(dialog()?.querySelectorAll('input[type="file"]')).toHaveLength(2);
    });

    it('replaces the open invoice with an imported invoice file and closes the panel', async () => {
      const imported = { ...createInvoice('imported-1'), series: 'C', number: '0009', concept: 'Importada' };
      await openPanel();

      await pick(
        'Importar factura',
        exportFile({ format: 'facturath', kind: 'invoice', schemaVersion: 1, invoice: imported, assets: {} }),
      );

      expect(dialog()).toBeNull();
      expect(TestBed.inject(InvoiceStore).invoice()).toEqual(imported);
      expect(compiled.querySelector('.reference')?.textContent).toContain('C-0009');
      expect(statusText()).toBe('Factura C-0009 importada.');
    });

    it('shows the images of an imported invoice even when the profile has none', async () => {
      const imported = { ...createInvoice('imported-2'), logoAssetId: 'logo-x', enzonaQrAssetId: 'qr-x' };
      await openPanel();

      await pick(
        'Importar factura',
        exportFile({
          format: 'facturath',
          kind: 'invoice',
          schemaVersion: 1,
          invoice: imported,
          assets: {
            'logo-x': { type: 'image/png', data: PNG_BASE64 },
            'qr-x': { type: 'image/png', data: PNG_BASE64 },
          },
        }),
      );

      expect(TestBed.inject(SettingsStore).profile().logoAssetId).toBeNull();
      expect(compiled.querySelector('img[alt="Logo"]')?.getAttribute('src')).toMatch(/^blob:/);
      expect(compiled.querySelector('img[alt="QR EnZona"]')?.getAttribute('src')).toMatch(/^blob:/);
      expect(compiled.querySelector('img[alt="QR Transfermóvil"]')).toBeNull();
    });

    it('refreshes the saved count after importing a backup', async () => {
      await openPanel();

      await pick(
        'Importar copia de seguridad',
        exportFile({
          format: 'facturath',
          kind: 'backup',
          schemaVersion: 1,
          invoices: [
            { ...createInvoice('b-1'), number: '0001' },
            { ...createInvoice('b-2'), number: '0002' },
          ],
          profile: createEmptyProfile(),
          preferences: { schemaVersion: 1, density: 'spacious', showCarrier: true, showSignatures: true, showPaymentQr: true },
          assets: {},
        }),
      );

      await expect(moreItems(fixture)).resolves.toContain('Facturas guardadas 2');
      expect(statusText()).toBe('Copia importada: 2 facturas.');
    });

    it('keeps the panel open and the invoice untouched when the file is not an export', async () => {
      await openPanel();
      const before = TestBed.inject(InvoiceStore).invoice();

      await pick('Importar factura', new File(['hola'], 'nota.txt', { type: 'text/plain' }));

      expect(dialog()).not.toBeNull();
      expect(TestBed.inject(InvoiceStore).invoice()).toBe(before);
      expect(statusText()).toBe('El archivo no es una exportación de FACTURATH.');
    });
  });

  describe('when the browser cannot save', () => {
    it('shows no notice while saving works', () => {
      expect(notices(compiled)).toHaveLength(0);
    });

    it('shows one persistent notice in a live region, inside the print-hidden top bar', async () => {
      TestBed.inject(StorageStatus).markUnavailable();
      await fixture.whenStable();

      const shown = notices(compiled);
      expect(shown).toHaveLength(1);
      expect(shown[0]?.closest('[data-print-hide]')).not.toBeNull();
      expect(shown[0]?.querySelector('button')).toBeNull();
    });

    it('keeps the notice when a toast shows and after it goes', async () => {
      TestBed.inject(StorageStatus).markUnavailable();
      await fixture.whenStable();

      TestBed.inject(ToastService).show('Factura guardada.');
      await fixture.whenStable();
      expect(statusText()).toBe('Factura guardada.');
      expect(notices(compiled)).toHaveLength(1);

      TestBed.inject(ToastService).dismiss();
      await fixture.whenStable();
      expect(notices(compiled)).toHaveLength(1);
    });
  });
});

describe('App at startup', () => {
  /** Configures the module, lets `seed` fill the stores, then renders and settles the app. */
  async function render(
    providers: Provider[] = [],
    seed: () => Promise<void> = () => Promise.resolve(),
  ): Promise<ComponentFixture<App>> {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: SwUpdate, useValue: new FakeSwUpdate() }, ...providers],
    }).compileComponents();
    await seed();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture;
  }

  it('restores the draft as the open invoice', async () => {
    const draft = { ...createInvoice('draft-1'), number: '0004', concept: 'Venta pendiente' };

    const fixture = await render([], () => TestBed.inject(INVOICE_REPOSITORY).saveDraft(draft));

    expect(TestBed.inject(InvoiceStore).invoice()).toEqual(draft);
    expect((fixture.nativeElement as HTMLElement).querySelector('.reference')?.textContent).toContain(
      'A-0004',
    );
  });

  it('lets a restored draft keep its own seller block over the remembered profile', async () => {
    const preferences = new InMemoryPreferencesStore();
    await preferences.saveProfile({ ...createEmptyProfile(), name: 'Taller Perfil' });
    const draft = { ...createInvoice('draft-1'), number: '0004' };
    draft.seller = { ...draft.seller, name: 'Taller Borrador' };

    await render([{ provide: PREFERENCES_STORE, useValue: preferences }], () =>
      TestBed.inject(INVOICE_REPOSITORY).saveDraft(draft),
    );

    expect(TestBed.inject(InvoiceStore).invoice().seller.name).toBe('Taller Borrador');
  });

  it('dates a new invoice with today and fills the seller block from the remembered profile', async () => {
    const preferences = new InMemoryPreferencesStore();
    await preferences.saveProfile({ ...createEmptyProfile(), name: 'Taller Rodríguez', nit: '12345678901' });

    const fixture = await render([{ provide: PREFERENCES_STORE, useValue: preferences }]);

    const seller = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[aria-label="Nombre o razón social del vendedor"]',
    );
    expect(seller?.value).toBe('Taller Rodríguez');
    expect(TestBed.inject(InvoiceStore).invoice().seller.nit).toBe('12345678901');
    expect(TestBed.inject(InvoiceStore).invoice().issueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('App with invoices already saved', () => {
  it('counts them in the header at startup', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: SwUpdate, useValue: new FakeSwUpdate() }],
    }).compileComponents();
    const repository = TestBed.inject(INVOICE_REPOSITORY);
    await repository.save({ ...createInvoice('saved-1'), number: '0001' });
    await repository.save({ ...createInvoice('saved-2'), number: '0002' });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    await expect(moreItems(fixture)).resolves.toContain('Facturas guardadas 2');
  });
});

describe('App with storage provided', () => {
  it('shows the saving-disabled notice at startup when the browser has no IndexedDB', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideStorage(),
        provideNoIndexedDb(),
        { provide: SwUpdate, useValue: new FakeSwUpdate() },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(notices(fixture.nativeElement as HTMLElement)).toHaveLength(1);
  });
});

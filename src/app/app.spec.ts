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
import { findButton, typeInto } from './core/testing/dom';
import { FakeObjectUrls } from './core/testing/fake-object-urls';
import { provideNoIndexedDb } from './core/testing/fake-storage';
import { FakeSwUpdate, versionReady } from './core/testing/fake-sw-update';
import { ToastService } from './core/toast';
import { createInvoice } from './domain/invoice';
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

  describe('header menu', () => {
    function toggle(): HTMLButtonElement | null {
      return compiled.querySelector<HTMLButtonElement>('.menu-toggle');
    }

    function menu(): HTMLElement | null {
      const controls = toggle()?.getAttribute('aria-controls');
      return controls ? compiled.querySelector<HTMLElement>(`#${controls}`) : null;
    }

    it('gathers every control but printing behind one toggle', () => {
      const button = toggle();

      expect(button?.closest('header')).not.toBeNull();
      expect(button?.getAttribute('aria-expanded')).toBe('false');
      expect(
        Array.from(menu()?.querySelectorAll('button') ?? []).map((item) =>
          item.textContent?.trim(),
        ),
      ).toEqual(['Guardar', 'Nueva', 'Guardadas (0)', 'Res. 55 (11)', 'Archivo', 'Ajustes']);
    });

    it('keeps printing out of the menu and renders each control once', () => {
      const print = findButton(compiled, 'PDF / Imprimir');

      expect(print?.closest('header')).not.toBeNull();
      expect(menu()?.contains(print as Node)).toBe(false);
      // Seven controls plus the toggle: nothing is duplicated for a second layout (#43).
      expect(compiled.querySelectorAll('.app-header button')).toHaveLength(8);
    });

    it('opens and closes the menu from the toggle', async () => {
      toggle()?.click();
      await fixture.whenStable();

      expect(toggle()?.getAttribute('aria-expanded')).toBe('true');
      expect(menu()?.classList.contains('open')).toBe(true);

      toggle()?.click();
      await fixture.whenStable();

      expect(toggle()?.getAttribute('aria-expanded')).toBe('false');
      expect(menu()?.classList.contains('open')).toBe(false);
    });

    it('closes the menu on Escape and puts focus back on the toggle', async () => {
      toggle()?.focus();
      toggle()?.click();
      await fixture.whenStable();
      const first = menu()?.querySelector('button');
      first?.focus();

      first?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await fixture.whenStable();

      expect(toggle()?.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(toggle());
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
      expect(findButton(compiled, 'Guardadas (0)')?.closest('header')).not.toBeNull();

      findButton(compiled, 'Guardar')?.click();
      await fixture.whenStable();

      expect(statusText()).toBe('Factura A-0001 guardada.');
      expect(findButton(compiled, 'Guardadas (1)')).toBeDefined();
    });

    it('starts the next invoice of the series from the header', async () => {
      invoiceStore().updateParty('buyer', 'name', 'Ana Pérez');
      findButton(compiled, 'Guardar')?.click();
      await fixture.whenStable();

      findButton(compiled, 'Nueva')?.click();
      await fixture.whenStable();

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

      findButton(compiled, 'Nueva')?.click();
      await fixture.whenStable();
      await expect(repository.getDraft()).resolves.toMatchObject({ number: '0002', concept: '' });
    });

    it('opens a saved invoice from the drawer and closes it', async () => {
      invoiceStore().setField('concept', 'Venta');
      findButton(compiled, 'Guardar')?.click();
      await fixture.whenStable();
      const savedId = invoiceStore().invoice().id;
      findButton(compiled, 'Nueva')?.click();
      await fixture.whenStable();
      expect(invoiceStore().invoice().concept).toBe('');

      findButton(compiled, 'Guardadas (1)')?.click();
      await fixture.whenStable();
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

      findButton(compiled, 'Guardadas (1)')?.click();
      await fixture.whenStable();
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

    async function openSettings(): Promise<HTMLButtonElement | undefined> {
      const button = findButton(compiled, 'Ajustes');
      button?.focus();
      button?.click();
      await fixture.whenStable();
      return button;
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
      const button = findButton(compiled, 'Res. 55 (11)');
      expect(button?.closest('header')).not.toBeNull();
      expect(button?.getAttribute('aria-label')).toBe('Datos obligatorios, 11 pendientes');

      typeInto(compiled, 'Concepto de la operación', 'Venta de mercancías');
      await fixture.whenStable();

      expect(findButton(compiled, 'Res. 55 (10)')?.getAttribute('aria-label')).toBe(
        'Datos obligatorios, 10 pendientes',
      );
    });

    it('opens the panel from the header, print-hidden, and jumps to a field from it', async () => {
      const button = findButton(compiled, 'Res. 55 (11)');
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

    async function openPanel(): Promise<HTMLButtonElement | undefined> {
      const button = findButton(compiled, 'Archivo');
      button?.focus();
      button?.click();
      await fixture.whenStable();
      return button;
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

      expect(findButton(compiled, 'Guardadas (2)')).toBeDefined();
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

    expect(findButton(fixture.nativeElement as HTMLElement, 'Guardadas (2)')).toBeDefined();
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

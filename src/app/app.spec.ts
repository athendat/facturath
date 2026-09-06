import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { App } from './app';
import { PageReloader } from './core/page-reloader';
import { Printer } from './core/printer';
import { INDEXED_DB_FACTORY } from './core/storage/indexed-db-connection';
import { provideStorage } from './core/storage/provide-storage';
import { StorageStatus } from './core/storage/storage-status';
import { findButton } from './core/testing/dom';
import { FakeSwUpdate, versionReady } from './core/testing/fake-sw-update';
import { ToastService } from './core/toast';

const SAVING_DISABLED_NOTICE =
  'Este navegador no permite guardar. Puedes imprimir, pero la factura y tus datos se perderán al cerrar.';

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

  describe('when the browser cannot save', () => {
    it('shows no notice while saving works', () => {
      expect(notices(compiled)).toHaveLength(0);
    });

    it('shows one persistent notice in a live region, inside the print-hidden top bar', async () => {
      TestBed.inject(StorageStatus).disable('indexeddb-missing');
      await fixture.whenStable();

      const shown = notices(compiled);
      expect(shown).toHaveLength(1);
      expect(shown[0]?.closest('[data-print-hide]')).not.toBeNull();
      expect(shown[0]?.querySelector('button')).toBeNull();
    });

    it('keeps the notice when a toast shows and after it goes', async () => {
      TestBed.inject(StorageStatus).disable('indexeddb-missing');
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

describe('App with storage provided', () => {
  it('shows the saving-disabled notice at startup when the browser has no IndexedDB', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideStorage(),
        { provide: INDEXED_DB_FACTORY, useValue: () => undefined },
        { provide: SwUpdate, useValue: new FakeSwUpdate() },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(notices(fixture.nativeElement as HTMLElement)).toHaveLength(1);
  });
});

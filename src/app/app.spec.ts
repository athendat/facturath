import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { App } from './app';
import { PageReloader } from './core/page-reloader';
import { findButton } from './core/testing/dom';
import { FakeSwUpdate, versionReady } from './core/testing/fake-sw-update';
import { ToastService } from './core/toast';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let compiled: HTMLElement;
  let swUpdate: FakeSwUpdate;
  let reload: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    swUpdate = new FakeSwUpdate();
    reload = vi.fn();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: SwUpdate, useValue: swUpdate },
        { provide: PageReloader, useValue: { reload } },
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
});

import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { PageReloader } from './page-reloader';
import { FakeSwUpdate, versionReady } from './testing/fake-sw-update';
import { ToastService } from './toast';
import { UpdateNotifier } from './update-notifier';

describe('UpdateNotifier', () => {
  let swUpdate: FakeSwUpdate;
  let reload: ReturnType<typeof vi.fn>;
  let toasts: ToastService;
  let notifier: UpdateNotifier;

  beforeEach(() => {
    swUpdate = new FakeSwUpdate();
    reload = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: swUpdate },
        { provide: PageReloader, useValue: { reload } },
      ],
    });
    toasts = TestBed.inject(ToastService);
    notifier = TestBed.inject(UpdateNotifier);
  });

  it('shows the update toast with a reload action when a new version is ready', () => {
    notifier.start();

    swUpdate.versionUpdates.next(versionReady);

    expect(toasts.current()?.message).toBe('Hay una versión nueva de FACTURATH.');
    expect(toasts.current()?.action?.label).toBe('Actualizar');
  });

  it('ignores other version events', () => {
    notifier.start();

    swUpdate.versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'b' } });
    swUpdate.versionUpdates.next({ type: 'NO_NEW_VERSION_DETECTED', version: { hash: 'a' } });

    expect(toasts.current()).toBeNull();
  });

  it('reloads only when the user runs the action', () => {
    notifier.start();
    swUpdate.versionUpdates.next(versionReady);

    expect(reload).not.toHaveBeenCalled();

    toasts.runAction();

    expect(reload).toHaveBeenCalledOnce();
  });

  it('does nothing when the service worker is not enabled', () => {
    swUpdate.isEnabled = false;

    notifier.start();

    expect(swUpdate.versionUpdates.observed).toBe(false);
  });
});

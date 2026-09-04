import { DestroyRef, Service, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { PageReloader } from './page-reloader';
import { ToastService } from './toast';

/**
 * Tells the user when a new build is ready and lets them reload. The app never
 * reloads on its own: the new version only takes over after the user clicks.
 */
@Service()
export class UpdateNotifier {
  private readonly updates = inject(SwUpdate);
  private readonly toasts = inject(ToastService);
  private readonly reloader = inject(PageReloader);
  private readonly destroyRef = inject(DestroyRef);

  /** Call once in the browser, after hydration. A no-op when the service worker is disabled. */
  start(): void {
    if (!this.updates.isEnabled) {
      return;
    }
    this.updates.versionUpdates
      .pipe(
        filter((event) => event.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.notify());
  }

  private notify(): void {
    this.toasts.show('Hay una versión nueva de FACTURATH.', {
      action: { label: 'Actualizar', run: () => this.reloader.reload() },
    });
  }
}

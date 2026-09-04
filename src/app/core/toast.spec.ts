import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast';

describe('ToastService', () => {
  let toasts: ToastService;

  beforeEach(() => {
    toasts = TestBed.inject(ToastService);
  });

  it('starts with no toast', () => {
    expect(toasts.current()).toBeNull();
  });

  it('shows a message and clears it on dismiss', () => {
    toasts.show('Factura guardada.');

    expect(toasts.current()?.message).toBe('Factura guardada.');

    toasts.dismiss();

    expect(toasts.current()).toBeNull();
  });

  describe('timing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('auto-dismisses a toast without an action after 2.6 seconds', () => {
      toasts.show('Factura guardada.');

      vi.advanceTimersByTime(2599);
      expect(toasts.current()?.message).toBe('Factura guardada.');

      vi.advanceTimersByTime(1);
      expect(toasts.current()).toBeNull();
    });

    it('keeps a toast with an action until the user acts', () => {
      toasts.show('Hay una versión nueva de FACTURATH.', {
        action: { label: 'Actualizar', run: () => undefined },
      });

      vi.advanceTimersByTime(60_000);

      expect(toasts.current()?.action?.label).toBe('Actualizar');
    });

    it('does not let an earlier timer dismiss a newer toast', () => {
      toasts.show('Primero');
      vi.advanceTimersByTime(2000);
      toasts.show('Segundo');

      vi.advanceTimersByTime(600);

      expect(toasts.current()?.message).toBe('Segundo');
    });

    it('runs the action and dismisses the toast', () => {
      const run = vi.fn();
      toasts.show('Hay una versión nueva de FACTURATH.', { action: { label: 'Actualizar', run } });

      toasts.runAction();

      expect(run).toHaveBeenCalledOnce();
      expect(toasts.current()).toBeNull();
    });
  });
});

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
});

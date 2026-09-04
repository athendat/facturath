import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastHost } from './toast-host';

describe('ToastHost', () => {
  let fixture: ComponentFixture<ToastHost>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToastHost] }).compileComponents();
    fixture = TestBed.createComponent(ToastHost);
    element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  function status(): HTMLElement | null {
    return element.querySelector<HTMLElement>('[role="status"]');
  }

  function button(label: string): HTMLButtonElement | null {
    return Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label || candidate.ariaLabel === label,
    ) as HTMLButtonElement | null;
  }

  it('keeps an empty polite live region when there is no toast', () => {
    expect(status()).not.toBeNull();
    expect(status()?.getAttribute('aria-live')).toBe('polite');
    expect(status()?.textContent?.trim()).toBe('');
    expect(element.querySelector('button')).toBeNull();
  });

  it('renders the message inside the live region', async () => {
    fixture.componentRef.setInput('toast', { message: 'Factura guardada.' });
    await fixture.whenStable();

    expect(status()?.textContent).toContain('Factura guardada.');
  });

  it('renders the action button and emits action when it is clicked', async () => {
    const action = vi.fn();
    fixture.componentRef.setInput('toast', {
      message: 'Hay una versión nueva de FACTURATH.',
      action: { label: 'Actualizar', run: () => undefined },
    });
    fixture.componentInstance.action.subscribe(action);
    await fixture.whenStable();

    button('Actualizar')?.click();

    expect(action).toHaveBeenCalledOnce();
  });

  it('offers a dismiss button for toasts with an action and emits dismissed', async () => {
    const dismissed = vi.fn();
    fixture.componentRef.setInput('toast', {
      message: 'Hay una versión nueva de FACTURATH.',
      action: { label: 'Actualizar', run: () => undefined },
    });
    fixture.componentInstance.dismissed.subscribe(dismissed);
    await fixture.whenStable();

    button('Cerrar')?.click();

    expect(dismissed).toHaveBeenCalledOnce();
  });
});

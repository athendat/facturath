import { Service, signal } from '@angular/core';

export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

export interface Toast {
  readonly message: string;
  readonly action?: ToastAction;
}

export interface ToastOptions {
  readonly action?: ToastAction;
}

/** Milliseconds before a toast without an action auto-dismisses. */
const AUTO_DISMISS_MS = 2600;

/**
 * Holds the toast currently shown to the user; the newest toast replaces the
 * previous one. Toasts with an action stay until the user acts or dismisses;
 * toasts without one auto-dismiss.
 */
@Service()
export class ToastService {
  private readonly toast = signal<Toast | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly current = this.toast.asReadonly();

  show(message: string, { action }: ToastOptions = {}): void {
    this.clearTimer();
    this.toast.set({ message, action });
    if (!action) {
      this.timer = setTimeout(() => this.dismiss(), AUTO_DISMISS_MS);
    }
  }

  dismiss(): void {
    this.clearTimer();
    this.toast.set(null);
  }

  /** Runs the current toast's action, if any, and dismisses it. */
  runAction(): void {
    const action = this.toast()?.action;
    this.dismiss();
    action?.run();
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

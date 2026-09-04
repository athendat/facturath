import { Service, signal } from '@angular/core';

export interface Toast {
  readonly message: string;
}

/** Holds the toast currently shown to the user; the newest toast replaces the previous one. */
@Service()
export class ToastService {
  private readonly toast = signal<Toast | null>(null);

  readonly current = this.toast.asReadonly();

  show(message: string): void {
    this.toast.set({ message });
  }

  dismiss(): void {
    this.toast.set(null);
  }
}

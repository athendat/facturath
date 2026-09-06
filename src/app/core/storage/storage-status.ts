import { Service, signal } from '@angular/core';

/**
 * Whether the browser lets the app persist anything. Adapters mark it when
 * they fall back to memory; the shell shows one persistent notice while it
 * is set. It never flips back within a session.
 */
@Service()
export class StorageStatus {
  private readonly unavailable = signal(false);

  readonly savingDisabled = this.unavailable.asReadonly();

  markUnavailable(): void {
    this.unavailable.set(true);
  }
}

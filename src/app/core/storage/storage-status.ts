import { Service, computed, signal } from '@angular/core';

export type StorageUnavailableReason =
  'indexeddb-missing' | 'indexeddb-open-failed' | 'local-storage-blocked';

/**
 * Whether the browser lets the app persist anything. Adapters flip it when
 * they fall back to memory; the shell shows one persistent notice while it
 * is set. It never flips back within a session.
 */
@Service()
export class StorageStatus {
  private readonly unavailable = signal<StorageUnavailableReason | null>(null);

  /** The first failure seen, for diagnostics. */
  readonly reason = this.unavailable.asReadonly();
  readonly savingDisabled = computed(() => this.unavailable() !== null);

  disable(reason: StorageUnavailableReason): void {
    if (this.unavailable() === null) {
      this.unavailable.set(reason);
    }
  }
}

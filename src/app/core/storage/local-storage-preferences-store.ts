import { DOCUMENT, Service, inject } from '@angular/core';
import { createEmptyProfile, type SellerProfile } from '../../domain/seller-profile';
import { InMemoryPreferencesStore } from './in-memory-preferences-store';
import type { PreferencesStore } from './ports';
import { StorageStatus } from './storage-status';

export const PROFILE_KEY = 'facturath.profile';

/**
 * Keeps the profile as one JSON key in localStorage. Browser only: callers
 * reach it after hydration. When the browser blocks localStorage (private
 * mode, disabled site data, quota) it flags the status and keeps the profile
 * in memory for the rest of the session.
 */
@Service()
export class LocalStoragePreferencesStore implements PreferencesStore {
  private readonly document = inject(DOCUMENT);
  private readonly status = inject(StorageStatus);
  private readonly memory = new InMemoryPreferencesStore();
  private blocked = false;

  loadProfile(): Promise<SellerProfile | null> {
    const storage = this.storage();
    if (storage === null) {
      return this.memory.loadProfile();
    }
    try {
      const raw = storage.getItem(PROFILE_KEY);
      return Promise.resolve(raw === null ? null : parseProfile(raw));
    } catch {
      this.block();
      return this.memory.loadProfile();
    }
  }

  saveProfile(profile: SellerProfile): Promise<void> {
    const storage = this.storage();
    if (storage !== null) {
      try {
        storage.setItem(PROFILE_KEY, JSON.stringify(profile));
        return Promise.resolve();
      } catch {
        this.block();
      }
    }
    return this.memory.saveProfile(profile);
  }

  /** The window's localStorage, or null once the browser refused it. Reading the property can throw. */
  private storage(): Storage | null {
    if (this.blocked) {
      return null;
    }
    try {
      const storage = this.document.defaultView?.localStorage;
      if (storage) {
        return storage;
      }
    } catch {
      // Falls through: the browser refused access.
    }
    this.block();
    return null;
  }

  private block(): void {
    this.blocked = true;
    this.status.markUnavailable();
  }
}

/** The stored profile over the empty one, so fields added later read as empty; null when unreadable. */
function parseProfile(raw: string): SellerProfile | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    return { ...createEmptyProfile(), ...(parsed as Partial<SellerProfile>) };
  } catch {
    return null;
  }
}

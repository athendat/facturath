import { DOCUMENT, Service, inject } from '@angular/core';
import { createDefaultPreferences, type Preferences } from '../../domain/preferences';
import { createEmptyProfile, type SellerProfile } from '../../domain/seller-profile';
import { InMemoryPreferencesStore } from './in-memory-preferences-store';
import type { PreferencesStore } from './ports';
import { StorageStatus } from './storage-status';

export const PROFILE_KEY = 'facturath.profile';
export const PREFERENCES_KEY = 'facturath.preferences';

/**
 * Keeps the profile and the layout preferences as one JSON key each in
 * localStorage. Browser only: callers reach it after hydration. When the
 * browser blocks localStorage (private mode, disabled site data, quota) it
 * flags the status and keeps both in memory for the rest of the session.
 */
@Service()
export class LocalStoragePreferencesStore implements PreferencesStore {
  private readonly document = inject(DOCUMENT);
  private readonly status = inject(StorageStatus);
  private readonly memory = new InMemoryPreferencesStore();
  private blocked = false;

  loadProfile(): Promise<SellerProfile | null> {
    return this.read(PROFILE_KEY, createEmptyProfile, () => this.memory.loadProfile());
  }

  saveProfile(profile: SellerProfile): Promise<void> {
    return this.write(PROFILE_KEY, profile, () => this.memory.saveProfile(profile));
  }

  loadPreferences(): Promise<Preferences | null> {
    return this.read(PREFERENCES_KEY, createDefaultPreferences, () =>
      this.memory.loadPreferences(),
    );
  }

  savePreferences(preferences: Preferences): Promise<void> {
    return this.write(PREFERENCES_KEY, preferences, () =>
      this.memory.savePreferences(preferences),
    );
  }

  /** The value under `key` merged over `defaults()`, null when absent or unreadable; `fallback` when blocked. */
  private read<T extends object>(
    key: string,
    defaults: () => T,
    fallback: () => Promise<T | null>,
  ): Promise<T | null> {
    const storage = this.storage();
    if (storage === null) {
      return fallback();
    }
    try {
      const raw = storage.getItem(key);
      return Promise.resolve(raw === null ? null : parseOver(raw, defaults()));
    } catch {
      this.block();
      return fallback();
    }
  }

  private write<T>(key: string, value: T, fallback: () => Promise<void>): Promise<void> {
    const storage = this.storage();
    if (storage !== null) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return Promise.resolve();
      } catch {
        this.block();
      }
    }
    return fallback();
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

/** The stored object over `defaults`, so fields added later read as their default; null when unreadable. */
function parseOver<T extends object>(raw: string, defaults: T): T | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return { ...defaults, ...(parsed as Partial<T>) };
  } catch {
    return null;
  }
}

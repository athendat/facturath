import { Service, effect, inject, signal } from '@angular/core';
import type { AssetIds } from '../domain/invoice';
import {
  createEmptyProfile,
  type ProfileTextField,
  type SellerProfile,
} from '../domain/seller-profile';
import { PREFERENCES_STORE } from './storage/ports';
import { StorageStatus } from './storage/storage-status';

/**
 * Holds the seller profile and persists it through the preferences port on
 * every edit. Shared by the invoice editor, which writes the seller block
 * through it, and the settings panel.
 */
@Service()
export class SettingsStore {
  private readonly preferences = inject(PREFERENCES_STORE);
  private readonly status = inject(StorageStatus);
  private readonly state = signal<SellerProfile>(createEmptyProfile());
  /** True once the user edited something; only then is the profile worth writing. */
  private readonly touched = signal(false);
  private loading: Promise<SellerProfile> | null = null;
  private loaded = false;
  /** Edits made while the stored profile is still loading; they win over the stored values. */
  private readonly editedBeforeLoad: Partial<SellerProfile> = {};

  readonly profile = this.state.asReadonly();

  constructor() {
    effect(() => {
      const profile = this.state();
      if (this.touched()) {
        this.preferences.saveProfile(profile).catch(() => this.status.markUnavailable());
      }
    });
  }

  /**
   * Reads the stored profile once; browser only, after hydration. Fields
   * edited before it resolves keep their edited value; the rest come from
   * storage.
   */
  load(): Promise<SellerProfile> {
    this.loading ??= this.preferences.loadProfile().then((stored) => {
      this.loaded = true;
      if (stored !== null) {
        this.state.set({ ...stored, ...this.editedBeforeLoad });
      }
      return this.state();
    });
    return this.loading;
  }

  updateProfile(field: ProfileTextField, value: string): void {
    this.edit(field, value);
  }

  /** Points the profile at an image in the asset store, or at none with `null`. */
  setAssetId(field: keyof AssetIds, id: string | null): void {
    this.edit(field, id);
  }

  private edit<K extends keyof SellerProfile>(field: K, value: SellerProfile[K]): void {
    this.state.update((profile) => ({ ...profile, [field]: value }));
    if (!this.loaded) {
      this.editedBeforeLoad[field] = value;
    }
    this.touched.set(true);
  }
}

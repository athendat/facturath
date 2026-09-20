import { Service, computed, effect, inject, signal, type WritableSignal } from '@angular/core';
import type { AssetIds } from '../domain/invoice';
import {
  createDefaultPreferences,
  type Density,
  type Preferences,
  type SectionFlag,
} from '../domain/preferences';
import {
  createEmptyProfile,
  type ProfileTextField,
  type SellerProfile,
} from '../domain/seller-profile';
import { PREFERENCES_STORE } from './storage/ports';
import { StorageStatus } from './storage/storage-status';

/**
 * One persisted object: its current value, whether the user changed it (only
 * then is it worth writing) and the fields edited while the stored value was
 * still loading, which win over it.
 */
class Persisted<T extends object> {
  readonly state: WritableSignal<T>;
  readonly touched = signal(false);
  readonly editedBeforeLoad: Partial<T> = {};
  loaded = false;

  constructor(initial: T) {
    this.state = signal(initial);
  }

  edit<K extends keyof T>(field: K, value: T[K]): void {
    this.state.update((current) => ({ ...current, [field]: value }));
    if (!this.loaded) {
      this.editedBeforeLoad[field] = value;
    }
    this.touched.set(true);
  }

  /** Takes the stored value in, keeping whatever was edited meanwhile. */
  receive(stored: T | null): void {
    this.loaded = true;
    if (stored !== null) {
      this.state.set({ ...stored, ...this.editedBeforeLoad });
    }
  }
}

/**
 * Holds the seller profile and the layout preferences and persists each
 * through the preferences port on every edit. Shared by the invoice editor,
 * which writes the seller block through it, and the settings panel.
 */
@Service()
export class SettingsStore {
  private readonly store = inject(PREFERENCES_STORE);
  private readonly status = inject(StorageStatus);
  private readonly profileState = new Persisted<SellerProfile>(createEmptyProfile());
  private readonly preferencesState = new Persisted<Preferences>(createDefaultPreferences());
  private loading: Promise<SellerProfile> | null = null;

  readonly profile = this.profileState.state.asReadonly();
  readonly preferences = this.preferencesState.state.asReadonly();

  readonly density = computed(() => this.preferences().density);
  readonly showCarrier = computed(() => this.preferences().showCarrier);
  readonly showSignatures = computed(() => this.preferences().showSignatures);
  readonly showPaymentQr = computed(() => this.preferences().showPaymentQr);

  constructor() {
    effect(() => {
      const profile = this.profileState.state();
      if (this.profileState.touched()) {
        this.store.saveProfile(profile).catch(() => this.status.markUnavailable());
      }
    });
    effect(() => {
      const preferences = this.preferencesState.state();
      if (this.preferencesState.touched()) {
        this.store.savePreferences(preferences).catch(() => this.status.markUnavailable());
      }
    });
  }

  /**
   * Reads the stored profile and preferences once; browser only, after
   * hydration. Fields edited before it resolves keep their edited value; the
   * rest come from storage. Resolves with the profile.
   */
  load(): Promise<SellerProfile> {
    this.loading ??= Promise.all([this.store.loadProfile(), this.store.loadPreferences()]).then(
      ([profile, preferences]) => {
        this.profileState.receive(profile);
        this.preferencesState.receive(preferences);
        return this.profile();
      },
    );
    return this.loading;
  }

  updateProfile(field: ProfileTextField, value: string): void {
    this.profileState.edit(field, value);
  }

  /** Points the profile at an image in the asset store, or at none with `null`. */
  setAssetId(field: keyof AssetIds, id: string | null): void {
    this.profileState.edit(field, id);
  }

  setDensity(density: Density): void {
    this.preferencesState.edit('density', density);
  }

  /** Shows (`true`) or hides a section of the document, on screen and on paper. */
  setSection(flag: SectionFlag, shown: boolean): void {
    this.preferencesState.edit(flag, shown);
  }

  toggleSection(flag: SectionFlag): void {
    this.setSection(flag, !this.preferences()[flag]);
  }
}

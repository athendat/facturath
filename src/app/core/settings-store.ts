import { Service, effect, inject, signal } from '@angular/core';
import {
  createEmptyProfile,
  type ProfileTextField,
  type SellerProfile,
} from '../domain/seller-profile';
import { PREFERENCES_STORE } from './storage/ports';

/**
 * Holds the seller profile and persists it through the preferences port on
 * every edit. Shared by the invoice editor, which writes the seller block
 * through it, and the settings panel.
 */
@Service()
export class SettingsStore {
  private readonly preferences = inject(PREFERENCES_STORE);
  private readonly state = signal<SellerProfile>(createEmptyProfile());
  /** True once the user edited something; only then is the profile worth writing. */
  private readonly touched = signal(false);
  private loading: Promise<SellerProfile> | null = null;

  readonly profile = this.state.asReadonly();

  constructor() {
    effect(() => {
      const profile = this.state();
      if (this.touched()) {
        void this.preferences.saveProfile(profile);
      }
    });
  }

  /**
   * Reads the stored profile once; browser only, after hydration. Edits made
   * before it resolves win over the stored copy.
   */
  load(): Promise<SellerProfile> {
    this.loading ??= this.preferences.loadProfile().then((stored) => {
      if (stored !== null && !this.touched()) {
        this.state.set(stored);
      }
      return this.state();
    });
    return this.loading;
  }

  updateProfile(field: ProfileTextField, value: string): void {
    this.state.update((profile) => ({ ...profile, [field]: value }));
    this.touched.set(true);
  }
}

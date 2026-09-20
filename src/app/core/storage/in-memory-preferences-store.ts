import type { Preferences } from '../../domain/preferences';
import type { SellerProfile } from '../../domain/seller-profile';
import type { PreferencesStore } from './ports';

/** Holds the profile and preferences for the session only: the test fake and the fallback when localStorage is blocked. */
export class InMemoryPreferencesStore implements PreferencesStore {
  private profile: SellerProfile | null = null;
  private preferences: Preferences | null = null;

  loadProfile(): Promise<SellerProfile | null> {
    return Promise.resolve(this.profile);
  }

  saveProfile(profile: SellerProfile): Promise<void> {
    this.profile = profile;
    return Promise.resolve();
  }

  loadPreferences(): Promise<Preferences | null> {
    return Promise.resolve(this.preferences);
  }

  savePreferences(preferences: Preferences): Promise<void> {
    this.preferences = preferences;
    return Promise.resolve();
  }
}

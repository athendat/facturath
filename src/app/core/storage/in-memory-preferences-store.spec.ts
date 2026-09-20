import { createDefaultPreferences } from '../../domain/preferences';
import { createEmptyProfile } from '../../domain/seller-profile';
import { InMemoryPreferencesStore } from './in-memory-preferences-store';

describe('InMemoryPreferencesStore', () => {
  it('holds nothing until something is saved', async () => {
    const store = new InMemoryPreferencesStore();

    await expect(store.loadProfile()).resolves.toBeNull();
    await expect(store.loadPreferences()).resolves.toBeNull();
  });

  it('keeps the preferences apart from the profile', async () => {
    const store = new InMemoryPreferencesStore();
    const preferences = { ...createDefaultPreferences(), showSignatures: false };

    await store.savePreferences(preferences);

    await expect(store.loadPreferences()).resolves.toEqual(preferences);
    await expect(store.loadProfile()).resolves.toBeNull();

    await store.saveProfile(createEmptyProfile());
    await expect(store.loadPreferences()).resolves.toEqual(preferences);
  });
});

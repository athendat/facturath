import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { createDefaultPreferences, type Preferences } from '../../domain/preferences';
import { createEmptyProfile, type SellerProfile } from '../../domain/seller-profile';
import { blockedDocument } from '../testing/fake-storage';
import {
  LocalStoragePreferencesStore,
  PREFERENCES_KEY,
  PROFILE_KEY,
} from './local-storage-preferences-store';
import { StorageStatus } from './storage-status';

const profile: SellerProfile = {
  ...createEmptyProfile(),
  name: 'Taller Rodríguez',
  nit: '12345678901',
  logoAssetId: 'logo-1',
};

const preferences: Preferences = {
  ...createDefaultPreferences(),
  density: 'compact',
  showCarrier: false,
};

describe('LocalStoragePreferencesStore', () => {
  afterEach(() => {
    localStorage.clear();
  });

  describe('with localStorage available', () => {
    let store: LocalStoragePreferencesStore;

    beforeEach(() => {
      store = TestBed.inject(LocalStoragePreferencesStore);
    });

    it('has no profile until one is saved', async () => {
      await expect(store.loadProfile()).resolves.toBeNull();
    });

    it('gives a fresh instance the profile saved by a previous one', async () => {
      await store.saveProfile(profile);

      TestBed.resetTestingModule();
      const reloaded: LocalStoragePreferencesStore = TestBed.inject(LocalStoragePreferencesStore);

      await expect(reloaded.loadProfile()).resolves.toEqual(profile);
      expect(TestBed.inject(StorageStatus).savingDisabled()).toBe(false);
    });

    it('treats an unreadable stored value as no profile', async () => {
      localStorage.setItem(PROFILE_KEY, '{not json');

      await expect(store.loadProfile()).resolves.toBeNull();
    });

    it('has no preferences until some are saved', async () => {
      await expect(store.loadPreferences()).resolves.toBeNull();
    });

    it('keeps the preferences under their own key, apart from the profile', async () => {
      await store.savePreferences(preferences);

      TestBed.resetTestingModule();
      const reloaded: LocalStoragePreferencesStore = TestBed.inject(LocalStoragePreferencesStore);

      await expect(reloaded.loadPreferences()).resolves.toEqual(preferences);
      await expect(reloaded.loadProfile()).resolves.toBeNull();
      expect(localStorage.getItem(PREFERENCES_KEY)).not.toBeNull();
    });

    it('reads stored preferences over the defaults, so a missing flag reads as shown', async () => {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ density: 'compact' }));

      await expect(store.loadPreferences()).resolves.toEqual({
        ...createDefaultPreferences(),
        density: 'compact',
      });
    });

    it('falls back to the default for a density or flag that is not one', async () => {
      localStorage.setItem(
        PREFERENCES_KEY,
        JSON.stringify({ density: 'huge', showCarrier: 'no', showSignatures: false }),
      );

      await expect(store.loadPreferences()).resolves.toEqual({
        ...createDefaultPreferences(),
        showSignatures: false,
      });
    });

    it('treats an unreadable stored value as no preferences', async () => {
      localStorage.setItem(PREFERENCES_KEY, '[not an object]');

      await expect(store.loadPreferences()).resolves.toBeNull();
    });
  });

  describe('with localStorage blocked', () => {
    let store: LocalStoragePreferencesStore;
    let status: StorageStatus;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [{ provide: DOCUMENT, useValue: blockedDocument }],
      });
      store = TestBed.inject(LocalStoragePreferencesStore);
      status = TestBed.inject(StorageStatus);
    });

    it('reports that saving is disabled and keeps the profile for the session', async () => {
      await store.saveProfile(profile);

      expect(status.savingDisabled()).toBe(true);
      await expect(store.loadProfile()).resolves.toEqual(profile);
    });

    it('reports that saving is disabled as soon as a load is attempted', async () => {
      await expect(store.loadProfile()).resolves.toBeNull();

      expect(status.savingDisabled()).toBe(true);
    });

    it('keeps the preferences for the session and reports that saving is disabled', async () => {
      await store.savePreferences(preferences);

      expect(status.savingDisabled()).toBe(true);
      await expect(store.loadPreferences()).resolves.toEqual(preferences);
    });
  });
});

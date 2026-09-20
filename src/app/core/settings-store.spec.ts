import { TestBed } from '@angular/core/testing';
import { createDefaultPreferences, SECTION_FLAGS } from '../domain/preferences';
import { PROFILE_TEXT_FIELDS, createEmptyProfile, type SellerProfile } from '../domain/seller-profile';
import { SettingsStore } from './settings-store';
import { StorageStatus } from './storage/storage-status';
import { InMemoryPreferencesStore } from './storage/in-memory-preferences-store';
import { PREFERENCES_STORE } from './storage/ports';

const stored: SellerProfile = {
  ...createEmptyProfile(),
  name: 'Taller Rodríguez',
  nit: '12345678901',
  bankAccount: '0598 1234 5678',
};

describe('SettingsStore', () => {
  let preferences: InMemoryPreferencesStore;
  let store: SettingsStore;

  beforeEach(() => {
    preferences = new InMemoryPreferencesStore();
    TestBed.configureTestingModule({
      providers: [{ provide: PREFERENCES_STORE, useValue: preferences }],
    });
    store = TestBed.inject(SettingsStore);
  });

  it('starts with an empty profile before anything is loaded', () => {
    expect(store.profile()).toEqual(createEmptyProfile());
  });

  it('keeps the empty profile when nothing was stored', async () => {
    await expect(store.load()).resolves.toEqual(createEmptyProfile());

    expect(store.profile()).toEqual(createEmptyProfile());
  });

  it('loads the stored profile', async () => {
    await preferences.saveProfile(stored);

    await expect(store.load()).resolves.toEqual(stored);

    expect(store.profile()).toEqual(stored);
  });

  it('persists every edit', async () => {
    store.updateProfile('name', 'Taller Rodríguez');
    TestBed.tick();
    store.updateProfile('nit', '12345678901');
    TestBed.tick();

    await expect(preferences.loadProfile()).resolves.toEqual({
      ...createEmptyProfile(),
      name: 'Taller Rodríguez',
      nit: '12345678901',
    });
  });

  it.each(PROFILE_TEXT_FIELDS)('persists the %s field of the profile', async (field) => {
    store.updateProfile(field, 'valor');
    TestBed.tick();

    expect(store.profile()[field]).toBe('valor');
    await expect(preferences.loadProfile()).resolves.toEqual({
      ...createEmptyProfile(),
      [field]: 'valor',
    });
  });

  it('does not write the untouched empty profile nor a profile it only loaded', async () => {
    await preferences.saveProfile(stored);
    const save = vi.spyOn(preferences, 'saveProfile');

    TestBed.tick();
    await store.load();
    TestBed.tick();

    expect(save).not.toHaveBeenCalled();
  });

  it('merges an edit made before the load resolves over the stored profile', async () => {
    await preferences.saveProfile(stored);

    const loading = store.load();
    store.updateProfile('name', 'Taller Nuevo');
    const loaded = await loading;
    TestBed.tick();

    expect(loaded).toEqual({ ...stored, name: 'Taller Nuevo' });
    expect(store.profile()).toEqual({ ...stored, name: 'Taller Nuevo' });
    await expect(preferences.loadProfile()).resolves.toEqual({ ...stored, name: 'Taller Nuevo' });
  });

  it('persists edits on top of the loaded profile', async () => {
    await preferences.saveProfile(stored);
    await store.load();

    store.updateProfile('address', 'Calle 23 #456, La Habana');
    TestBed.tick();

    await expect(preferences.loadProfile()).resolves.toEqual({
      ...stored,
      address: 'Calle 23 #456, La Habana',
    });
  });

  it('persists an asset id like a text edit', async () => {
    store.setAssetId('logoAssetId', 'asset-1');
    TestBed.tick();

    expect(store.profile().logoAssetId).toBe('asset-1');
    await expect(preferences.loadProfile()).resolves.toEqual({
      ...createEmptyProfile(),
      logoAssetId: 'asset-1',
    });
  });

  it('keeps an asset id set before the load resolves over the stored one', async () => {
    await preferences.saveProfile({ ...stored, transfermovilQrAssetId: 'old-qr' });

    const loading = store.load();
    store.setAssetId('transfermovilQrAssetId', 'new-qr');
    await loading;
    TestBed.tick();

    expect(store.profile()).toEqual({ ...stored, transfermovilQrAssetId: 'new-qr' });
  });

  it('clears an asset id with null', async () => {
    await preferences.saveProfile({ ...stored, enzonaQrAssetId: 'qr' });
    await store.load();

    store.setAssetId('enzonaQrAssetId', null);
    TestBed.tick();

    await expect(preferences.loadProfile()).resolves.toEqual(stored);
  });

  it('reports that saving is disabled when the store rejects a write', async () => {
    vi.spyOn(preferences, 'saveProfile').mockRejectedValue(new Error('quota'));

    store.updateProfile('name', 'Taller Rodríguez');
    TestBed.tick();
    await Promise.resolve();

    expect(TestBed.inject(StorageStatus).savingDisabled()).toBe(true);
  });

  describe('layout preferences', () => {
    it('starts spacious with every section shown', () => {
      expect(store.preferences()).toEqual(createDefaultPreferences());
      expect(store.density()).toBe('spacious');
      expect(store.showCarrier()).toBe(true);
      expect(store.showSignatures()).toBe(true);
      expect(store.showPaymentQr()).toBe(true);
    });

    it('keeps the defaults when nothing was stored', async () => {
      await store.load();

      expect(store.preferences()).toEqual(createDefaultPreferences());
    });

    it('loads the stored preferences together with the profile', async () => {
      await preferences.saveProfile(stored);
      await preferences.savePreferences({ ...createDefaultPreferences(), density: 'compact' });

      await store.load();

      expect(store.profile()).toEqual(stored);
      expect(store.density()).toBe('compact');
    });

    it('persists the density', async () => {
      store.setDensity('compact');
      TestBed.tick();

      expect(store.density()).toBe('compact');
      await expect(preferences.loadPreferences()).resolves.toEqual({
        ...createDefaultPreferences(),
        density: 'compact',
      });
    });

    it.each(SECTION_FLAGS)('persists %s when hidden and shown again', async (flag) => {
      store.setSection(flag, false);
      TestBed.tick();

      expect(store.preferences()[flag]).toBe(false);
      await expect(preferences.loadPreferences()).resolves.toEqual({
        ...createDefaultPreferences(),
        [flag]: false,
      });

      store.setSection(flag, true);
      TestBed.tick();

      await expect(preferences.loadPreferences()).resolves.toEqual(createDefaultPreferences());
    });

    it('toggles a section', () => {
      store.toggleSection('showSignatures');
      expect(store.showSignatures()).toBe(false);

      store.toggleSection('showSignatures');
      expect(store.showSignatures()).toBe(true);
    });

    it('does not write the untouched defaults nor preferences it only loaded', async () => {
      await preferences.savePreferences({ ...createDefaultPreferences(), showCarrier: false });
      const save = vi.spyOn(preferences, 'savePreferences');

      TestBed.tick();
      await store.load();
      TestBed.tick();

      expect(save).not.toHaveBeenCalled();
    });

    it('does not rewrite the profile when only a preference changes', async () => {
      const saveProfile = vi.spyOn(preferences, 'saveProfile');

      store.setDensity('compact');
      TestBed.tick();

      expect(saveProfile).not.toHaveBeenCalled();
    });

    it('keeps a choice made before the load resolves over the stored one', async () => {
      await preferences.savePreferences({
        ...createDefaultPreferences(),
        density: 'compact',
        showCarrier: false,
      });

      const loading = store.load();
      store.setDensity('spacious');
      await loading;
      TestBed.tick();

      expect(store.preferences()).toEqual({ ...createDefaultPreferences(), showCarrier: false });
      await expect(preferences.loadPreferences()).resolves.toEqual({
        ...createDefaultPreferences(),
        showCarrier: false,
      });
    });

    it('reports that saving is disabled when the store rejects a preferences write', async () => {
      vi.spyOn(preferences, 'savePreferences').mockRejectedValue(new Error('quota'));

      store.setDensity('compact');
      TestBed.tick();
      await Promise.resolve();

      expect(TestBed.inject(StorageStatus).savingDisabled()).toBe(true);
    });
  });
});

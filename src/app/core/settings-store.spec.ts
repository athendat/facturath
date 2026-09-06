import { TestBed } from '@angular/core/testing';
import { createEmptyProfile, type SellerProfile } from '../domain/seller-profile';
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

  it('reports that saving is disabled when the store rejects a write', async () => {
    vi.spyOn(preferences, 'saveProfile').mockRejectedValue(new Error('quota'));

    store.updateProfile('name', 'Taller Rodríguez');
    TestBed.tick();
    await Promise.resolve();

    expect(TestBed.inject(StorageStatus).savingDisabled()).toBe(true);
  });
});

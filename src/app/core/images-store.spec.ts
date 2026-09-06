import { TestBed } from '@angular/core/testing';
import { ImagesStore } from './images-store';
import { ObjectUrls } from './object-urls';
import { SettingsStore } from './settings-store';
import { InMemoryAssetStore } from './storage/in-memory-asset-store';
import { InMemoryPreferencesStore } from './storage/in-memory-preferences-store';
import { ASSET_STORE, PREFERENCES_STORE } from './storage/ports';
import { FakeObjectUrls } from './testing/fake-object-urls';

const png = new Blob(['png-bytes'], { type: 'image/png' });

describe('ImagesStore', () => {
  let assets: InMemoryAssetStore;
  let preferences: InMemoryPreferencesStore;
  let objectUrls: FakeObjectUrls;
  let images: ImagesStore;
  let settings: SettingsStore;

  beforeEach(() => {
    assets = new InMemoryAssetStore();
    preferences = new InMemoryPreferencesStore();
    objectUrls = new FakeObjectUrls();
    TestBed.configureTestingModule({
      providers: [
        { provide: ASSET_STORE, useValue: assets },
        { provide: PREFERENCES_STORE, useValue: preferences },
        { provide: ObjectUrls, useValue: objectUrls },
      ],
    });
    images = TestBed.inject(ImagesStore);
    settings = TestBed.inject(SettingsStore);
  });

  it('shows no image until one is set', () => {
    expect(images.urls()).toEqual({ logo: null, transfermovilQr: null, enzonaQr: null });
  });

  it('stores the chosen image, shows it and points the profile at it', async () => {
    await images.set('logo', png);
    TestBed.tick();

    const id = settings.profile().logoAssetId;
    expect(id).toEqual(expect.any(String));
    await expect(assets.get(id!)).resolves.toBe(png);
    expect(images.urls().logo).toBe('blob:fake/1');
    await expect(preferences.loadProfile()).resolves.toMatchObject({ logoAssetId: id });
  });
});

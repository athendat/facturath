import { TestBed } from '@angular/core/testing';
import { createEmptyProfile } from '../domain/seller-profile';
import { ImagesStore } from './images-store';
import { ObjectUrls } from './object-urls';
import { SettingsStore } from './settings-store';
import { InMemoryAssetStore } from './storage/in-memory-asset-store';
import { InMemoryPreferencesStore } from './storage/in-memory-preferences-store';
import { ASSET_STORE, PREFERENCES_STORE } from './storage/ports';
import { StorageStatus } from './storage/storage-status';
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

  it('removes an image: deletes the asset, clears the id and revokes the URL', async () => {
    await images.set('enzonaQr', png);
    const id = settings.profile().enzonaQrAssetId!;

    await images.remove('enzonaQr');
    TestBed.tick();

    await expect(assets.get(id)).resolves.toBeNull();
    expect(settings.profile().enzonaQrAssetId).toBeNull();
    expect(images.urls().enzonaQr).toBeNull();
    expect(objectUrls.revoked).toEqual(['blob:fake/1']);
    await expect(preferences.loadProfile()).resolves.toMatchObject({ enzonaQrAssetId: null });
  });

  it('replaces an image: deletes the previous asset and revokes its URL', async () => {
    const jpeg = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    await images.set('logo', png);
    const previousId = settings.profile().logoAssetId!;

    await images.set('logo', jpeg);
    TestBed.tick();

    const id = settings.profile().logoAssetId!;
    expect(id).not.toBe(previousId);
    await expect(assets.get(previousId)).resolves.toBeNull();
    await expect(assets.get(id)).resolves.toBe(jpeg);
    expect(images.urls().logo).toBe('blob:fake/2');
    expect(objectUrls.revoked).toEqual(['blob:fake/1']);
  });

  describe('on a new invoice, after reload', () => {
    const qr = new Blob(['qr-bytes'], { type: 'image/png' });

    beforeEach(async () => {
      // What a previous session left behind: the blobs and a profile pointing at them.
      await assets.put('logo-1', png);
      await assets.put('qr-1', qr);
      await preferences.saveProfile({
        ...createEmptyProfile(),
        logoAssetId: 'logo-1',
        transfermovilQrAssetId: 'qr-1',
      });
    });

    it('shows the remembered images without a new upload', async () => {
      await settings.load();

      await images.load();

      expect(images.urls()).toEqual({
        logo: 'blob:fake/1',
        transfermovilQr: 'blob:fake/2',
        enzonaQr: null,
      });
      expect(objectUrls.revoked).toEqual([]);
    });

    it('fetches the blobs only once', async () => {
      await settings.load();
      const get = vi.spyOn(assets, 'get');

      await Promise.all([images.load(), images.load()]);
      await images.load();

      expect(get).toHaveBeenCalledTimes(2);
    });

    it('keeps an image chosen while the remembered ones are still loading', async () => {
      await settings.load();

      const loading = images.load();
      await images.set('logo', png);
      await loading;

      expect(images.urls().logo).toBe('blob:fake/1');
      expect(objectUrls.revoked).toEqual([]);
      expect(images.urls().transfermovilQr).toBe('blob:fake/2');
    });

    it('leaves the placeholder when the profile points at a missing asset', async () => {
      await assets.delete('qr-1');
      await settings.load();

      await images.load();

      expect(images.urls().transfermovilQr).toBeNull();
      expect(images.urls().logo).toBe('blob:fake/1');
    });
  });

  describe('when the browser blocks storage', () => {
    it('keeps showing the image for the session and reports that saving is disabled', async () => {
      vi.spyOn(assets, 'put').mockRejectedValue(new Error('blocked'));

      await expect(images.set('logo', png)).resolves.toBeUndefined();

      expect(images.urls().logo).toBe('blob:fake/1');
      expect(TestBed.inject(StorageStatus).savingDisabled()).toBe(true);
    });

    it('still removes the image from the document when the delete fails', async () => {
      await images.set('logo', png);
      vi.spyOn(assets, 'delete').mockRejectedValue(new Error('blocked'));

      await expect(images.remove('logo')).resolves.toBeUndefined();

      expect(images.urls().logo).toBeNull();
      expect(settings.profile().logoAssetId).toBeNull();
    });
  });

  it('revokes every URL still displayed when destroyed', async () => {
    await images.set('logo', png);
    await images.set('enzonaQr', png);

    TestBed.resetTestingModule();

    expect(objectUrls.revoked).toEqual(['blob:fake/1', 'blob:fake/2']);
  });
});

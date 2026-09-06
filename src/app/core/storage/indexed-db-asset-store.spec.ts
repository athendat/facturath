import { TestBed } from '@angular/core/testing';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbAssetStore } from './indexed-db-asset-store';
import { INDEXED_DB_FACTORY } from './indexed-db-connection';
import { InMemoryAssetStore } from './in-memory-asset-store';
import type { AssetStore } from './ports';
import { StorageStatus } from './storage-status';

const PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function bytesOf(blob: Blob | null): Promise<number[]> {
  return blob ? Array.from(new Uint8Array(await blob.arrayBuffer())) : [];
}

/** The same expectations run against the IndexedDB adapter and its in-memory twin. */
function describeAssetStoreContract(name: string, create: () => AssetStore): void {
  describe(name, () => {
    let assets: AssetStore;

    beforeEach(() => {
      assets = create();
    });

    it('has no asset until one is put', async () => {
      await expect(assets.get('logo-1')).resolves.toBeNull();
    });

    it('returns the blob that was put, with its bytes and type', async () => {
      await assets.put('logo-1', new Blob([PNG_HEADER], { type: 'image/png' }));

      const found = await assets.get('logo-1');

      expect(found?.type).toBe('image/png');
      expect(found?.size).toBe(8);
      await expect(bytesOf(found)).resolves.toEqual(Array.from(PNG_HEADER));
    });

    it('replaces the blob under the same id', async () => {
      await assets.put('logo-1', new Blob([PNG_HEADER], { type: 'image/png' }));

      await assets.put('logo-1', new Blob(['<svg/>'], { type: 'image/svg+xml' }));

      const found = await assets.get('logo-1');
      expect(found?.type).toBe('image/svg+xml');
      await expect(found?.text()).resolves.toBe('<svg/>');
    });

    it('deletes by id and tolerates unknown ids', async () => {
      await assets.put('qr-1', new Blob([PNG_HEADER], { type: 'image/png' }));

      await assets.delete('qr-1');
      await assets.delete('qr-1');

      await expect(assets.get('qr-1')).resolves.toBeNull();
    });
  });
}

describe('asset stores', () => {
  describeAssetStoreContract('IndexedDbAssetStore', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: INDEXED_DB_FACTORY, useValue: () => new IDBFactory() }],
    });
    return TestBed.inject(IndexedDbAssetStore);
  });

  describeAssetStoreContract('InMemoryAssetStore', () => new InMemoryAssetStore());

  it('works in memory and reports that saving is disabled when indexedDB is missing', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: INDEXED_DB_FACTORY, useValue: () => undefined }],
    });
    const assets = TestBed.inject(IndexedDbAssetStore);

    await assets.put('logo-1', new Blob([PNG_HEADER], { type: 'image/png' }));

    expect(TestBed.inject(StorageStatus).savingDisabled()).toBe(true);
    await expect(assets.get('logo-1')).resolves.toMatchObject({ type: 'image/png', size: 8 });
  });
});
